const API_KEY = process.env.REACT_APP_GEOAPIFY_KEY;
const MAPTILER_KEY = process.env.REACT_APP_MAPTILER_KEY;

// MapTiler Dataset URLs for district boundaries
const CITY_DATASET_URLS = {
  'new_york': `https://api.maptiler.com/data/019aa059-342d-7712-9c10-71535fc0cbc5/features.json?key=${MAPTILER_KEY}`,
  'bangalore': `https://api.maptiler.com/data/019aa070-b0b8-78d9-a86b-c740520e8340/features.json?key=${MAPTILER_KEY}`,
  'mumbai': `https://api.maptiler.com/data/019aa060-e972-79a2-a841-fc947c3cb1b5/features.json?key=${MAPTILER_KEY}`,
  'hyderabad': `https://api.maptiler.com/data/019aa06c-d6d8-7d2b-a5b7-3d5649594046/features.json?key=${MAPTILER_KEY}`,
  'delhi': `https://api.maptiler.com/data/019aa069-2cf7-7a39-9b94-4c8007355b2d/features.json?key=${MAPTILER_KEY}`, 
  'singapore': `https://api.maptiler.com/data/019aa070-188e-77be-9af4-d1577f8328ba/features.json?key=${MAPTILER_KEY}`
};

// Fallback hardcoded districts for cities without datasets
const CITY_DISTRICTS = {
  // Add other cities here if needed in future
};

class GeoapifyService {
  constructor() {
    if (!API_KEY) {
      console.warn('Geoapify API Key is missing! Please add REACT_APP_GEOAPIFY_KEY to your .env file.');
    }
  }

  getCityCurrency(cityId) {
    const map = {
      'new_york': 'USD',
      'singapore': 'SGD'
    };
    return map[cityId.toLowerCase()] || 'INR';
  }

  generateDistrictStats(name, cityId) {
    const hash = this.getHash(name);
    const currency = this.getCityCurrency(cityId);
    
    // Deterministic Population (20k - 500k)
    const population = (hash % 480000) + 20000;
    
    // Real Estate Prices based on City Tiers (2024 Data)
    let price;
    const normalizeHash = (hash % 100) / 100; // 0.0 to 1.0

    switch(cityId.toLowerCase()) {
      case 'new_york':
        // $450 - $1300 USD/sqft
        price = 450 + Math.floor(normalizeHash * (1300 - 450));
        break;
      case 'bangalore':
        // ₹11,000 - ₹12,500 /sqft
        price = 11000 + Math.floor(normalizeHash * (12500 - 11000));
        break;
      case 'mumbai':
        // ₹16,000 - ₹21,000 /sqft
        price = 16000 + Math.floor(normalizeHash * (21000 - 16000));
        break;
      case 'hyderabad':
        // ₹7,500 - ₹11,500 /sqft
        price = 7500 + Math.floor(normalizeHash * (11500 - 7500));
        break;
      case 'delhi':
        // ₹7,500 - ₹12,000 /sqft
        price = 7500 + Math.floor(normalizeHash * (12000 - 7500));
        break;
      case 'singapore':
        // $600 - $2,200 SGD/sqft
        price = 600 + Math.floor(normalizeHash * (2200 - 600));
        break;
      default:
        // Fallback (Generic Tier 2 City in India)
        price = 4000 + Math.floor(normalizeHash * 6000);
    }

    return { population, price, currency };
  }

  /**
   * Get districts/boroughs for a city using MapTiler Datasets or Hardcoded list + Geocoding
   */
  async getCityDistricts(cityId, cityName) {
    
    // Check if we have a specific dataset URL for this city
    const datasetUrl = CITY_DATASET_URLS[cityId.toLowerCase()];
    if (datasetUrl) {
      try {
        console.log(`Fetching ${cityName} districts from MapTiler Dataset...`);
        const response = await fetch(datasetUrl);
        const data = await response.json();
        
        if (data.features) {
          return data.features.map((f, index) => {
            // Try to find a name property
            const name = f.properties.name || f.properties.district || f.properties.ward || `District ${index + 1}`;
            const stats = this.generateDistrictStats(name, cityId);
            
            // Calculate centroid for polygon geometries
            let lat, lng;
            if (f.properties.lat && f.properties.lon) {
              lat = f.properties.lat;
              lng = f.properties.lon;
            } else if (f.geometry.type === 'Point') {
              lng = f.geometry.coordinates[0];
              lat = f.geometry.coordinates[1];
            } else if (f.geometry.type === 'Polygon' && f.geometry.coordinates && f.geometry.coordinates[0]) {
              // Calculate simple centroid of polygon (arithmetic mean)
              const coords = f.geometry.coordinates[0];
              lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
              lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
            } else if (f.geometry.type === 'MultiPolygon' && f.geometry.coordinates && f.geometry.coordinates[0] && f.geometry.coordinates[0][0]) {
              // Calculate simple centroid of first polygon in multipolygon
              const coords = f.geometry.coordinates[0][0];
              lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
              lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
            }
            
            // Log centroid for debugging
            if (cityId === 'mumbai' || cityId === 'new_york') {
              console.log(`📍 ${name} centroid: [${lng}, ${lat}]`);
            }
            
            return {
              id: f.id || `${cityId}_district_${index}`,
              name: name,
              type: 'district',
              geometry: f.geometry,
              color: this.getColorForIndex(index),
              value: stats.price, // Keep for backward compatibility if needed
              price: stats.price,
              population: stats.population,
              currency: stats.currency,
              isPolygon: true,
              lat: lat,
              lng: lng
            };
          });
        }
      } catch (error) {
        console.error(`Error fetching ${cityName} districts:`, error);
        // Fallback to default logic if this fails
      }
    }

    if (!API_KEY) return [];
    
    try {
      console.log(`🌍 Fetching districts for ${cityName} using Hardcoded List...`);
      
      const districtNames = CITY_DISTRICTS[cityId.toLowerCase()] || CITY_DISTRICTS[cityId];
      
      if (districtNames) {
        return await this.fetchDistrictsByNames(districtNames, cityName, cityId);
      }
      
      console.warn(`No hardcoded districts found for ${cityName}.`);
      return [];

    } catch (error) {
      console.error('Error fetching districts:', error);
      return [];
    }
  }

  async fetchDistrictsByNames(districtNames, cityName, cityId) {
    const promises = districtNames.map(async (name, index) => {
      try {
        // Ensure we query specifically for the city to avoid ambiguity
        const query = name.toLowerCase().includes(cityName.toLowerCase()) ? name : `${name}, ${cityName}`;
        
        // 1. Search for the place to get its ID
        const searchUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&limit=1&apiKey=${API_KEY}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.features && searchData.features.length > 0) {
          const feature = searchData.features[0];
          const props = feature.properties;
          const placeId = props.place_id;
          
          let geometry = feature.geometry;
          
          // 2. Try to get the detailed boundary for this place ID
          if (placeId) {
             const boundaryGeometry = await this.getBoundaryForPlaceId(placeId);
             if (boundaryGeometry) {
               geometry = boundaryGeometry;
             }
          }

          // 3. Fallback: If still a Point, try to make a box from bbox
          if (geometry.type === 'Point' && props.bbox) {
             const [minLng, minLat, maxLng, maxLat] = props.bbox;
             geometry = {
                type: 'Polygon',
                coordinates: [[
                  [minLng, minLat],
                  [maxLng, minLat],
                  [maxLng, maxLat],
                  [minLng, maxLat],
                  [minLng, minLat]
                ]]
             };
          } else if (geometry.type === 'Point' && !props.bbox) {
             // Final Fallback: Create a small box around the point
             const delta = 0.02; 
             geometry = {
                type: 'Polygon',
                coordinates: [[
                  [props.lon - delta, props.lat - delta],
                  [props.lon + delta, props.lat - delta],
                  [props.lon + delta, props.lat + delta],
                  [props.lon - delta, props.lat + delta],
                  [props.lon - delta, props.lat - delta]
                ]]
             };
          }

          // Clean name for display
          const displayName = name.split(',')[0];
          const stats = this.generateDistrictStats(displayName, cityId);

          return {
            id: placeId || `district_${index}`,
            name: displayName,
            type: 'district',
            geometry: geometry,
            color: this.getColorForIndex(index),
            value: stats.price,
            price: stats.price,
            population: stats.population,
            currency: stats.currency,
            isPolygon: true,
            lat: props.lat,
            lng: props.lon
          };
        }
      } catch (e) {
        console.warn(`Failed to fetch district ${name}:`, e);
      }
      return null;
    });

    const results = await Promise.all(promises);
    return results.filter(z => z !== null);
  }

  async getBoundaryForPlaceId(placeId) {
    try {
      const url = `https://api.geoapify.com/v1/boundaries/place?id=${placeId}&geometry=geometry_1000&apiKey=${API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].geometry;
      }
      return null;
    } catch (e) {
      console.warn(`Error fetching boundary for ${placeId}:`, e);
      return null;
    }
  }

  getColorForIndex(index) {
    // Highly distinct palette
    const colors = [
      '#FF0000', // Red
      '#00FF00', // Lime
      '#0000FF', // Blue
      '#ffd500ff', // Yellow
      '#00c8ffff', // Cyan
      '#FF00FF', // Magenta
      '#800000', // Maroon
      '#808000', // Olive
      '#008000', // Green
      '#800080', // Purple
      '#008080', // Teal
      '#000080', // Navy
      '#FFA500', // Orange
      '#A52A2A', // Brown
      '#FA8072', // Salmon
      '#4B0082', // Indigo
      '#289bddff', // Aquamarine
      '#e84868ff', // Crimson
      '#b7ff00ff', // Gold
      '#2E8B57'  // SeaGreen
    ];
    return colors[index % colors.length];
  }

  getHash(str) {
    return str.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
  }

  /**
   * Get amenities using Places API
   */
  async getAmenities(lat, lng, categories = ['education.school', 'healthcare.hospital', 'leisure.park', 'public_transport']) {
    if (!API_KEY) return [];

    try {
      const categoryString = categories.join(',');
      const radius = 5000; // 5km radius
      const url = `https://api.geoapify.com/v2/places?categories=${categoryString}&filter=circle:${lng},${lat},${radius}&limit=20&apiKey=${API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data || !data.features) return [];
      
      return data.features.map(f => ({
        name: f.properties.name || f.properties.address_line1 || 'Unknown Place',
        category: f.properties.categories[0],
        lat: f.properties.lat,
        lng: f.properties.lon,
        distance: f.properties.distance || 0 // Ensure distance is present
      }));
    } catch (error) {
      console.error('Error fetching amenities:', error);
      return [];
    }
  }
}

export default new GeoapifyService();
