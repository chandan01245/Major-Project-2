import requests
import time

class GeocodingService:
    """Service for reverse geocoding to get addresses from coordinates"""
    
    def __init__(self):
        self.base_url = "https://nominatim.openstreetmap.org/reverse"
        self.last_request_time = 0
        self.min_request_interval = 1.0  # Respect Nominatim's usage policy (1 req/sec)
    
    def get_address(self, lat, lng):
        """
        Get address from coordinates using Nominatim (OpenStreetMap)
        Returns formatted address string
        """
        try:
            # Rate limiting - wait if needed
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            if time_since_last < self.min_request_interval:
                time.sleep(self.min_request_interval - time_since_last)
            
            params = {
                'lat': lat,
                'lon': lng,
                'format': 'json',
                'addressdetails': 1,
                'zoom': 18  # Street level detail
            }
            
            headers = {
                'User-Agent': 'ZoningAnalysisApp/1.0'
            }
            
            response = requests.get(
                self.base_url,
                params=params,
                headers=headers,
                timeout=10
            )
            
            self.last_request_time = time.time()
            
            if response.ok:
                data = response.json()
                return self._format_address(data)
            else:
                print(f"⚠️ Geocoding API error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"⚠️ Error fetching address: {e}")
            return None
    
    def _format_address(self, data):
        """Format address from Nominatim response"""
        try:
            address = data.get('address', {})
            
            # Build address components
            components = []
            
            # Street number and name
            if 'house_number' in address:
                components.append(address['house_number'])
            if 'road' in address:
                components.append(address['road'])
            elif 'street' in address:
                components.append(address['street'])
            
            # Neighborhood/suburb
            if 'neighbourhood' in address:
                components.append(address['neighbourhood'])
            elif 'suburb' in address:
                components.append(address['suburb'])
            
            # City
            if 'city' in address:
                components.append(address['city'])
            elif 'town' in address:
                components.append(address['town'])
            elif 'village' in address:
                components.append(address['village'])
            
            # State/region
            if 'state' in address:
                components.append(address['state'])
            elif 'region' in address:
                components.append(address['region'])
            
            # Postal code
            if 'postcode' in address:
                components.append(address['postcode'])
            
            # Country
            if 'country' in address:
                components.append(address['country'])
            
            # Return formatted address
            formatted = ', '.join(components) if components else data.get('display_name', 'Address not available')
            
            return formatted
            
        except Exception as e:
            print(f"⚠️ Error formatting address: {e}")
            return data.get('display_name', 'Address not available')
