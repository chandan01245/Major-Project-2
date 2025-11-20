
/**
 * Service for loading and managing 3D building models using MapTiler's 3D JS module
 */
class Building3DService {
  constructor() {
    this.models = [];
    this.loadedModels = new Map();
    this.activeLayers = [];
    this.apiUrl = 'http://localhost:5000/api';
  }

  /**
   * Load building models from backend
   */
  async loadModels() {
    if (this.models.length > 0) return this.models;
    
    try {
      const response = await fetch(`${this.apiUrl}/buildings/models`);
      const data = await response.json();
      
      if (data.success) {
        this.models = data.models.map(model => ({
          name: model.name,
          filename: model.filename,
          url: `${this.apiUrl}${model.url}`,
          footprintArea: 60, // 5m x 12m = 60 sq meters
          height: 15, // meters (increased for better visibility)
          scale: 1.0
        }));
        
        console.log(`🏢 Loaded ${this.models.length} building models from backend`);
        return this.models;
      }
    } catch (error) {
      console.error('Error loading building models:', error);
      return [];
    }
  }

  /**
   * Get a random building model
   */
  getRandomBuildingModel() {
    if (this.models.length === 0) return null;
    return this.models[Math.floor(Math.random() * this.models.length)];
  }

  /**
   * Calculate how many buildings can fit in the parcel based on area
   */
  calculateBuildingCount(parcelArea) {
    // Building footprint: 5m x 12m = 60 sq meters
    const buildingFootprint = 60;
    
    // Each building needs space around it (3m on all sides)
    // Effective area per building: (5+6)m x (12+6)m = 11m x 18m = 198 sq meters
    const effectiveAreaPerBuilding = 198;
    
    // Calculate how many buildings can fit
    const maxBuildings = Math.floor(parcelArea / effectiveAreaPerBuilding);
    
    // Minimum 1, maximum 8 for performance
    const count = Math.max(1, Math.min(maxBuildings, 8));
    
    console.log(`📊 Parcel: ${parcelArea.toFixed(0)}m² → ${count} building(s)`);
    return count;
  }

  /**
   * Generate placement positions with intelligent spacing
   */
  generateBuildingPositions(parcelCoords, count) {
    const lngs = parcelCoords.map(c => c[0]);
    const lats = parcelCoords.map(c => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    
    const positions = [];
    
    // If only one building, place at center
    if (count === 1) {
      const centroid = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
      console.log(`📍 Placing 1 building at center`);
      return [centroid];
    }
    
    // For multiple buildings, use smart placement
    const minSpacing = 3 / 111000; // 3m minimum spacing in degrees
    const buildingHalfWidth = (5 / 2) / 111000; // Half of 5m
    const buildingHalfLength = (12 / 2) / 111000; // Half of 12m
    const buildingRadius = Math.max(buildingHalfWidth, buildingHalfLength);
    
    // Try placing buildings with spacing
    let attempts = 0;
    const maxAttempts = count * 20; // More attempts for better placement
    
    while (positions.length < count && attempts < maxAttempts) {
      attempts++;
      
      // Random position within parcel bounds (with margin)
      const margin = buildingRadius * 2;
      const lng = minLng + margin + Math.random() * (maxLng - minLng - 2 * margin);
      const lat = minLat + margin + Math.random() * (maxLat - minLat - 2 * margin);
      
      // Check if building footprint is fully inside parcel
      const corners = [
        [lng - buildingHalfWidth, lat - buildingHalfLength],
        [lng + buildingHalfWidth, lat - buildingHalfLength],
        [lng + buildingHalfWidth, lat + buildingHalfLength],
        [lng - buildingHalfWidth, lat + buildingHalfLength]
      ];
      
      const allCornersInside = corners.every(corner => 
        this.isPointInPolygon(corner, parcelCoords)
      );
      
      if (!allCornersInside) continue;
      
      // Check spacing from existing buildings
      const hasAdequateSpacing = positions.every(pos => {
        const dx = lng - pos[0];
        const dy = lat - pos[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance >= (buildingRadius * 2 + minSpacing);
      });
      
      if (hasAdequateSpacing) {
        positions.push([lng, lat]);
      }
    }
    
    // If we couldn't place all buildings, that's okay
    // At minimum, place one at center if nothing worked
    if (positions.length === 0) {
      const centroid = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
      positions.push(centroid);
      console.log(`⚠️ Could only fit 1 building at center`);
    } else {
      console.log(`📍 Placed ${positions.length} building(s) with spacing`);
    }
    
    return positions;
  }

  /**
   * Point-in-polygon test
   */
  isPointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  /**
   * Add 3D building models to the map for a drawn parcel
   */
  async addBuildingsToParcel(map, parcelCoords, zoningType = "commercial", zoningParams = {}) {
    if (!map || !parcelCoords) return null;

    try {
      // Load models from backend if not already loaded
      await this.loadModels();
      
      if (this.models.length === 0) {
        console.error('No building models available');
        return null;
      }

      // Calculate parcel area
      const lngs = parcelCoords.map(c => c[0]);
      const lats = parcelCoords.map(c => c[1]);
      const width = (Math.max(...lngs) - Math.min(...lngs)) * 111000;
      const height = (Math.max(...lats) - Math.min(...lats)) * 111000;
      const parcelArea = width * height;

      console.log(`🏗️ Placing buildings in ${parcelArea.toFixed(0)}m² parcel`);
      
      // Calculate how many buildings to place
      const buildingCount = this.calculateBuildingCount(parcelArea);
      
      // Generate positions with spacing
      const positions = this.generateBuildingPositions(parcelCoords, buildingCount);

      // Create a custom layer for 3D models
      const layerId = `buildings-3d-${Date.now()}`;
      
      // Add models at each position
      const modelPromises = positions.map((position, index) => {
        const randomModel = this.getRandomBuildingModel();
        return this.addSingleModel(map, layerId, randomModel, position, index);
      });

      await Promise.all(modelPromises);
      
      this.activeLayers.push(layerId);
      
      console.log(`✅ Rendered ${positions.length} building(s) on map`);
      
      return {
        layerId,
        buildingCount: positions.length,
      };
      
    } catch (error) {
      console.error("Error adding 3D buildings:", error);
      return null;
    }
  }

  /**
   * Add a single 3D model to the map
   */
  async addSingleModel(map, layerId, buildingModel, position, index) {
    // Note: MapTiler SDK 3D module may need to be imported separately
    // For now, we'll use a custom layer approach with fill-extrusion as fallback
    
    // Since MapTiler 3D JS module requires additional setup,
    // we'll create a marker-based approach or use fill-extrusion layers
    // The actual glTF loading would require importing @maptiler/sdk/3d
    
    const sourceId = `${layerId}-source-${index}`;
    const buildingLayerId = `${layerId}-layer-${index}`;
    
    // Create building footprint: 5m x 12m
    const width = (5 / 2) / 111000; // 2.5m in degrees (half width)
    const length = (12 / 2) / 111000; // 6m in degrees (half length)
    const [lng, lat] = position;
    
    const buildingPolygon = [
      [lng - width, lat - length],
      [lng + width, lat - length],
      [lng + width, lat + length],
      [lng - width, lat + length],
      [lng - width, lat - length],
    ];
    
    if (map.getSource(sourceId)) {
      map.removeLayer(buildingLayerId);
      map.removeSource(sourceId);
    }
    
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [buildingPolygon],
        },
        properties: {
          height: buildingModel.height,
          modelType: buildingModel.name,
        },
      },
    });
    
    map.addLayer({
      id: buildingLayerId,
      type: "fill-extrusion",
      source: sourceId,
      paint: {
        "fill-extrusion-color": [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          0, '#e2e8f0',    // Light blue-gray for short buildings
          10, '#94a3b8',   // Medium blue-gray
          20, '#64748b'    // Darker blue-gray for tall buildings
        ],
        "fill-extrusion-height": buildingModel.height,
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.95,
      },
    });
  }

  /**
   * Remove all 3D building models from the map
   */
  removeAllBuildings(map) {
    if (!map) return;

    this.activeLayers.forEach(layerId => {
      // Remove all layers and sources associated with this layer ID
      const style = map.getStyle();
      if (!style) return;

      style.layers?.forEach(layer => {
        if (layer.id.startsWith(layerId)) {
          try {
            map.removeLayer(layer.id);
          } catch (e) {
            // Layer might not exist
          }
        }
      });

      Object.keys(style.sources || {}).forEach(sourceId => {
        if (sourceId.startsWith(layerId)) {
          try {
            map.removeSource(sourceId);
          } catch (e) {
            // Source might not exist
          }
        }
      });
    });

    this.activeLayers = [];
  }
}

export default new Building3DService();
