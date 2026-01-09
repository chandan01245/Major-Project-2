import requests
import os
import math

class AmenitiesFinder:
    def __init__(self):
        self.api_key = os.getenv('REACT_APP_MAPTILER_KEY') or os.getenv('MAPTILER_KEY')
        self.base_url = "https://api.maptiler.com/geocoding"
        # Simple cache to avoid repeated API calls for same location
        self.cache = {}
        self.cache_timeout = 300  # 5 minutes
    
    def _get_cache_key(self, lat, lng):
        """Generate cache key from coordinates"""
        return f"{lat:.4f},{lng:.4f}"
    
    def _get_from_cache(self, lat, lng):
        """Get cached amenities if available and not expired"""
        import time
        key = self._get_cache_key(lat, lng)
        if key in self.cache:
            cached_data, timestamp = self.cache[key]
            if time.time() - timestamp < self.cache_timeout:
                print(f"[OK] Using cached amenities for {lat}, {lng}")
                return cached_data
        return None
    
    def _save_to_cache(self, lat, lng, amenities):
        """Save amenities to cache"""
        import time
        key = self._get_cache_key(lat, lng)
        self.cache[key] = (amenities, time.time())

    def find_amenities(self, lat, lng, radius_km=5.0):
        """
        Find amenities near a location using Overpass API (OpenStreetMap).
        Returns the nearest 3 amenities for each category with proper names.
        """
        print(f"\n[SEARCH] Finding amenities for coordinates: {lat}, {lng}")
        
        # Check cache first
        cached = self._get_from_cache(lat, lng)
        if cached:
            return cached
        
        amenities = {
            'schools': [],
            'hospitals': [],
            'transport': [],
            'parks': []
        }

        # Overpass query for each category with proper tags
        queries = {
            'schools': '["amenity"="school"]',
            'hospitals': '["amenity"~"hospital|clinic|doctors"]',
            'transport': '["public_transport"~"station|stop"]',  # Broader query
            'parks': '["leisure"="park"]'
        }

        try:
            for category, tag_filter in queries.items():
                print(f"  [FIND] Searching for {category}...")
                
                # Increase radius slightly for better results
                radius_meters = 3000  # 3km instead of 2km
                query = f"""
                [out:json][timeout:25];
                (
                  node{tag_filter}(around:{radius_meters},{lat},{lng});
                  way{tag_filter}(around:{radius_meters},{lat},{lng});
                );
                out center 15;
                """
                
                # Try with retry for 504 errors
                max_retries = 3  # Increased from 2 to 3
                retry_count = 0
                success = False
                
                while retry_count < max_retries and not success:
                    try:
                        response = requests.post(
                            "https://overpass-api.de/api/interpreter",
                            data=query,
                            timeout=25
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            elements = data.get('elements', [])
                            
                            print(f"     Found {len(elements)} raw elements")
                            
                            category_results = []
                            for element in elements:
                                tags = element.get('tags', {})
                                
                                # Try multiple name fields
                                name = (tags.get('name') or 
                                       tags.get('name:en') or
                                       tags.get('official_name') or 
                                       tags.get('operator') or
                                       tags.get('brand') or
                                       '')
                                
                                # Generate fallback name if no name found
                                if not name or len(name) < 2:
                                    # Use the amenity type as fallback
                                    amenity_type = tags.get('amenity', tags.get('leisure', tags.get('public_transport', category[:-1])))
                                    name = f"{amenity_type.replace('_', ' ').title()}"
                                    if 'addr:street' in tags:
                                        name += f" on {tags['addr:street']}"
                                
                                # Still skip if name is too short
                                if len(name) < 2:
                                    continue
                                
                                # Get coordinates
                                if 'lat' in element and 'lon' in element:
                                    place_lat = element['lat']
                                    place_lng = element['lon']
                                elif 'center' in element:
                                    place_lat = element['center']['lat']
                                    place_lng = element['center']['lon']
                                else:
                                    continue
                                
                                dist = self._calculate_distance(lat, lng, place_lat, place_lng)
                                
                                # Calculate travel times (walking 5 km/h, driving 30 km/h)
                                walking_time = max(1, round((dist / 5) * 60))
                                driving_time = max(1, round((dist / 30) * 60))
                                
                                item = {
                                    'name': name,
                                    'distance': round(dist, 2),
                                    'walkingTime': walking_time,
                                    'drivingTime': driving_time,
                                    'lat': place_lat,
                                    'lng': place_lng,
                                    'type': category
                                }
                                
                                # Avoid duplicates
                                if not any(x['name'] == item['name'] for x in category_results):
                                    category_results.append(item)
                            
                            # Sort by distance and take top 3
                            category_results.sort(key=lambda x: x['distance'])
                            amenities[category] = category_results[:3]
                            
                            print(f"     [OK] Extracted {len(amenities[category])} {category} with names")
                            if len(amenities[category]) > 0:
                                print(f"        Sample: {amenities[category][0]['name']}")
                            else:
                                print(f"        [WARN] No names extracted from {len(elements)} elements")
                            success = True
                        elif response.status_code == 504 and retry_count < max_retries - 1:
                            # 504 Gateway Timeout - retry after delay
                            import time
                            retry_count += 1
                            # Progressive delay: 2s, 3s, 5s
                            delay = [2, 3, 5][retry_count - 1] if retry_count <= 3 else 5
                            print(f"[WAIT] Overpass busy, retrying {category} ({retry_count}/{max_retries}) after {delay}s...")
                            time.sleep(delay)
                        else:
                            print(f"[WARN] Overpass API error for {category}: {response.status_code}")
                            break
                    except Exception as e:
                        print(f"[WARN] Error querying {category}: {e}")
                        break
        
        except Exception as e:
            print(f"[WARN] Error using Overpass API: {e}")
        
        # Add bus stops separately (more common than metro)
        try:
            if len(amenities['transport']) < 3:
                query = f"""
                [out:json][timeout:25];
                node["highway"="bus_stop"](around:1000,{lat},{lng});
                out 5;
                """
                response = requests.post(
                    "https://overpass-api.de/api/interpreter",
                    data=query,
                    timeout=25
                )
                if response.status_code == 200:
                    data = response.json()
                    for element in data.get('elements', [])[:3]:
                        tags = element.get('tags', {})
                        name = tags.get('name', 'Bus Stop')
                        dist = self._calculate_distance(lat, lng, element['lat'], element['lon'])
                        amenities['transport'].append({
                            'name': name,
                            'distance': round(dist, 2),
                            'walkingTime': max(1, round((dist / 5) * 60)),
                            'drivingTime': max(1, round((dist / 30) * 60)),
                        })
                    print(f"[OK] Found {len(amenities['transport'])} bus stops")
        except Exception as e:
            print(f"[WARN] Error finding bus stops: {e}")
        
        # Fill empty categories with mock data
        mock = self._get_mock_amenities()
        total_results = sum(len(amenities[cat]) for cat in amenities)
        
        print(f"\n[STATS] Total amenities found: {total_results}")
        for cat in amenities:
            print(f"   {cat}: {len(amenities[cat])} items")
        
        # If very few results, try one more time with larger radius
        if total_results < 4:
            print(f"\n[WARN] Very few amenities found ({total_results}). Retrying with 5km radius...")
            retry_amenities = self._fetch_with_larger_radius(lat, lng)
            # Merge results, preferring new results if better
            for cat in amenities:
                if len(amenities[cat]) == 0 and len(retry_amenities.get(cat, [])) > 0:
                    amenities[cat] = retry_amenities[cat]
                    print(f"   [OK] Found {len(amenities[cat])} {cat} with larger radius")
            
            total_results = sum(len(amenities[cat]) for cat in amenities)
        
        if total_results == 0:
            print("[WARN] No amenities found from Overpass, using mock data")
            return mock
        
        for category in amenities:
            if len(amenities[category]) == 0:
                print(f"[WARN] No {category} found, using mock data for this category")
                amenities[category] = mock[category]
        
        print(f"[OK] Returning amenities to frontend\n")
        
        # Save successful result to cache
        self._save_to_cache(lat, lng, amenities)
        
        return amenities
    
    def _fetch_with_larger_radius(self, lat, lng):
        """Retry fetching amenities with a larger 5km radius"""
        amenities = {
            'schools': [],
            'hospitals': [],
            'transport': [],
            'parks': []
        }
        
        queries = {
            'schools': '["amenity"="school"]',
            'hospitals': '["amenity"~"hospital|clinic|doctors"]',
            'transport': '["public_transport"~"station|stop"]',
        }
        
        for category, tag_filter in queries.items():
            try:
                radius_meters = 5000  # 5km
                query = f"""
                [out:json][timeout:15];
                (
                  node{tag_filter}(around:{radius_meters},{lat},{lng});
                  way{tag_filter}(around:{radius_meters},{lat},{lng});
                );
                out center 10;
                """
                
                response = requests.post(
                    "https://overpass-api.de/api/interpreter",
                    data=query,
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    elements = data.get('elements', [])
                    
                    category_results = []
                    for element in elements:
                        tags = element.get('tags', {})
                        name = (tags.get('name') or tags.get('name:en') or 
                               tags.get('operator') or '')
                        
                        if not name or len(name) < 2:
                            amenity_type = tags.get('amenity', tags.get('public_transport', category[:-1]))
                            name = f"{amenity_type.replace('_', ' ').title()}"
                        
                        if len(name) < 2:
                            continue
                        
                        if 'lat' in element and 'lon' in element:
                            place_lat = element['lat']
                            place_lng = element['lon']
                        elif 'center' in element:
                            place_lat = element['center']['lat']
                            place_lng = element['center']['lon']
                        else:
                            continue
                        
                        dist = self._calculate_distance(lat, lng, place_lat, place_lng)
                        
                        item = {
                            'name': name,
                            'distance': round(dist, 2),
                            'walkingTime': max(1, round((dist / 5) * 60)),
                            'drivingTime': max(1, round((dist / 30) * 60)),
                            'lat': place_lat,
                            'lng': place_lng,
                            'type': category
                        }
                        
                        if not any(x['name'] == item['name'] for x in category_results):
                            category_results.append(item)
                    
                    category_results.sort(key=lambda x: x['distance'])
                    amenities[category] = category_results[:3]
            except:
                pass
        
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
            'schools': [
                {'name': 'Demo School', 'distance': 1.2, 'walkingTime': 14, 'drivingTime': 2},
                {'name': 'City High', 'distance': 3.5, 'walkingTime': 42, 'drivingTime': 7},
                {'name': 'Tech Institute', 'distance': 12.0, 'walkingTime': 144, 'drivingTime': 24}
            ],
            'hospitals': [
                {'name': 'City Hospital', 'distance': 2.5, 'walkingTime': 30, 'drivingTime': 5},
                {'name': 'General Clinic', 'distance': 4.1, 'walkingTime': 49, 'drivingTime': 8},
                {'name': 'Trauma Center', 'distance': 15.2, 'walkingTime': 182, 'drivingTime': 30}
            ],
            'transport': [
                {'name': 'Central Station', 'distance': 3.0, 'walkingTime': 36, 'drivingTime': 6},
                {'name': 'Bus Terminal', 'distance': 0.8, 'walkingTime': 10, 'drivingTime': 2},
                {'name': 'Metro Stop', 'distance': 1.5, 'walkingTime': 18, 'drivingTime': 3}
            ],
            'parks': [
                {'name': 'Central Park', 'distance': 0.5, 'walkingTime': 6, 'drivingTime': 1},
                {'name': 'Botanical Garden', 'distance': 5.2, 'walkingTime': 62, 'drivingTime': 10},
                {'name': 'Community Park', 'distance': 2.1, 'walkingTime': 25, 'drivingTime': 4}
            ]
        }
