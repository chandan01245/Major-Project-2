// ML Service for zoning regulation analysis and report generation
// This simulates ML model predictions - connect to actual ML backend for production

class MLService {
  constructor() {
    this.zoningDocuments = [];
    this.modelTrained = false;
  }

  // Upload and store zoning documents
  async uploadZoningDocument(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const document = {
          id: Date.now(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date().toISOString(),
          content: e.target.result,
          processed: false
        };
        
        this.zoningDocuments.push(document);
        
        // Simulate processing delay
        setTimeout(() => {
          document.processed = true;
          resolve(document);
        }, 1000);
      };
      reader.readAsText(file);
    });
  }

  // Extract zoning attributes from documents (ML-powered)
  async extractZoningAttributes(polygon, nearbyAreas) {
    // Simulate ML processing
    await this.delay(800);

    // Determine dominant zone type from nearby areas
    const typeCounts = {};
    nearbyAreas.forEach(area => {
      typeCounts[area.type] = (typeCounts[area.type] || 0) + 1;
    });
    
    const dominantType = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] > typeCounts[b] ? a : b
    );

    return {
      zoneType: dominantType,
      far: this.getFARRange(dominantType),
      maxHeight: this.getHeightRange(dominantType),
      groundCoverage: this.getCoverageRange(dominantType),
      setback: this.getSetbackRange(dominantType),
      parking: this.getParkingRequirement(dominantType),
      landUse: this.getAllowedUses(dominantType),
      restrictions: this.getRestrictions(dominantType)
    };
  }

  // Generate comprehensive ML-powered report
  async generateReport(polygon, attributes, nearbyAreas) {
    await this.delay(1200);

    const area = this.calculatePolygonArea(polygon);
    const centroid = this.getPolygonCentroid(polygon);
    
    // Calculate price per sqft based on nearby areas
    const avgPrice = this.calculateAveragePrice(nearbyAreas);
    const priceRange = {
      min: Math.round(avgPrice * 0.85),
      max: Math.round(avgPrice * 1.15),
      average: avgPrice
    };

    // Find nearby amenities (simulated)
    const amenities = await this.findNearbyAmenities(centroid);
    
    // Calculate buildability score
    const buildability = this.calculateBuildability(attributes, area, amenities);

    // Generate development scenarios
    const scenarios = this.generateDevelopmentScenarios(area, attributes);

    return {
      generatedAt: new Date().toISOString(),
      parcelInfo: {
        area: Math.round(area),
        perimeter: Math.round(this.calculatePerimeter(polygon)),
        centroid,
        coordinates: polygon
      },
      pricing: {
        pricePerSqft: priceRange,
        estimatedValue: {
          min: Math.round(area * priceRange.min),
          max: Math.round(area * priceRange.max),
          average: Math.round(area * priceRange.average)
        },
        marketTrend: this.getMarketTrend(nearbyAreas)
      },
      zoningDetails: attributes,
      amenities,
      buildability,
      scenarios,
      mlConfidence: 0.87 + Math.random() * 0.1,
      recommendations: this.generateRecommendations(attributes, buildability, amenities)
    };
  }

  // Calculate polygon area in square meters
  calculatePolygonArea(polygon) {
    if (polygon.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const xi = polygon[i][0] * 111320; // Convert to meters
      const yi = polygon[i][1] * 110540;
      const xj = polygon[j][0] * 111320;
      const yj = polygon[j][1] * 110540;
      area += xi * yj - xj * yi;
    }
    return Math.abs(area / 2);
  }

  calculatePerimeter(polygon) {
    let perimeter = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const dx = (polygon[j][0] - polygon[i][0]) * 111320;
      const dy = (polygon[j][1] - polygon[i][1]) * 110540;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  getPolygonCentroid(polygon) {
    const x = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
    const y = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
    return [x, y];
  }

  calculateAveragePrice(nearbyAreas) {
    if (nearbyAreas.length === 0) return 8500;
    return Math.round(
      nearbyAreas.reduce((sum, area) => sum + area.value, 0) / nearbyAreas.length
    );
  }

  async findNearbyAmenities(centroid) {
    await this.delay(500);
    
    // Simulate finding nearby amenities
    const schools = [
      { name: 'Delhi Public School', distance: 1.2, rating: 4.5 },
      { name: 'Manipal International School', distance: 2.3, rating: 4.3 },
      { name: 'National Public School', distance: 3.1, rating: 4.6 }
    ];

    const metro = [
      { name: 'Indiranagar Metro Station', distance: 1.5, line: 'Purple Line' },
      { name: 'Trinity Metro Station', distance: 2.8, line: 'Green Line' }
    ];

    const hospitals = [
      { name: 'Manipal Hospital', distance: 1.8, rating: 4.4 },
      { name: 'Columbia Asia Hospital', distance: 2.5, rating: 4.2 },
      { name: 'Apollo Hospital', distance: 3.2, rating: 4.7 }
    ];

    const shopping = [
      { name: 'Mantri Square Mall', distance: 1.1 },
      { name: 'Orion Mall', distance: 2.9 }
    ];

    return { schools, metro, hospitals, shopping };
  }

  calculateBuildability(attributes, area, amenities) {
    let score = 0;
    const factors = [];

    // Zoning compliance
    if (attributes.far) {
      score += 25;
      factors.push({ name: 'Zoning Compliance', score: 25, status: 'excellent' });
    }

    // Site area adequacy
    if (area > 500) {
      score += 20;
      factors.push({ name: 'Site Area', score: 20, status: 'good' });
    } else {
      score += 10;
      factors.push({ name: 'Site Area', score: 10, status: 'fair' });
    }

    // Amenity proximity
    const avgSchoolDist = amenities.schools.reduce((s, a) => s + a.distance, 0) / amenities.schools.length;
    if (avgSchoolDist < 2) {
      score += 20;
      factors.push({ name: 'School Proximity', score: 20, status: 'excellent' });
    } else {
      score += 10;
      factors.push({ name: 'School Proximity', score: 10, status: 'good' });
    }

    // Metro connectivity
    const nearestMetro = Math.min(...amenities.metro.map(m => m.distance));
    if (nearestMetro < 2) {
      score += 20;
      factors.push({ name: 'Metro Access', score: 20, status: 'excellent' });
    } else {
      score += 10;
      factors.push({ name: 'Metro Access', score: 10, status: 'good' });
    }

    // Hospital proximity
    const avgHospitalDist = amenities.hospitals.reduce((s, a) => s + a.distance, 0) / amenities.hospitals.length;
    if (avgHospitalDist < 3) {
      score += 15;
      factors.push({ name: 'Healthcare Access', score: 15, status: 'good' });
    } else {
      score += 8;
      factors.push({ name: 'Healthcare Access', score: 8, status: 'fair' });
    }

    return {
      score,
      grade: score > 85 ? 'A+' : score > 75 ? 'A' : score > 65 ? 'B+' : score > 55 ? 'B' : 'C',
      factors
    };
  }

  generateDevelopmentScenarios(area, attributes) {
    const farValue = parseFloat(attributes.far.split('-')[1] || '2.5');
    const coverage = parseFloat(attributes.groundCoverage.split('-')[1] || '60') / 100;
    
    const maxBuiltArea = area * farValue;
    const groundFloorArea = area * coverage;
    const floors = Math.floor(maxBuiltArea / groundFloorArea);

    return [
      {
        name: 'Conservative',
        description: 'Minimum FAR utilization with maximum open space',
        far: farValue * 0.6,
        floors: Math.floor(floors * 0.6),
        builtArea: Math.round(maxBuiltArea * 0.6),
        openSpace: Math.round(area * 0.5),
        estimatedCost: Math.round(maxBuiltArea * 0.6 * 35000),
        roi: '12-15%'
      },
      {
        name: 'Moderate',
        description: 'Balanced development with good open space',
        far: farValue * 0.8,
        floors: Math.floor(floors * 0.8),
        builtArea: Math.round(maxBuiltArea * 0.8),
        openSpace: Math.round(area * 0.35),
        estimatedCost: Math.round(maxBuiltArea * 0.8 * 35000),
        roi: '15-18%'
      },
      {
        name: 'Maximum',
        description: 'Full FAR utilization for maximum returns',
        far: farValue,
        floors,
        builtArea: Math.round(maxBuiltArea),
        openSpace: Math.round(area * 0.25),
        estimatedCost: Math.round(maxBuiltArea * 35000),
        roi: '18-22%'
      }
    ];
  }

  generateRecommendations(attributes, buildability, amenities) {
    const recommendations = [];

    if (buildability.score > 75) {
      recommendations.push({
        type: 'positive',
        title: 'Excellent Development Potential',
        description: 'This site shows strong indicators for development with good zoning compliance and amenity access.'
      });
    }

    if (amenities.metro[0].distance < 1) {
      recommendations.push({
        type: 'positive',
        title: 'Premium Metro Connectivity',
        description: 'Proximity to metro station significantly enhances property value and marketability.'
      });
    }

    if (attributes.zoneType === 'commercial') {
      recommendations.push({
        type: 'info',
        title: 'Commercial Zoning Advantage',
        description: 'Commercial zoning allows for higher FAR and diverse use cases, maximizing returns.'
      });
    }

    recommendations.push({
      type: 'info',
      title: 'Market Timing',
      description: 'Current market conditions favor phased development with focus on quality amenities.'
    });

    return recommendations;
  }

  getMarketTrend(nearbyAreas) {
    const avgGrowth = 8.5 + Math.random() * 3;
    return {
      trend: 'rising',
      growthRate: `${avgGrowth.toFixed(1)}%`,
      outlook: 'positive',
      period: 'year-over-year'
    };
  }

  // Helper methods for zoning attributes
  getFARRange(type) {
    const ranges = {
      residential: '1.5 - 2.5',
      commercial: '2.5 - 3.5',
      industrial: '1.5 - 2.0',
      mixed: '2.0 - 3.0'
    };
    return ranges[type] || '2.0 - 2.5';
  }

  getHeightRange(type) {
    const ranges = {
      residential: '15m - 45m',
      commercial: '45m - 60m',
      industrial: '15m - 30m',
      mixed: '30m - 50m'
    };
    return ranges[type] || '20m - 40m';
  }

  getCoverageRange(type) {
    const ranges = {
      residential: '40% - 60%',
      commercial: '50% - 70%',
      industrial: '60% - 75%',
      mixed: '50% - 65%'
    };
    return ranges[type] || '50% - 60%';
  }

  getSetbackRange(type) {
    const ranges = {
      residential: '3m - 6m',
      commercial: '6m - 9m',
      industrial: '9m - 12m',
      mixed: '4.5m - 7.5m'
    };
    return ranges[type] || '5m - 7m';
  }

  getParkingRequirement(type) {
    const requirements = {
      residential: '1 per 100 sqm',
      commercial: '1 per 50 sqm',
      industrial: '1 per 75 sqm',
      mixed: '1 per 65 sqm'
    };
    return requirements[type] || '1 per 80 sqm';
  }

  getAllowedUses(type) {
    const uses = {
      residential: ['Apartments', 'Villas', 'Townhouses', 'Gated Communities'],
      commercial: ['Offices', 'Retail', 'Shopping Malls', 'Business Parks'],
      industrial: ['Manufacturing', 'Warehouses', 'Logistics', 'R&D Centers'],
      mixed: ['Mixed-use Towers', 'Live-Work Spaces', 'Retail + Residential', 'Office + Commercial']
    };
    return uses[type] || ['General Development'];
  }

  getRestrictions(type) {
    return [
      'No hazardous materials',
      'Noise level compliance required',
      'Environmental clearance needed',
      'Fire safety compliance mandatory'
    ];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getUploadedDocuments() {
    return this.zoningDocuments;
  }

  deleteDocument(id) {
    this.zoningDocuments = this.zoningDocuments.filter(doc => doc.id !== id);
  }
}

export default new MLService();
