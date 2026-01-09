import * as maptilersdk from '@maptiler/sdk';
import geoapifyService from './geoapifyService';

const API_KEY = process.env.REACT_APP_MAPTILER_KEY;
const CACHE_KEY_PREFIX = 'urban_form_zones_v12_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class MapService {
  constructor() {
    maptilersdk.config.apiKey = API_KEY;
  }

  /**
   * Fetch zones (neighborhoods) for a given city.
   * Checks localStorage cache first.
   * @param {string} cityId - The city ID (e.g., 'bangalore')
   * @param {string} cityName - The city name (e.g., 'Bangalore')
   * @param {object} cityCoordinates - { lat, lng }
   * @returns {Promise<Array>} - List of zones with polygons
   */
  async fetchCityZones(cityId, cityName, cityCoordinates) {
    const cacheKey = `${CACHE_KEY_PREFIX}${cityId}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const { timestamp, zones } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
          console.log(`📦 Using cached zones for ${cityName}`);
          return zones;
        }
      } catch (e) {
        console.warn('Error parsing cached zones:', e);
        localStorage.removeItem(cacheKey);
      }
    }

    // Check in-memory cache after localStorage (if localStorage was invalid/expired)
    if (this.zoneCache && this.zoneCache.has(cityId)) {
      console.log(`📦 Using in-memory cached zones for ${cityName}`);
      return this.zoneCache.get(cityId);
    }

    console.log(`🌍 Fetching fresh zones for ${cityName} using Geoapify...`);

    try {
      // Use Geoapify Service
      const zones = await geoapifyService.getCityDistricts(cityId, cityName);

      // Cache the result if we got something
      if (zones.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          zones
        }));
      } else {
        console.warn(`No districts found for ${cityName} via Geoapify.`);
      }

      return zones;

    } catch (error) {
      console.error('Error fetching city zones:', error);
      return [];
    }
  }

  async searchLocation(query, cityCoordinates) {
    if (!query || query.length < 3) return [];
    
    try {
      // Bias results towards the city
      const proximity = cityCoordinates ? `&proximity=${cityCoordinates.lng},${cityCoordinates.lat}` : '';
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${API_KEY}${proximity}&limit=5`
      );
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.features.map(f => ({
        name: f.place_name,
        lat: f.center[1],
        lng: f.center[0],
        bbox: f.bbox
      }));
    } catch (error) {
      console.error('Error searching location:', error);
      return [];
    }
  }
  
  async checkIfPark(polygon) {
    try {
      // Calculate centroid
      const centroid = polygon.reduce((acc, coord) => {
        acc[0] += coord[0];
        acc[1] += coord[1];
        return acc;
      }, [0, 0]).map(v => v / polygon.length);

      // Fetch nearby parks
      const amenities = await geoapifyService.getAmenities(centroid[1], centroid[0], ['leisure.park', 'leisure.garden', 'leisure.nature_reserve']);
      
      // Check if any park is close enough to be considered an overlap
      // Since we don't have the park polygon, we assume a radius around the park point
      // or check if the park point is inside our polygon (if the park is small)
      // or if our polygon is inside the park (if the park is large, but we only have a point).
      // A simple proximity check is best for now.
      
      const isOverlapping = amenities.some(park => {
        // If park is within ~100m of centroid, warn user
        // This is a heuristic since we don't have park boundaries
        return park.distance < 100; 
      });

      return isOverlapping;
      
    } catch (error) {
      console.error('Error checking park status:', error);
      return false;
    }
  }
}

export default new MapService();
