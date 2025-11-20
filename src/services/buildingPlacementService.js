import * as turf from '@turf/turf';

class BuildingPlacementService {
  /**
   * Place pre-made 3D building models within a parcel
   * @param {Array} polygonCoords - Coordinates of the parcel polygon
   * @param {Object} buildingModels - Available building models from backend
   * @returns {Array} Array of building placements with positions and model references
   */
  placeBuildingsInParcel(polygonCoords, buildingModels = []) {
    if (!buildingModels.length) {
      console.warn('No building models available');
      return [];
    }

    const parcel = turf.polygon([polygonCoords]);
    const bbox = turf.bbox(parcel);
    const parcelArea = turf.area(parcel);
    const placements = [];
    
    // Building dimensions: 5m x 12m footprint
    const buildingWidth = 5 / 111000; // Convert meters to degrees
    const buildingLength = 12 / 111000;
    const minSpacing = 3 / 111000; // 3m minimum spacing between buildings
    
    console.log(`📦 Placing buildings in ${parcelArea.toFixed(0)}m² parcel`);
    console.log(`🏢 Available models: ${buildingModels.length}`);
    
    // Try to place up to 10 buildings
    for (let attempt = 0; attempt < 100; attempt++) {
      if (placements.length >= 10) break;
      
      // Random position within bbox
      const randomLng = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
      const randomLat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
      const randomPoint = turf.point([randomLng, randomLat]);
      
      // Check if point is inside parcel
      if (!turf.booleanPointInPolygon(randomPoint, parcel)) continue;
      
      // Create building footprint to test
      const buildingFootprint = turf.bboxPolygon([
        randomLng - buildingWidth,
        randomLat - buildingLength,
        randomLng + buildingWidth,
        randomLat + buildingLength
      ]);
      
      // Verify ALL corners are inside parcel
      const corners = buildingFootprint.geometry.coordinates[0];
      const allCornersInside = corners.every(corner => 
        turf.booleanPointInPolygon(turf.point(corner), parcel)
      );
      
      if (!allCornersInside) continue;
      
      // Check spacing from existing buildings
      let hasAdequateSpacing = true;
      for (const existing of placements) {
        const distance = turf.distance(
          turf.point([randomLng, randomLat]),
          turf.point(existing.position),
          { units: 'degrees' }
        );
        
        if (distance < minSpacing) {
          hasAdequateSpacing = false;
          break;
        }
      }
      
      if (!hasAdequateSpacing) continue;
      
      // Select a random building model
      const selectedModel = buildingModels[Math.floor(Math.random() * buildingModels.length)];
      
      // Create placement
      const placement = {
        id: `building-${placements.length + 1}`,
        position: [randomLng, randomLat],
        rotation: Math.random() * 360, // Random rotation
        model: selectedModel,
        footprint: buildingFootprint
      };
      
      placements.push(placement);
      console.log(`  ✅ Building ${placements.length} placed at [${randomLng.toFixed(6)}, ${randomLat.toFixed(6)}]`);
    }
    
    console.log(`🏗️ Successfully placed ${placements.length} building(s)`);
    
    // If no buildings fit, place at least one in the center
    if (placements.length === 0) {
      console.log('⚠️ No buildings fit with spacing, placing one at center');
      const center = turf.centroid(parcel);
      const selectedModel = buildingModels[0];
      
      placements.push({
        id: 'building-center',
        position: center.geometry.coordinates,
        rotation: 0,
        model: selectedModel,
        footprint: null
      });
    }
    
    return placements;
  }
  
  /**
   * Convert building placements to GeoJSON for MapTiler rendering
   * @param {Array} placements - Building placements from placeBuildingsInParcel
   * @returns {Object} GeoJSON FeatureCollection
   */
  toGeoJSON(placements) {
    const features = placements.map(placement => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: placement.position
        },
        properties: {
          id: placement.id,
          modelUrl: placement.model.url,
          modelName: placement.model.name,
          rotation: placement.rotation,
          height: 8 // 8 meters height for visualization
        }
      };
    });
    
    return {
      type: 'FeatureCollection',
      features: features
    };
  }
}

export default new BuildingPlacementService();
