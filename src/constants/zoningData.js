// Bangalore zones and areas data
export const bangaloreZones = {
  bommanahalli: {
    name: 'Bommanahalli Zone',
    color: '#4CAF50',
    areas: [
      { name: 'HSR Layout', lat: 12.9116, lng: 77.6473, value: 10200, type: 'residential', far: 2.5 },
      { name: 'Koramangala', lat: 12.9352, lng: 77.6245, value: 11800, type: 'residential', far: 2.5 },
      { name: 'BTM Layout', lat: 12.9165, lng: 77.6101, value: 9200, type: 'residential', far: 2.5 },
      { name: 'Electronic City', lat: 12.8456, lng: 77.6603, value: 6200, type: 'industrial', far: 2.0 },
      { name: 'Bommanahalli', lat: 12.9166, lng: 77.6297, value: 8500, type: 'mixed', far: 2.0 },
      { name: 'Singasandra', lat: 12.9074, lng: 77.6301, value: 7800, type: 'residential', far: 2.0 },
      { name: 'Hongasandra', lat: 12.9045, lng: 77.6189, value: 7500, type: 'residential', far: 2.0 },
      { name: 'Uttarahalli', lat: 12.8998, lng: 77.5531, value: 6800, type: 'residential', far: 1.75 },
    ]
  },
  east: {
    name: 'East Zone',
    color: '#2196F3',
    areas: [
      { name: 'Indiranagar', lat: 12.9716, lng: 77.6412, value: 12500, type: 'residential', far: 2.5 },
      { name: 'Whitefield', lat: 12.9698, lng: 77.7499, value: 8500, type: 'commercial', far: 3.0 },
      { name: 'Marathahalli', lat: 12.9591, lng: 77.7011, value: 7500, type: 'commercial', far: 2.5 },
      { name: 'Shivajinagar', lat: 12.9833, lng: 77.6011, value: 11000, type: 'commercial', far: 3.0 },
      { name: 'Banaswadi', lat: 13.0130, lng: 77.6562, value: 8200, type: 'residential', far: 2.0 },
      { name: 'Ulsoor', lat: 12.9813, lng: 77.6219, value: 12000, type: 'residential', far: 2.5 },
    ]
  },
  west: {
    name: 'West Zone',
    color: '#FF9800',
    areas: [
      { name: 'Rajajinagar', lat: 12.9916, lng: 77.5557, value: 9800, type: 'residential', far: 2.0 },
      { name: 'Malleshwaram', lat: 13.0033, lng: 77.5703, value: 10500, type: 'residential', far: 2.0 },
      { name: 'Yeshwanthpur', lat: 13.0280, lng: 77.5385, value: 7800, type: 'mixed', far: 2.5 },
      { name: 'Sadashivnagar', lat: 13.0067, lng: 77.5844, value: 13500, type: 'residential', far: 2.0 },
    ]
  },
  south: {
    name: 'South Zone',
    color: '#9C27B0',
    areas: [
      { name: 'Jayanagar', lat: 12.9250, lng: 77.5838, value: 9800, type: 'residential', far: 2.0 },
      { name: 'Basavanagudi', lat: 12.9423, lng: 77.5742, value: 9500, type: 'residential', far: 2.0 },
      { name: 'JP Nagar', lat: 12.9096, lng: 77.5853, value: 8900, type: 'residential', far: 2.0 },
      { name: 'Banashankari', lat: 12.9250, lng: 77.5488, value: 8200, type: 'residential', far: 2.0 },
    ]
  },
  mahadevapura: {
    name: 'Mahadevapura Zone',
    color: '#00BCD4',
    areas: [
      { name: 'Bellandur', lat: 12.9260, lng: 77.6738, value: 8800, type: 'residential', far: 2.5 },
      { name: 'Varthur', lat: 12.9517, lng: 77.7543, value: 7200, type: 'residential', far: 2.0 },
      { name: 'HAL', lat: 12.9608, lng: 77.6644, value: 10500, type: 'mixed', far: 2.5 },
    ]
  },
  dasarahalli: {
    name: 'Dasarahalli Zone',
    color: '#795548',
    areas: [
      { name: 'Peenya', lat: 13.0302, lng: 77.5196, value: 5500, type: 'industrial', far: 1.75 },
      { name: 'Jalahalli', lat: 13.0335, lng: 77.5472, value: 7200, type: 'residential', far: 2.0 },
      { name: 'Hebbal', lat: 13.0358, lng: 77.5970, value: 9500, type: 'mixed', far: 2.5 },
    ]
  },
  yelahanka: {
    name: 'Yelahanka Zone',
    color: '#E91E63',
    areas: [
      { name: 'Yelahanka', lat: 13.1007, lng: 77.5963, value: 7500, type: 'residential', far: 2.0 },
      { name: 'Jakkur', lat: 13.0789, lng: 77.6039, value: 8200, type: 'residential', far: 2.0 },
      { name: 'Thanisandra', lat: 13.0661, lng: 77.6554, value: 7800, type: 'residential', far: 2.0 },
    ]
  },
  rrnagar: {
    name: 'RR Nagar Zone',
    color: '#607D8B',
    areas: [
      { name: 'Kengeri', lat: 12.9145, lng: 77.4855, value: 6500, type: 'residential', far: 1.75 },
      { name: 'Vijayanagar', lat: 12.9735, lng: 77.5309, value: 8800, type: 'residential', far: 2.0 },
      { name: 'Nagarbhavi', lat: 12.9581, lng: 77.5034, value: 7200, type: 'residential', far: 2.0 },
    ]
  }
};

// Zoning regulations by type
export const zoningRegulations = {
  residential: {
    type: 'residential',
    name: 'Residential',
    icon: 'Home',
    color: '#10b981',
    far: '1.5 - 2.5',
    maxHeight: '15m - 45m',
    groundCoverage: '40% - 60%',
    setback: '3m - 6m',
    parking: '1 per 100 sqm',
    description: 'Primarily for housing and residential complexes',
    examples: ['Apartments', 'Villas', 'Gated Communities', 'Row Houses']
  },
  commercial: {
    type: 'commercial',
    name: 'Commercial',
    icon: 'Building',
    color: '#3b82f6',
    far: '2.5 - 3.5',
    maxHeight: '45m - 60m',
    groundCoverage: '50% - 70%',
    setback: '6m - 9m',
    parking: '1 per 50 sqm',
    description: 'Business, retail, and office spaces',
    examples: ['Office Buildings', 'Shopping Malls', 'Retail Stores', 'Business Parks']
  },
  industrial: {
    type: 'industrial',
    name: 'Industrial',
    icon: 'Factory',
    color: '#f59e0b',
    far: '1.5 - 2.0',
    maxHeight: '15m - 30m',
    groundCoverage: '60% - 75%',
    setback: '9m - 12m',
    parking: '1 per 75 sqm',
    description: 'Manufacturing and warehouse zones',
    examples: ['Factories', 'Warehouses', 'Manufacturing Units', 'Storage Facilities']
  },
  mixed: {
    type: 'mixed',
    name: 'Mixed Use',
    icon: 'Building2',
    color: '#8b5cf6',
    far: '2.0 - 3.0',
    maxHeight: '30m - 50m',
    groundCoverage: '50% - 65%',
    setback: '4.5m - 7.5m',
    parking: '1 per 65 sqm',
    description: 'Combination of residential, commercial, and retail',
    examples: ['Mixed-use Towers', 'Live-Work Spaces', 'Retail + Apartments', 'Commercial + Residential']
  }
};
