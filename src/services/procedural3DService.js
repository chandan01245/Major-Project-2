import * as turf from '@turf/turf';

class Procedural3DService {
  /**
   * Generates random building footprints within a parcel.
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
      
      // Calculate how many buildings can fit based on coverage
      const targetCoverage = parcelArea * groundCoverage;
      const avgBuildingFootprint = targetCoverage / count;
      
      // Adjust building size based on parcel size and coverage
      const baseSizeDegrees = Math.min(0.00005, Math.sqrt(avgBuildingFootprint) / 111000); // Convert m to degrees
      
      console.log(`🏗️ Generating buildings with max height: ${maxHeight}m, coverage: ${(groundCoverage * 100).toFixed(0)}%`);
      
      // Try to place buildings with better spacing
      for (let i = 0; i < count * 10; i++) { // Try more times for better placement
        if (buildings.length >= count) break;

        // Random point in bbox with padding
        const randomPoint = turf.randomPoint(1, { bbox: bbox }).features[0];
        
        if (turf.booleanPointInPolygon(randomPoint, parcel)) {
          // Create a random box around the point - smaller size for better fit
          const size = baseSizeDegrees * (0.4 + Math.random() * 0.4); // 40-80% of base size
          const bearing = Math.random() * 180;
          
          // Create rectangle
          const buildingFootprint = turf.bboxPolygon([
            randomPoint.geometry.coordinates[0] - size,
            randomPoint.geometry.coordinates[1] - size,
            randomPoint.geometry.coordinates[0] + size,
            randomPoint.geometry.coordinates[1] + size
          ]);
          
          const poly = turf.transformRotate(
            buildingFootprint,
            bearing,
            { pivot: randomPoint.geometry.coordinates }
          );

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
              // Generate height based on zoning max height
              const buildingHeight = minHeight + Math.random() * (maxHeight - minHeight);
              
              // Add height property
              poly.properties = {
                height: buildingHeight,
                color: buildingColor,
                maxAllowedHeight: maxHeight,
                type: 'building'
              };
              buildings.push(poly);
              
              console.log(`  📦 Building ${buildings.length} placed at height ${buildingHeight.toFixed(1)}m`);
            }
          }
        }
      }

      if (buildings.length === 0) {
        console.warn('⚠️ No buildings generated, creating fallback building at parcel center');
        // Create at least one building at the center
        const center = turf.centroid(parcel);
        const centerBuilding = turf.bboxPolygon([
          center.geometry.coordinates[0] - baseSizeDegrees,
          center.geometry.coordinates[1] - baseSizeDegrees,
          center.geometry.coordinates[0] + baseSizeDegrees,
          center.geometry.coordinates[1] + baseSizeDegrees
        ]);
        centerBuilding.properties = {
          height: (minHeight + maxHeight) / 2,
          color: buildingColor,
          maxAllowedHeight: maxHeight,
          type: 'building-fallback'
        };
        buildings.push(centerBuilding);
      } else {
        console.log(`✅ Generated ${buildings.length} buildings (avg height: ${(buildings.reduce((s, b) => s + b.properties.height, 0) / buildings.length).toFixed(1)}m)`);
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
            // Create a small circle for the tree trunk/canopy
            // 0.002km = 2 meters diameter
            const treePoly = turf.circle(randomPoint, 0.002, { steps: 6, units: 'kilometers' });
            
            // Verify tree is inside parcel
            const treeCenter = turf.centroid(treePoly);
            if (turf.booleanPointInPolygon(treeCenter, parcel)) {
              treePoly.properties = {
                trunkHeight: 2,
                canopyHeight: 6 + Math.random() * 4, // Total height 8-12m
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
