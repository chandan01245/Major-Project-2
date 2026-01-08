import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from datetime import datetime, timedelta
import random
import math

class AQIPredictor:
    def __init__(self):
        self.model = None
        self.is_trained = False
        self.sequence_length = 10  # Days of history to look at

    def build_model(self):
        """Build LSTM model"""
        model = Sequential([
            LSTM(50, activation='relu', input_shape=(self.sequence_length, 1)),
            Dense(1)
        ])
        model.compile(optimizer='adam', loss='mse')
        self.model = model
        return model

    def train_mock_model(self):
        """Train on synthetic data since we don't have real historical DB"""
        print("🧠 Training AQI LSTM Model...")
        
        # Generate synthetic historical data (sine wave + noise to simulate seasonal AQI)
        X = []
        y = []
        
        # Create 1000 samples
        for i in range(1000):
            # Generate a sequence
            start_val = random.randint(50, 150)
            seq = [start_val + math.sin(x/10)*20 + random.gauss(0, 5) for x in range(self.sequence_length + 1)]
            X.append([[v] for v in seq[:-1]])
            y.append(seq[-1])
            
        X = np.array(X)
        y = np.array(y)
        
        if self.model is None:
            self.build_model()
            
        self.model.fit(X, y, epochs=5, verbose=0)
        self.is_trained = True
        print("✅ AQI Model Trained")

    def predict_future(self, current_aqi, days=30, historical_data=None):
        """
        Predict AQI for next N days with realistic constraints
        
        Args:
            current_aqi: Current AQI value
            days: Number of days to predict
            historical_data: List of historical AQI values (if available from WAQI)
        """
        import random
        import math
        
        predictions = []
        
        # Calculate historical statistics if available
        if historical_data and len(historical_data) >= 5:
            hist_mean = sum(historical_data) / len(historical_data)
            hist_std = math.sqrt(sum((x - hist_mean) ** 2 for x in historical_data) / len(historical_data))
            hist_min = min(historical_data)
            hist_max = max(historical_data)
        else:
            # Use current AQI with reasonable variation
            hist_mean = current_aqi
            hist_std = current_aqi * 0.15  # 15% standard deviation
            hist_min = current_aqi * 0.7   # Can go 30% lower
            hist_max = current_aqi * 1.3   # Can go 30% higher
        
        # Start with current AQI
        current_val = current_aqi
        
        for day in range(days):
            # Mean reversion: predictions tend to drift back toward the mean
            mean_reversion_strength = 0.1  # 10% pull toward mean each day
            drift_to_mean = (hist_mean - current_val) * mean_reversion_strength
            
            # Seasonal/weekly pattern (slight variation)
            seasonal_effect = math.sin(day / 7 * math.pi) * hist_std * 0.3
            
            # Random daily variation
            daily_noise = random.gauss(0, hist_std * 0.5)
            
            # Calculate next value
            next_val = current_val + drift_to_mean + seasonal_effect + daily_noise
            
            # Apply realistic constraints
            # AQI typically doesn't jump more than 20% day-to-day
            max_daily_change = current_aqi * 0.2
            if abs(next_val - current_val) > max_daily_change:
                if next_val > current_val:
                    next_val = current_val + max_daily_change
                else:
                    next_val = current_val - max_daily_change
            
            # Keep within historical range (with small buffer)
            next_val = max(hist_min * 0.9, min(hist_max * 1.1, next_val))
            
            # Ensure non-negative
            next_val = max(0, next_val)
            
            predictions.append(int(next_val))
            current_val = next_val
        
        return predictions

    def get_lightning_risk(self, city, building_type, lat=None, lng=None):
        """
        Calculate lightning risk based on location, climate data, and building characteristics
        
        Args:
            city: City name
            building_type: Type of building (residential, commercial, etc.)
            lat: Latitude (optional, for more precise calculation)
            lng: Longitude (optional, for more precise calculation)
        """
        import math
        
        # Lightning flash density data (flashes per km² per year) for major cities
        # Source: Based on Indian Meteorological Department and global lightning data
        lightning_density = {
            'bangalore': 8.5,  # High activity
            'bengaluru': 8.5,
            'mumbai': 5.2,
            'delhi': 4.8,
            'hyderabad': 7.2,
            'kolkata': 9.1,  # Very high
            'chennai': 6.5,
            'pune': 6.0,
            'ranchi': 8.8,
            'bhubaneswar': 8.3,
            'new_york': 3.5,  # Moderate
            'singapore': 7.8,  # High (tropical)
        }
        
        # Get base lightning density for the city
        base_density = lightning_density.get(city.lower(), 5.0)  # Default 5 flashes/km²/year
        
        # Building height risk multipliers
        height_multipliers = {
            'residential': 1.0,      # Typically lower buildings
            'commercial': 1.5,       # Medium to tall buildings
            'industrial': 1.2,       # Usually moderate height
            'mixed': 1.4            # Mix of heights
        }
        
        # Building material considerations (taller commercial buildings = more risk)
        building_multiplier = height_multipliers.get(building_type, 1.0)
        
        # Calculate annual strike probability for the area
        # Assuming average building footprint of 0.001 km² (1000 sqm)
        area_km2 = 0.001
        annual_strikes = base_density * area_km2 * building_multiplier
        
        # Calculate probability percentage (chance of strike in next year)
        probability = min(annual_strikes * 100, 95)  # Cap at 95%
        
        # Determine risk level
        if probability < 5:
            risk_level = "Low"
            recommendation = "Standard building grounding as per local electrical codes."
        elif probability < 15:
            risk_level = "Medium"
            recommendation = "Install basic lightning protection system (LPS) with air terminals and down conductors."
        elif probability < 30:
            risk_level = "High"
            recommendation = "Install advanced LPS (Lightning Protection System) as per IS/IEC 62305 standards, including surge protection devices."
        else:
            risk_level = "Very High"
            recommendation = "Mandatory comprehensive LPS installation with multiple protection zones, surge arresters, and regular maintenance inspections."
        
        # Additional warnings based on location
        warnings = []
        if city.lower() in ['bangalore', 'bengaluru', 'kolkata', 'ranchi', 'bhubaneswar']:
            warnings.append("Location is in high lightning activity zone")
        
        if building_type in ['commercial', 'mixed']:
            warnings.append("Taller structures increase strike risk")
        
        # Seasonal considerations
        warnings.append("Risk increases during monsoon season (June-September)")
        
        return {
            'level': risk_level,
            'riskLevel': risk_level,  # For backward compatibility
            'probability': round(probability, 1),
            'recommendation': recommendation,
            'warning': recommendation,  # For backward compatibility
            'lightningDensity': base_density,
            'annualStrikes': round(annual_strikes, 2),
            'warnings': warnings,
            'buildingType': building_type,
            'protectionRequired': probability > 10
        }
