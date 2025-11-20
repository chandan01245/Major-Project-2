
/**
 * Service for loading and managing 3D building models using MapTiler's 3D JS module
 */
class Building3DService {
  constructor() {
    this.models = {
      skyscraper: {
        name: "Singapore Office Skyscraper",
        path: "/backend/data/singapore_office_skyscraper_free.glb",
        type: "commercial",
        footprintArea: 400, // sq meters
        height: 150, // meters
        scale: 1.0,
      },
      residential: {
        name: "Residential Family House",
        path: "/backend/data/residential_family_house.glb",
        type: "residential",
        footprintArea: 150, // sq meters
        height: 12, // meters
        scale: 1.0,
      },
      lowrise: {
        name: "Low Rise Office Building",
        path: "/backend/data/low_rise_wall_to_wall_office_building.glb",
        type: "commercial",
        footprintArea: 250, // sq meters
        height: 25, // meters
        scale: 1.0,
      },
    };

    this.loadedModels = new Map();
    this.activeLayers = [];
  }

  /**
   * Select appropriate building model based on parcel area and zoning type
   */
  selectBuildingModel(parcelArea, zoningType = "commercial") {
    // Parcel area is in square meters
    const type = zoningType.toLowerCase();

    // For residential zones, prefer residential model
    if (type.includes("residential")) {
      return this.models.residential;
    }

    // For commercial/mixed zones, choose based on size
    if (parcelArea > 5000) {
      return this.models.skyscraper; // Large parcels get skyscrapers
    } else if (parcelArea > 1000) {
      return this.models.lowrise; // Medium parcels get low-rise
    } else {
      return this.models.residential; // Small parcels get houses
    }
  }

  /**
   * Calculate how many buildings can fit in the parcel
   */
  calculateBuildingCount(parcelArea, buildingModel) {
    const footprintWithSpacing = buildingModel.footprintArea * 2; // Include spacing
    const maxBuildings = Math.floor(parcelArea / footprintWithSpacing);
    
    // Cap at reasonable number for performance
    return Math.min(maxBuildings, 10);
  }

  /**
   * Generate placement positions for multiple buildings within a parcel
   * Returns array of [lng, lat] coordinates
   */
  generateBuildingPositions(parcelCoords, count) {
    if (count <= 0) return [];
    
    // Calculate parcel bounds
    const lngs = parcelCoords.map(c => c[0]);
    const lats = parcelCoords.map(c => c[1]);
    
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    
    const positions = [];
    
    if (count === 1) {
      // Single building at centroid
      const centroid = [
        (minLng + maxLng) / 2,
        (minLat + maxLat) / 2
      ];
      positions.push(centroid);
    } else {
      // Grid layout for multiple buildings
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      
      const lngStep = (maxLng - minLng) / (cols + 1);
      const latStep = (maxLat - minLat) / (rows + 1);
      
      for (let row = 1; row <= rows && positions.length < count; row++) {
        for (let col = 1; col <= cols && positions.length < count; col++) {
          const lng = minLng + col * lngStep;
          const lat = minLat + row * latStep;
          
          // Check if position is inside parcel
          if (this.isPointInPolygon([lng, lat], parcelCoords)) {
            positions.push([lng, lat]);
          }
        }
      }
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
      // Calculate parcel area (approximate using bounding box)
      const lngs = parcelCoords.map(c => c[0]);
      const lats = parcelCoords.map(c => c[1]);
      const width = (Math.max(...lngs) - Math.min(...lngs)) * 111000; // degrees to meters
      const height = (Math.max(...lats) - Math.min(...lats)) * 111000;
      const parcelArea = width * height;

      // Select building model
      const buildingModel = this.selectBuildingModel(parcelArea, zoningType);
      
      // Calculate how many buildings to place
      const buildingCount = this.calculateBuildingCount(parcelArea, buildingModel);
      
      // Generate positions
      const positions = this.generateBuildingPositions(parcelCoords, buildingCount);

      // Create a custom layer for 3D models
      const layerId = `buildings-3d-${Date.now()}`;
      
      // Load and add models at each position
      const modelPromises = positions.map((position, index) => {
        return this.addSingleModel(map, layerId, buildingModel, position, index);
      });

      await Promise.all(modelPromises);
      
      this.activeLayers.push(layerId);
      
      return {
        layerId,
        buildingCount: positions.length,
        modelType: buildingModel.name,
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
    
    // Create a small polygon at the position to represent the building
    const size = 0.0001; // degrees (~10 meters)
    const [lng, lat] = position;
    
    const buildingPolygon = [
      [lng - size, lat - size],
      [lng + size, lat - size],
      [lng + size, lat + size],
      [lng - size, lat + size],
      [lng - size, lat - size],
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
        "fill-extrusion-color": buildingModel.type === "residential" ? "#4CAF50" : "#2196F3",
        "fill-extrusion-height": buildingModel.height,
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.85,
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
