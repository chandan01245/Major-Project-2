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
        Get historical AQI data using Open-Meteo API (Free, No Key)
        """
        print(f"🔄 Fetching history from Open-Meteo for {days} days...", flush=True)
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Open-Meteo Air Quality API
        url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        
        params = {
            "latitude": lat,
            "longitude": lng,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "hourly": "pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide",
            "timezone": "auto"
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            if not response.ok:
                print(f"⚠️ Open-Meteo API Error: {response.text}")
                return self._generate_synthetic_history(100, days)
                
            data = response.json()
            print(f"✅ Open-Meteo Connection Successful")
            
            if "hourly" not in data:
                print("⚠️  No 'hourly' data in Open-Meteo response")
                return self._generate_synthetic_history(100, days)
                
            times = data["hourly"]["time"]
            pm25_vals = data["hourly"].get("pm2_5", [])
            
            # --- DEBUG LOGGING ---
            print("\n----- OPEN-METEO REAL DATA SAMPLE -----")
            print(f"Total Hours Retrieved: {len(times)}")
            print(f"Data Range: {times[0]} to {times[-1]}")
            print(f"First 5 PM2.5 Values: {pm25_vals[:5]}")
            print("---------------------------------------\n")
            # ---------------------
            
            pm10_vals = data["hourly"].get("pm10", [])
            pm10_vals = data["hourly"].get("pm10", [])
            o3_vals = data["hourly"].get("ozone", [])
            no2_vals = data["hourly"].get("nitrogen_dioxide", [])
            so2_vals = data["hourly"].get("sulphur_dioxide", [])
            co_vals = data["hourly"].get("carbon_monoxide", [])
            
            historical_values = []
            
            # Open-Meteo returns hourly data, we want daily averages (approximate)
            # We skip 24 hours at a time to keep data size manageable and consistent with daily app logic
            for i in range(0, len(times), 24):
                if i >= len(pm25_vals): break # Safety check
                
                # Calculate sub-indices for each pollutant
                # Helper function _calc_pollutant_aqi(concentration, pollutant_type)
                
                # PM2.5 (avg)
                pm25 = pm25_vals[i] if i < len(pm25_vals) else None
                aqi_pm25 = self._pm25_to_aqi(pm25)
                
                # PM10
                pm10 = pm10_vals[i] if i < len(pm10_vals) else None
                aqi_pm10 = self._calc_pollutant_aqi(pm10, 'pm10')
                
                # O3 (Ozone)
                o3 = o3_vals[i] if i < len(o3_vals) else None
                aqi_o3 = self._calc_pollutant_aqi(o3, 'o3')
                
                # NO2
                no2 = no2_vals[i] if i < len(no2_vals) else None
                aqi_no2 = self._calc_pollutant_aqi(no2, 'no2')
                
                # Take the MAX AQI as the overall AQI for that day
                # (Standard EPA method: AQI for the day is the highest of the individual pollutant AQIs)
                daily_aqi = max(aqi_pm25, aqi_pm10, aqi_o3, aqi_no2)
                
                if daily_aqi > 0:
                    historical_values.append({
                        "date": times[i],
                        "aqi": daily_aqi,
                        "components": {
                            "pm25": pm25, "pm10": pm10, "o3": o3, "no2": no2, "so2": so2_vals[i] if i < len(so2_vals) else None
                        }
                    })
                
            print(f"✅ Retrieving {len(historical_values)} historical points from Open-Meteo")
            return historical_values

        except Exception as e:
            print(f"❌ Error fetching Open-Meteo history: {e}")
            import traceback
            traceback.print_exc()
            return self._generate_synthetic_history(100, days)

    def _calc_pollutant_aqi(self, concentration, pollutant_type):
        """Generic simple AQI calculator for other pollutants (approximate)"""
        if concentration is None: return 0
        val = float(concentration)
        
        # Approximate breakpoints based on US EPA
        # PM10 (24h)
        if pollutant_type == 'pm10':
            if val <= 54: return int((50/54)*val)
            elif val <= 154: return int(51 + (49/100)*(val-55))
            elif val <= 254: return int(101 + (49/100)*(val-155))
            elif val <= 354: return int(151 + (49/100)*(val-255))
            else: return int(val * 0.8) # rough
            
        # Ozone (8h) - approx
        elif pollutant_type == 'o3':
             # concentration in ug/m3. EPA uses ppm. 1 ppb approx 1.96 ug/m3. 
             # Lets use rough linear scaling for display purposes if not strict EPA
             if val <= 60: return int(val * 0.8)
             elif val <= 120: return int(50 + (val - 60))
             else: return int(val)
             
        # NO2 (1h) - approx
        elif pollutant_type == 'no2':
            if val <= 50: return int(val)
            elif val <= 100: return int(50 + (val-50))
            else: return int(val)
            
        return 0

    def _pm25_to_aqi(self, pm25):
        """Helper to convert PM2.5 concentration (µg/m³) to US AQI"""
        if pm25 is None: return 50
        if pm25 <= 12.0:
            return int((50 - 0) / (12.0 - 0) * (pm25 - 0) + 0)
        elif pm25 <= 35.4:
            return int((100 - 51) / (35.4 - 12.1) * (pm25 - 12.1) + 51)
        elif pm25 <= 55.4:
            return int((150 - 101) / (55.4 - 35.5) * (pm25 - 35.5) + 101)
        elif pm25 <= 150.4:
            return int((200 - 151) / (150.4 - 55.5) * (pm25 - 55.5) + 151)
        elif pm25 <= 250.4:
            return int((300 - 201) / (250.4 - 150.5) * (pm25 - 150.5) + 201)
        else:
            return int(pm25 * 1.5) # Fallback for very high
    
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
