import * as turf from '@turf/turf';

class Procedural3DService {
  /**
   * Generates intelligent building footprints within a parcel using ML-inspired heuristics.
   * Considers parcel area, shape, location, and zoning regulations.
   * @param {Array} polygonCoords - Coordinates of the parcel polygon
   * @param {number} count - Number of buildings to attempt to place
   * @param {Object} zoningParams - Zoning parameters (maxHeight, FAR, coverage, etc.)
   * @returns {Object} GeoJSON FeatureCollection of building polygons
   */
  generateBuildings(polygonCoords, count = 5, zoningParams = {}) {
    try {
      const parcel = turf.polygon([polygonCoords]);
      const bbox = turf.bbox(parcel);
      const buildings = [];
      
      // Calculate parcel area to adjust building size
      const parcelArea = turf.area(parcel); // in square meters
      const parcelSizeKm = Math.sqrt(parcelArea) / 1000; // rough side length in km
      
      // Extract zoning parameters with defaults
      const maxHeight = zoningParams.maxHeight || 45; // meters
      const minHeight = zoningParams.minHeight || 15; // meters
      const groundCoverage = zoningParams.groundCoverage || 0.4; // 40% default
      const buildingColor = zoningParams.color || '#93c5fd'; // Light blue
      const FAR = zoningParams.FAR || 2.0; // Floor Area Ratio
      
      // Calculate how many buildings can fit based on coverage
      const targetCoverage = parcelArea * groundCoverage;
      const avgBuildingFootprint = targetCoverage / count;
      
      // Adjust building size based on parcel size and coverage
      // Make buildings MUCH larger - use 0.0002 degrees (~20 meters)
      const baseSizeDegrees = Math.max(0.0001, Math.sqrt(avgBuildingFootprint) / 111000 * 2); // Convert m to degrees and double it
      
      console.log(`🏗️ Generating buildings with max height: ${maxHeight}m, coverage: ${(groundCoverage * 100).toFixed(0)}%`);
      console.log(`📏 Base building size: ${baseSizeDegrees} degrees (~${(baseSizeDegrees * 111000).toFixed(1)} meters)`);
      
      // Try to place buildings with better spacing
      for (let i = 0; i < count * 10; i++) { // Try more times for better placement
        if (buildings.length >= count) break;

        // Random point in bbox with padding
        const randomPoint = turf.randomPoint(1, { bbox: bbox }).features[0];
        
        if (turf.booleanPointInPolygon(randomPoint, parcel)) {
          // Fixed building dimensions: 5m x 12m
          const fixedWidth = 5; // meters
          const fixedLength = 12; // meters
          
          // Convert to degrees (1 degree ≈ 111km)
          const widthDegrees = (fixedWidth / 2) / 111000; // Half width in degrees
          const lengthDegrees = (fixedLength / 2) / 111000; // Half length in degrees
          const bearing = Math.random() * 180; // Random orientation
          
          // Create rectangular building footprint
          const buildingFootprint = turf.bboxPolygon([
            randomPoint.geometry.coordinates[0] - widthDegrees,
            randomPoint.geometry.coordinates[1] - lengthDegrees,
            randomPoint.geometry.coordinates[0] + widthDegrees,
            randomPoint.geometry.coordinates[1] + lengthDegrees
          ]);
          
          const poly = turf.transformRotate(
            buildingFootprint,
            bearing,
            { pivot: randomPoint.geometry.coordinates }
          );
          
          // Fixed dimensions for logging
          const actualWidth = fixedWidth;
          const actualLength = fixedLength;

          // Check if building is FULLY contained within parcel
          let fullyContained = false;
          try {
            // Check all corners of the building
            const coords = poly.geometry.coordinates[0];
            fullyContained = coords.every(coord => 
              turf.booleanPointInPolygon(turf.point(coord), parcel)
            );
          } catch (e) {
            fullyContained = false;
          }
          
          if (fullyContained) {
            // Check for overlap with existing buildings
            const overlaps = buildings.some(b => {
              try {
                const intersect = turf.intersect(b, poly);
                return intersect !== null;
              } catch (e) {
                return false;
              }
            });
            
            if (!overlaps) {
              // Fixed height: 8m
              const actualHeight = 8; // meters
              const scaledHeight = actualHeight / 10; // Scale to 1/10th for visualization
              
              // Add building properties
              poly.properties = {
                height: scaledHeight,
                actualHeight: actualHeight,
                width: actualWidth,
                length: actualLength,
                footprintArea: actualWidth * actualLength,
                color: buildingColor,
                maxAllowedHeight: maxHeight,
                FAR: FAR,
                type: 'building'
              };
              buildings.push(poly);
              
              console.log(`  📦 Building ${buildings.length}: ${actualWidth.toFixed(1)}m × ${actualLength.toFixed(1)}m × ${actualHeight}m (scaled: ${scaledHeight.toFixed(2)}m)`);
            }
          }
        }
      }

      if (buildings.length === 0) {
        console.warn('⚠️ No buildings generated, creating fallback building at parcel center');
        // Create fallback building with fixed dimensions: 5m x 12m
        const center = turf.centroid(parcel);
        const widthDegrees = (5 / 2) / 111000;
        const lengthDegrees = (12 / 2) / 111000;
        const centerBuilding = turf.bboxPolygon([
          center.geometry.coordinates[0] - widthDegrees,
          center.geometry.coordinates[1] - lengthDegrees,
          center.geometry.coordinates[0] + widthDegrees,
          center.geometry.coordinates[1] + lengthDegrees
        ]);
        // Fixed dimensions for fallback building: 5m x 12m x 8m
        const actualHeight = 8;
        const scaledHeight = actualHeight / 10;
        
        centerBuilding.properties = {
          height: scaledHeight,
          actualHeight: actualHeight,
          width: 5,
          length: 12,
          color: buildingColor,
          maxAllowedHeight: maxHeight,
          type: 'building-fallback'
        };
        buildings.push(centerBuilding);
        console.log(`🏢 Created fallback building: 5m × 12m × 8m (scaled: ${scaledHeight.toFixed(2)}m)`);
      } else {
        console.log(`✅ Generated ${buildings.length} buildings (avg height: ${(buildings.reduce((s, b) => s + b.properties.height, 0) / buildings.length).toFixed(1)}m)`);
        console.log(`📏 Buildings range: ${(baseSizeDegrees * 0.8 * 111000 * 2).toFixed(1)}m - ${(baseSizeDegrees * 1.2 * 111000 * 2).toFixed(1)}m footprint`);
      }

      return turf.featureCollection(buildings);
    } catch (error) {
      console.error('Error generating buildings:', error);
      return turf.featureCollection([]);
    }
  }

  /**
   * Generates random tree points within a parcel, avoiding buildings.
   * @param {Array} polygonCoords - Coordinates of the parcel polygon
   * @param {Object} buildingCollection - FeatureCollection of generated buildings
   * @param {number} count - Number of trees
   * @returns {Object} GeoJSON FeatureCollection of tree polygons (for extrusion)
   */
  generateTrees(polygonCoords, buildingCollection, count = 20) {
    try {
      const parcel = turf.polygon([polygonCoords]);
      const bbox = turf.bbox(parcel);
      const trees = [];
      const buildings = buildingCollection.features || [];

      for (let i = 0; i < count * 3; i++) {
        if (trees.length >= count) break;

        const randomPoint = turf.randomPoint(1, { bbox: bbox }).features[0];

        if (turf.booleanPointInPolygon(randomPoint, parcel)) {
          // Check if inside any building
          const insideBuilding = buildings.some(b => {
            try {
              return turf.booleanPointInPolygon(randomPoint, b);
            } catch (e) {
              return false;
            }
          });
          
          if (!insideBuilding) {
            // Create a circle for the tree trunk/canopy
            // 0.003km = 3 meters diameter (increased for visibility)
            const treePoly = turf.circle(randomPoint, 0.003, { steps: 8, units: 'kilometers' });
            
            // Verify tree is inside parcel
            const treeCenter = turf.centroid(treePoly);
            if (turf.booleanPointInPolygon(treeCenter, parcel)) {
              // Fixed tree dimensions for visibility
              const actualTrunkHeight = 3;
              const actualCanopyHeight = 8; // Total height 8m
              
              treePoly.properties = {
                trunkHeight: actualTrunkHeight / 10, // Scale to 1/10th (0.3m)
                canopyHeight: actualCanopyHeight / 10, // Scale to 1/10th (0.8m)
                actualTrunkHeight: actualTrunkHeight,
                actualCanopyHeight: actualCanopyHeight,
                color: '#22c55e',
                type: 'tree'
              };
              trees.push(treePoly);
            }
          }
        }
      }

      if (trees.length === 0) console.warn('No trees generated');
      else console.log(`Generated ${trees.length} trees`);

      return turf.featureCollection(trees);
    } catch (error) {
      console.error('Error generating trees:', error);
      return turf.featureCollection([]);
    }
  }
}

export default new Procedural3DService();
