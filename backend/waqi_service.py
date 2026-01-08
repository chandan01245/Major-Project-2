import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

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
    
    def get_historical_data(self, lat, lng, days=30):
        """
        Get historical AQI data for a location
        WAQI API provides station-based historical data
        
        Note: Historical data availability varies by station.
        If unavailable, returns synthetic historical data based on current AQI.
        
        Returns: list of historical AQI values
        """
        if not self.api_key:
            print("⚠️ WAQI_API_KEY not set in .env file")
            return []
        
        try:
            # First, get the station for these coordinates
            station_url = f"{self.base_url}/feed/geo:{lat};{lng}/"
            params = {'token': self.api_key}
            
            response = requests.get(station_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') != 'ok':
                print(f"⚠️ Could not get station info: {data.get('status')}")
                return self._generate_synthetic_history(data.get('data', {}).get('aqi', 100), days)
            
            station_id = data.get('data', {}).get('idx')
            current_aqi = data.get('data', {}).get('aqi', 100)
            
            if not station_id:
                print("⚠️ No station ID found")
                return self._generate_synthetic_history(current_aqi, days)
            
            # Get historical data from the station
            history_url = f"{self.base_url}/feed/@{station_id}/obs.en.json"
            
            response = requests.get(history_url, params=params, timeout=10)
            response.raise_for_status()
            history_data = response.json()
            
            if history_data.get('status') != 'ok':
                print(f"ℹ️  Historical data not available from station, generating synthetic data")
                return self._generate_synthetic_history(current_aqi, days)
            
            # Parse historical observations
            historical_values = []
            observations = history_data.get('data', [])
            
            for obs in observations:
                if isinstance(obs, dict) and 'v' in obs:
                    aqi_value = obs['v'].get('aqi')
                    if aqi_value and isinstance(aqi_value, (int, float)) and aqi_value > 0:
                        historical_values.append({
                            'date': obs.get('date', {}).get('iso', ''),
                            'aqi': aqi_value
                        })
            
            if not historical_values:
                print(f"ℹ️  No historical data points found, generating synthetic data")
                return self._generate_synthetic_history(current_aqi, days)
            
            # Sort by date (oldest first)
            historical_values.sort(key=lambda x: x.get('date', ''))
            
            # Limit to requested days
            if len(historical_values) > days:
                historical_values = historical_values[-days:]
            
            print(f"✅ Retrieved {len(historical_values)} historical AQI data points")
            return historical_values
            
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Error fetching historical AQI data: {e}")
            # Try to get current AQI and generate synthetic data
            try:
                current_data = self.get_current_aqi(lat, lng)
                if current_data:
                    return self._generate_synthetic_history(current_data['aqi'], days)
            except:
                pass
            return []
        except Exception as e:
            print(f"⚠️ Unexpected error getting historical data: {e}")
            return []
    
    def _generate_synthetic_history(self, current_aqi, days=30):
        """
        Generate synthetic historical AQI data based on current AQI
        Uses realistic patterns with seasonal variation and random noise
        """
        import random
        import math
        
        historical = []
        end_date = datetime.now()
        
        for i in range(days, 0, -1):
            date = end_date - timedelta(days=i)
            
            # Create variation around current AQI with:
            # - Seasonal pattern (sine wave)
            # - Random daily variation
            # - Gradual trend toward current value
            seasonal_factor = math.sin(i / 10) * 15  # ±15 variation
            random_noise = random.gauss(0, 8)  # Daily variation
            trend_factor = (current_aqi - 100) * (days - i) / days  # Trend toward current
            
            synthetic_aqi = current_aqi + seasonal_factor + random_noise + trend_factor
            synthetic_aqi = max(0, min(500, int(synthetic_aqi)))  # Keep in valid range
            
            historical.append({
                'date': date.isoformat(),
                'aqi': synthetic_aqi,
                'synthetic': True  # Mark as synthetic
            })
        
        print(f"📊 Generated {len(historical)} synthetic historical data points based on current AQI: {current_aqi}")
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
