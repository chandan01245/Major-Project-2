
class TrafficService {
  /**
   * Calculate estimated daily trip generation based on ITE rates.
   * @param {number} areaSqM - Total floor area in square meters
   * @param {string} type - Zoning type (residential, commercial, industrial, mixed)
   * @returns {object} - { dailyTrips, peakHourTrips }
   */
  calculateTripGeneration(areaSqM, type) {
    let rate = 0; // Daily trips per unit/area
    let peakRate = 0; // Peak hour trips

    // ITE Trip Generation Rates (Approximate)
    switch (type.toLowerCase()) {
      case 'residential':
        // ~6-10 trips per dwelling unit. 
        // Assume avg unit size = 100 sqm
        const units = Math.ceil(areaSqM / 100);
        rate = 8; // trips per unit
        peakRate = 0.8; // trips per unit
        return {
          dailyTrips: Math.round(units * rate),
          peakHourTrips: Math.round(units * peakRate),
          unitType: 'Dwelling Units',
          unitCount: units
        };

      case 'commercial':
        // ~40 trips per 1000 sqft GLA -> ~430 trips per 1000 sqm
        // Let's use a more conservative modern retail rate: ~10-15 trips per 100 sqm
        rate = 12; // trips per 100 sqm
        peakRate = 1.2;
        break;

      case 'industrial':
        // ~4 trips per 100 sqm
        rate = 4;
        peakRate = 0.5;
        break;

      case 'mixed':
        // Blended rate
        rate = 10;
        peakRate = 1.0;
        break;

      default:
        rate = 5;
        peakRate = 0.5;
    }

    return {
      dailyTrips: Math.round((areaSqM / 100) * rate),
      peakHourTrips: Math.round((areaSqM / 100) * peakRate),
      unitType: '100 sqm GFA',
      unitCount: Math.round(areaSqM / 100)
    };
  }

  /**
   * Estimate congestion impact based on generated trips.
   * @param {number} peakHourTrips 
   * @returns {object} - { level, color, description }
   */
  estimateCongestionImpact(peakHourTrips) {
    if (peakHourTrips < 50) {
      return {
        level: 'Low',
        color: '#4CAF50', // Green
        description: 'Minimal impact on local traffic flow.'
      };
    } else if (peakHourTrips < 200) {
      return {
        level: 'Moderate',
        color: '#FF9800', // Orange
        description: 'Noticeable increase in traffic. Mitigation may be required.'
      };
    } else {
      return {
        level: 'High',
        color: '#F44336', // Red
        description: 'Significant impact. Traffic Impact Assessment (TIA) strongly recommended.'
      };
    }
  }
}

export default new TrafficService();
