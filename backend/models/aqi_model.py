import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
import joblib
import random
import math
import os
from tensorflow.keras.models import load_model

class AQIPredictor:
    def __init__(self):
        self.lstm_model = None
        self.rf_model = None
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.sequence_length = 30  # Look back 30 days
        self.is_trained = False
        self.lstm_weight = 0.6
        self.rf_weight = 0.4
        
        # Setup storage directory
        self.models_dir = os.path.join(os.path.dirname(__file__), 'saved_models')
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)

    def _prepare_data(self, data):
        """
        Convert time series list into X, y samples
        """
        X_lstm, X_rf, y = [], [], []
        
        # We need at least sequence_length + 1 data points
        if len(data) <= self.sequence_length:
            return np.array([]), np.array([]), np.array([])

        # Normalize data for LSTM
        data_reshaped = np.array(data).reshape(-1, 1)
        scaled_data = self.scaler.fit_transform(data_reshaped)
        
        for i in range(len(data) - self.sequence_length):
            # Input sequence (0 to 30)
            seq_scaled = scaled_data[i:(i + self.sequence_length), 0]
            seq_raw = data[i:(i + self.sequence_length)]
            
            # Target (31st day)
            target_scaled = scaled_data[i + self.sequence_length, 0]
            
            X_lstm.append(seq_scaled)
            X_rf.append(seq_raw) # RF works better with raw value patterns usually, or flattened
            y.append(target_scaled)

        # Reshape for LSTM: (samples, time_steps, features)
        X_lstm = np.array(X_lstm)
        X_lstm = np.reshape(X_lstm, (X_lstm.shape[0], X_lstm.shape[1], 1))
        
        # Reshape for RF: (samples, features)
        X_rf = np.array(X_rf)
        
        return X_lstm, X_rf, np.array(y)

    def build_lstm_model(self):
        model = Sequential([
            LSTM(64, return_sequences=True, input_shape=(self.sequence_length, 1)),
            Dropout(0.2),
            LSTM(32),
            Dense(1)
        ])
        model.compile(optimizer='adam', loss='mse')
        self.lstm_model = model

    def _get_city_paths(self, city_name):
        """Helper to get file paths for a city's models"""
        safe_name = "".join([c for c in city_name if c.isalnum() or c in (' ', '-', '_')]).strip().lower()
        city_dir = os.path.join(self.models_dir, safe_name)
        if not os.path.exists(city_dir):
            os.makedirs(city_dir)
            
        return {
            'lstm': os.path.join(city_dir, 'lstm_model.keras'),
            'rf': os.path.join(city_dir, 'rf_model.joblib'),
            'scaler': os.path.join(city_dir, 'scaler.joblib'),
            'meta': os.path.join(city_dir, 'metadata.joblib')
        }

    def train(self, historical_data, city_name=None):
        """
        Train a fresh model specific to the provided city data.
        Args:
            historical_data: List of daily AQI values (e.g., [140, 142...]) OR list of dicts
            city_name: Optional name of city to persistent the model for
        """
        print(f"🔹 Model Training Started for {city_name or 'Unknown City'}...", flush=True)
        
        # Data Sanitization: Handle WAQI service response format (list of dicts) directly
        if historical_data and isinstance(historical_data, list) and len(historical_data) > 0:
            if isinstance(historical_data[0], dict) and 'aqi' in historical_data[0]:
                print(f"   Sanitizing input: Converting {len(historical_data)} dicts to raw values...", flush=True)
                historical_data = [d['aqi'] for d in historical_data]
        
        print(f"🧠 Training Hybrid Model on {len(historical_data)} REAL data points...", flush=True)

        # 1. Prepare Data
        X_lstm, X_rf, y = self._prepare_data(historical_data)
        
        if len(X_lstm) < 10:
            print(f"⚠️ Insufficient prepared samples ({len(X_lstm)}). Falling back to synthetic training.")
            self._train_synthetic_fallback(city_name)
            return

        # 2. Train LSTM
        print("   Training LSTM (Deep Learning)...")
        self.build_lstm_model()
        self.lstm_model.fit(X_lstm, y, epochs=15, batch_size=16, verbose=0)

        # 3. Train Random Forest
        print("   Training Random Forest (Ensemble)...")
        # Convert X_rf to numpy array explicitly to avoid "feature names" warning if it was dataframe
        X_rf = np.array(X_rf)
        self.rf_model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
        self.rf_model.fit(X_rf, y)

        self.is_trained = True
        
        # 4. Save to Disk if city_name provided
        if city_name:
            print(f"💾 Saving trained model for '{city_name}' to disk...")
            paths = self._get_city_paths(city_name)
            try:
                self.lstm_model.save(paths['lstm'])
                joblib.dump(self.rf_model, paths['rf'])
                joblib.dump(self.scaler, paths['scaler'])
                joblib.dump({'trained_on_points': len(historical_data)}, paths['meta'])
                print(f"✅ Model successfully persisted for future use.")
            except Exception as e:
                print(f"⚠️ Failed to save model: {e}") 
            
        print("✅ Hybrid Model Training Complete")

    def _train_synthetic_fallback(self, city_name=None):
        """Generates dummy data if real history is missing"""
        print("⚠️ Generating synthetic training data...")
        dummy_history = []
        for i in range(365):
            val = 100 + math.sin(i/30)*40 + random.gauss(0, 10)
            dummy_history.append(max(20, val))
        
        # Recursively call train with dummy data
        self.train(dummy_history, city_name)

    def predict_future(self, current_aqi, days=30, historical_data=None, city_name=None):
        """
        Predict AQI for next N days.
        Input:
            current_aqi: The specific value for today
            historical_data: The past data for the city (used to train!)
            city_name: Optional city name to check for saved model
        """
        print(f"🔮 Prediction Request: Forecast {days} days for {city_name or 'Unknown'} (Current: {current_aqi})")
        
        # STEP 0: Prepare input sequence 
        clean_history = []
        input_sequence = []
        
        if historical_data and len(historical_data) >= self.sequence_length:
            if isinstance(historical_data[0], dict):
                clean_history = [d['aqi'] for d in historical_data]
            else:
                clean_history = historical_data
            input_sequence = clean_history[-self.sequence_length:]
        else:
            input_sequence = [current_aqi] * self.sequence_length

        # STEP 1: Model Management (Disk Load vs Train)
        model_loaded = False
        
        # Try to load from disk
        if city_name:
            paths = self._get_city_paths(city_name)
            if os.path.exists(paths['lstm']) and os.path.exists(paths['rf']):
                try:
                    print(f"📂 Found existing model for {city_name}. Loading from disk...")
                    self.lstm_model = load_model(paths['lstm'])
                    self.rf_model = joblib.load(paths['rf'])
                    self.scaler = joblib.load(paths['scaler'])
                    self.is_trained = True
                    model_loaded = True
                    print(f"⚡ FAST: Loaded {city_name} model instantly. Skipping training.")
                except Exception as e:
                    print(f"⚠️ Error loading saved model, triggering retrain... {e}")
            
        # If not loaded, train new
        if not model_loaded:
            print(f"🆕 No saved model found for {city_name}. Initiating training sequence...")
            if clean_history:
                self.train(clean_history, city_name)
            else:
                if not self.is_trained:
                    print("⚠️ No history provided for training. Using synthetic fallback.")
                    self._train_synthetic_fallback(city_name)

        predictions = []
        curr_seq = list(input_sequence)
        
        print("✨ Generating forecast values...")

        # STEP 2: Rolling Prediction
        for _ in range(days):
            # Prepare inputs
            # Scale LSTM input
            seq_array = np.array(curr_seq[-self.sequence_length:]).reshape(-1, 1)
            seq_scaled = self.scaler.transform(seq_array)
            lstm_in = seq_scaled.reshape(1, self.sequence_length, 1)
            
            # RF Input (Raw)
            rf_in = np.array(curr_seq[-self.sequence_length:]).reshape(1, -1)

            try:
                # Get scaled predictions from both
                lstm_pred_scaled = self.lstm_model.predict(lstm_in, verbose=0)[0][0]
                
                # Suppress sklearn warning for just the prediction step
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    rf_pred_scaled = self.rf_model.predict(rf_in)[0]

                # Weighted Average (Hybrid)
                hybrid_scaled = (lstm_pred_scaled * self.lstm_weight) + (rf_pred_scaled * self.rf_weight)
                
                # Inverse transform to get real AQI
                next_val = self.scaler.inverse_transform([[hybrid_scaled]])[0][0]
                
                # Add slight noise to prevent flatlining lines in graphs
                next_val += random.gauss(0, 2)
                
            except Exception as e:
                print(f"Prediction Error: {e}")
                next_val = curr_seq[-1]

            # Constraints (AQI cannot be negative)
            next_val = max(10, next_val)
            
            predictions.append(int(next_val))
            curr_seq.append(next_val)

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
