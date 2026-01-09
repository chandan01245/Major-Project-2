import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Calculate paths
current_dir = os.path.dirname(os.path.abspath(__file__)) # backend/services
backend_dir = os.path.dirname(current_dir) # backend
project_root = os.path.dirname(backend_dir) # root

# Load .env explicitly from both locations
load_dotenv(os.path.join(backend_dir, '.env'))
load_dotenv(os.path.join(project_root, '.env'))

class WAQIService:
    """Service to fetch AQI data from World Air Quality Index API"""
    
    def __init__(self):
        self.api_key = os.getenv('WAQI_API_KEY', '')
        self.base_url = 'https://api.waqi.info'
        
    def get_current_aqi(self, lat, lng):
        """
        Get current AQI for given coordinates
        Returns: dict with AQI data or None if error
        """
        if not self.api_key:
            print("⚠️ WAQI_API_KEY not set in .env file")
            return None
            
        try:
            url = f"{self.base_url}/feed/geo:{lat};{lng}/"
            params = {'token': self.api_key}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('status') == 'ok':
                aqi_data = data.get('data', {})
                
                result = {
                    'aqi': aqi_data.get('aqi', 0),
                    'city': aqi_data.get('city', {}).get('name', 'Unknown'),
                    'station': {
                        'name': aqi_data.get('city', {}).get('name', ''),
                        'geo': aqi_data.get('city', {}).get('geo', [lat, lng]),
                        'url': aqi_data.get('city', {}).get('url', '')
                    },
                    'time': aqi_data.get('time', {}).get('iso', datetime.now().isoformat()),
                    'dominentpol': aqi_data.get('dominentpol', 'pm25'),
                    'pollutants': {}
                }
                
                # Extract individual pollutant data
                iaqi = aqi_data.get('iaqi', {})
                for pollutant in ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co']:
                    if pollutant in iaqi:
                        result['pollutants'][pollutant] = iaqi[pollutant].get('v', 0)
                
                print(f"✅ Current AQI for {result['city']}: {result['aqi']}")
                return result
            else:
                print(f"⚠️ WAQI API returned status: {data.get('status')}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching AQI data: {e}")
            return None
        except Exception as e:
            print(f"❌ Unexpected error in WAQI service: {e}")
            return None
    
    def get_historical_data(self, lat, lng, days=400, city_name=None):
        """
        Get historical AQI data for a location
        WAQI API provides station-based historical data
        
        Note: We request 400 days by default to capture full annual seasonality.
        This allows the model to comparing "today" with "this day last year".
        """
        if not self.api_key:
            print("⚠️ WAQI_API_KEY not set in .env file", flush=True)
            return []
        
        current_aqi = 100 # Default if everything fails
        
        try:
            # 1. First, get the station for these coordinates
            station_url = f"{self.base_url}/feed/geo:{lat};{lng}/"
            params = {'token': self.api_key}
            
            response = requests.get(station_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            print("Data",data)
            
            station_id = None
            if data.get('status') == 'ok':
                station_id = data.get('data', {}).get('idx')
                current_aqi = data.get('data', {}).get('aqi', 100)
            
            historical_values = []
            
            # 2. Try to get history from the primary station
            if station_id:
                print(f"🎯 Found local station {station_id} for coordinates.", flush=True)
                historical_values = self._fetch_station_history(station_id, days)
                
            # 3. If primary station has no history, try city-wide search
            if not historical_values and city_name:
                print(f"⚠️ Primary station has no history. Attempting city-wide search for: {city_name}", flush=True)
                search_url = f"{self.base_url}/search/"
                search_params = {'token': self.api_key, 'keyword': city_name}
                
                search_res = requests.get(search_url, params=search_params, timeout=10)
                if search_res.ok:
                    search_data = search_res.json()
                    if search_data.get('status') == 'ok' and search_data.get('data'):
                        # Try the first few stations to find one with full history
                        for result in search_data['data'][:3]:
                            alt_station_id = result.get('uid')
                            if alt_station_id and alt_station_id != station_id:
                                print(f"🔍 Checking alternative station {alt_station_id}: {result.get('station', {}).get('name')}", flush=True)
                                alt_history = self._fetch_station_history(alt_station_id, days)
                                if len(alt_history) > 45:
                                    historical_values = alt_history
                                    print(f"✅ Found substitution history from station {alt_station_id}!", flush=True)
                                    break
            
            # 4. Final Validation
            if not historical_values:
                print(f"ℹ️  No real history found (Local or City). Generating synthetic.", flush=True)
                return self._generate_synthetic_history(current_aqi, days)
            
            # Ensure we have enough data (min 45 points for LSTM)
            if len(historical_values) < 45:
                print(f"ℹ️  Insufficent real points ({len(historical_values)}). Using synthetic.", flush=True)
                return self._generate_synthetic_history(current_aqi, days)
            
            # Limit to requested days (Most Recent)
            if len(historical_values) > days:
                historical_values = historical_values[-days:]

            print(f"✅ WAQI: Successfully retrieved {len(historical_values)} REAL historical data points.", flush=True)
            print(f"   Date Range: {historical_values[0]['date']} to {historical_values[-1]['date']}", flush=True)
            return historical_values
            
        except requests.exceptions.RequestException as e:
            print(f"⚠️ WAQI Error: {e}", flush=True)
            return self._generate_synthetic_history(current_aqi, days)
        except Exception as e:
            print(f"⚠️ Unexpected error getting historical data: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return self._generate_synthetic_history(current_aqi, days)

    def _fetch_station_history(self, station_id, days):
        """Helper to fetch history from a specific station ID"""
        try:
            url = f"{self.base_url}/feed/@{station_id}/obs.en.json"
            response = requests.get(url, params={'token': self.api_key}, timeout=10)
            
            if not response.ok: return []
            
            data = response.json()
            if data.get('status') != 'ok': return []
            
            historical_values = []
            observations = data.get('data', [])
            
            # Parse observations
            # Note: WAQI history format is sometimes {'city': { ... 'iaqi': [...] }} or just 'iaqi' list
            # We look for a list of daily averages
            
            # Use specific handling for 'obs.en.json' structure if distinct, 
            # currently assuming it returns a list under 'data' like the main feed?? 
            # Actually, standard feed/@id/ doesn't always give full history.
            # However, for this project we seem to be relying on 'iaqi' or 'forecast' or 'msg'.
            # Wait, the previous code used: history_data.get('data', []) 
            # and iterated over it looking for 'v' -> 'aqi'.
            
            for obs in observations:
                if isinstance(obs, dict) and 'v' in obs:
                    aqi_value = obs['v'].get('aqi')
                    if aqi_value and isinstance(aqi_value, (int, float)) and aqi_value > 0:
                        historical_values.append({
                            'date': obs.get('date', {}).get('iso', ''),
                            'aqi': aqi_value
                        })
            
            historical_values.sort(key=lambda x: x.get('date', ''))
            return historical_values
        except Exception as e:
            print(f"   Error fetching history for {station_id}: {e}", flush=True)
            return []
    
    def _generate_synthetic_history(self, current_aqi, days=400):
        """
        Generate synthetic historical AQI data based on current AQI.
        Uses a 365-day seasonal cycle to ensure 'Same Time Last Year' correlations work.
        """
        import random
        import math
        
        historical = []
        end_date = datetime.now()
        
        for i in range(days, 0, -1):
            date = end_date - timedelta(days=i)
            
            # 1. Annual Seasonality (365 day cycle)
            # This ensures that Day 0 (today) matches roughly with Day 365 (year ago)
            # Peak pollution usually in winter (approx offset logic)
            day_of_year = date.timetuple().tm_yday
            seasonal_factor = math.sin((day_of_year / 365.0) * 2 * math.pi) * 30
            
            # 2. Random variation
            random_noise = random.gauss(0, 8)
            
            # 3. Trend: slowly converge towards the *real* current_aqi
            # as we get closer to today
            weight = 1 - (i / days) # 0 at start, 1 at today
            base_val = 100 
            simulated_aqi = (base_val * (1-weight)) + (current_aqi * weight)
            
            synthetic_aqi = simulated_aqi + seasonal_factor + random_noise
            synthetic_aqi = max(10, min(500, int(synthetic_aqi)))
            
            historical.append({
                'date': date.isoformat(),
                'aqi': synthetic_aqi,
                'synthetic': True
            })
        
        print(f"📊 Generated {len(historical)} synthetic historical data points (Yearly Seasonality)")
        return historical
    
    def get_city_aqi(self, city_name):
        """
        Get AQI by city name
        """
        if not self.api_key:
            print("⚠️ WAQI_API_KEY not set in .env file")
            return None
        
        try:
            url = f"{self.base_url}/feed/{city_name}/"
            params = {'token': self.api_key}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('status') == 'ok':
                aqi_data = data.get('data', {})
                return {
                    'aqi': aqi_data.get('aqi', 0),
                    'city': aqi_data.get('city', {}).get('name', city_name),
                    'time': aqi_data.get('time', {}).get('iso', datetime.now().isoformat())
                }
            
            return None
            
        except Exception as e:
            print(f"❌ Error fetching city AQI: {e}")
            return None
    
    def get_aqi_category(self, aqi):
        """
        Get AQI category and health implications
        """
        if aqi <= 50:
            return {
                'level': 'Good',
                'color': '#00e400',
                'description': 'Air quality is satisfactory'
            }
        elif aqi <= 100:
            return {
                'level': 'Moderate',
                'color': '#ffff00',
                'description': 'Air quality is acceptable'
            }
        elif aqi <= 150:
            return {
                'level': 'Unhealthy for Sensitive Groups',
                'color': '#ff7e00',
                'description': 'Sensitive groups may experience health effects'
            }
        elif aqi <= 200:
            return {
                'level': 'Unhealthy',
                'color': '#ff0000',
                'description': 'Everyone may begin to experience health effects'
            }
        elif aqi <= 300:
            return {
                'level': 'Very Unhealthy',
                'color': '#8f3f97',
                'description': 'Health alert: everyone may experience serious effects'
            }
        else:
            return {
                'level': 'Hazardous',
                'color': '#7e0023',
                'description': 'Health warnings of emergency conditions'
            }
