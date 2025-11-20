import requests
import os
import math

class AmenitiesFinder:
    def __init__(self):
        self.api_key = os.getenv('REACT_APP_MAPTILER_KEY') or os.getenv('MAPTILER_KEY')
        self.base_url = "https://api.maptiler.com/geocoding"

    def find_amenities(self, lat, lng, radius_km=50.0):
        """
        Find amenities near a location using MapTiler Geocoding API.
        Returns the nearest 3 amenities for each category, regardless of distance (within a large radius).
        """
        if not self.api_key:
            print("⚠️ MapTiler API Key not found!")
            return self._get_mock_amenities()

        amenities = {
            'schools': [],
            'hospitals': [],
            'transport': [],
            'parks': []
        }

        # Categories to search for
        searches = {
            'schools': ['school', 'college', 'university'],
            'hospitals': ['hospital', 'clinic', 'medical center'],
            'transport': ['metro station', 'bus stop', 'railway station'],
            'parks': ['park', 'garden']
        }

        for category, queries in searches.items():
            category_results = []
            for query in queries:
                try:
                    # Search with proximity bias, but large bbox
                    url = f"{self.base_url}/{query}.json"
                    params = {
                        'key': self.api_key,
                        'proximity': f"{lng},{lat}",
                        'limit': 5,  # Get more to filter/sort
                        'bbox': f"{lng-0.5},{lat-0.5},{lng+0.5},{lat+0.5}" # ~50km box
                    }
                    
                    response = requests.get(url, params=params)
                    if response.status_code == 200:
                        features = response.json().get('features', [])
                        for feature in features:
                            place_lng, place_lat = feature['center']
                            dist = self._calculate_distance(lat, lng, place_lat, place_lng)
                            
                            item = {
                                'name': feature['place_name'],
                                'distance': round(dist, 2),
                                'lat': place_lat,
                                'lng': place_lng,
                                'type': category
                            }
                            # Avoid duplicates
                            if not any(x['name'] == item['name'] for x in category_results):
                                category_results.append(item)
                except Exception as e:
                    print(f"Error searching for {query}: {e}")
            
            # Sort by distance and take top 3
            category_results.sort(key=lambda x: x['distance'])
            amenities[category] = category_results[:3]

        return amenities

    def get_road_condition(self, lat, lng):
        """
        Infer road condition using Overpass API (OpenStreetMap).
        Checks for 'surface' and 'smoothness' tags on nearby roads.
        """
        try:
            # Query for roads within 50m
            query = f"""
                [out:json][timeout:10];
                way(around:50,{lat},{lng})["highway"];
                out tags;
            """
            response = requests.post("https://overpass-api.de/api/interpreter", data=query)
            
            if response.status_code == 200:
                data = response.json()
                elements = data.get('elements', [])
                
                if not elements:
                    return "Unknown (No nearby roads found)"
                
                # Check tags
                surfaces = []
                smoothness = []
                
                for el in elements:
                    tags = el.get('tags', {})
                    if 'surface' in tags:
                        surfaces.append(tags['surface'])
                    if 'smoothness' in tags:
                        smoothness.append(tags['smoothness'])
                
                if surfaces:
                    # Most common surface
                    from collections import Counter
                    common_surface = Counter(surfaces).most_common(1)[0][0]
                    condition = f"Surface: {common_surface.capitalize()}"
                    if smoothness:
                        common_smoothness = Counter(smoothness).most_common(1)[0][0]
                        condition += f", Smoothness: {common_smoothness.capitalize()}"
                    return condition
                
                return "Standard (Paved)" # Default assumption if highway exists but no tags
                
            return "Unknown (API Error)"
        except Exception as e:
            print(f"Error checking road condition: {e}")
            return "Unknown"

    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        """Haversine distance in km"""
        R = 6371  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2) * math.sin(dlat/2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(dlon/2) * math.sin(dlon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c

    def _get_mock_amenities(self):
        """Fallback mock data"""
        return {
            'schools': [{'name': 'Demo School', 'distance': 1.2}, {'name': 'City High', 'distance': 3.5}, {'name': 'Tech Institute', 'distance': 12.0}],
            'hospitals': [{'name': 'City Hospital', 'distance': 2.5}, {'name': 'General Clinic', 'distance': 4.1}, {'name': 'Trauma Center', 'distance': 15.2}],
            'transport': [{'name': 'Central Station', 'distance': 3.0}, {'name': 'Bus Terminal', 'distance': 0.8}, {'name': 'Metro Stop', 'distance': 1.5}],
            'parks': [{'name': 'Central Park', 'distance': 0.5}, {'name': 'Botanical Garden', 'distance': 5.2}, {'name': 'Community Park', 'distance': 2.1}]
        }
