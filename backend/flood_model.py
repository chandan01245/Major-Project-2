import os
import random

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor


class FloodPredictor:
    def __init__(self):
        self.model = None
        self.is_trained = False
        # Use absolute path for model storage so joblib load/save is unambiguous
        self.model_path = os.path.join(os.getcwd(), 'models', 'flood_model.pkl')

    def train_mock_model(self):
        """Train a Random Forest model on synthetic data"""
        print("🌊 Training Flood Prediction Model...")
        
        # Generate synthetic data
        # Features: Rainfall (mm), Temperature (C), Humidity (%), Pressure (hPa), Elevation (m)
        # Target: Flood Risk Score (0-100)
        
        n_samples = 1000
        data = []
        
        for _ in range(n_samples):
            rainfall = random.uniform(0, 500) # mm
            temp = random.uniform(20, 40) # C
            humidity = random.uniform(30, 100) # %
            pressure = random.uniform(990, 1020) # hPa
            elevation = random.uniform(0, 1000) # m
            
            # Logic for synthetic risk
            # High rainfall, high humidity, low pressure, low elevation -> High Risk
            
            risk = (rainfall * 0.4) + (humidity * 0.2) + ((1020 - pressure) * 0.5) - (elevation * 0.3)
            
            # Normalize and add noise
            risk = max(0, min(100, risk + random.gauss(0, 5)))
            
            # Calculate depth based on risk (0-100 risk -> 0-48 inches)
            depth = 0
            if risk > 20:
                depth = (risk - 20) * 0.6 # Simple linear mapping
                depth += random.gauss(0, 2)
                depth = max(0, depth)

            data.append([rainfall, temp, humidity, pressure, elevation, risk, depth])
            
        df = pd.DataFrame(data, columns=['rainfall', 'temperature', 'humidity', 'pressure', 'elevation', 'risk', 'depth'])
        
        X = df[['rainfall', 'temperature', 'humidity', 'pressure', 'elevation']]
        y = df[['risk', 'depth']] # Multi-output regression
        
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.model.fit(X, y)
        
        self.is_trained = True
        
        # Save model
        os.makedirs('models', exist_ok=True)
        joblib.dump(self.model, self.model_path)
        print("✅ Flood Model Trained and Saved")

    def load_model(self):
        """Load model from disk using joblib. If missing, train a mock model and save it."""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                self.is_trained = True
                print(f"✅ Loaded existing flood model from {self.model_path}")
                return
        except Exception as e:
            print(f"⚠️ Failed to load flood model from {self.model_path}: {e}")

        # If we reach here, model does not exist or failed to load -> train a mock model
        print("⚠️ Flood model not found or corrupted; training a mock model now...")
        self.train_mock_model()

    def predict_flood(self, data, lat=None, lng=None):
        """
        Predict flood risk based on input data and location
        data: dict with rainfall, temperature, humidity, pressure, elevation
        lat, lng: coordinates for location-specific elevation
        """
        # Ensure model is loaded from joblib before predicting
        if self.model is None:
            self.load_model()
        if self.model is None:
            raise RuntimeError("Flood model is not available for prediction")
        
        # Get elevation for specific location if coordinates provided
        elevation = data.get('elevation', 10)
        if lat is not None and lng is not None:
            # Add location-based variation to elevation
            # Use coordinates to add realistic variation
            import hashlib
            loc_hash = hashlib.md5(f"{lat:.4f}{lng:.4f}".encode()).hexdigest()
            loc_variation = int(loc_hash[:4], 16) % 100 - 50  # -50 to +50m variation
            elevation = max(0, elevation + loc_variation)
            
        # Prepare input
        features = np.array([[
            data.get('rainfall', 0),
            data.get('temperature', 25),
            data.get('humidity', 50),
            data.get('pressure', 1013),
            elevation
        ]])

        # Debug: print input features
        try:
            print(f"[DEBUG] predict_flood inputs -> lat={lat}, lng={lng}, features={features.tolist()}")
        except Exception:
            pass

        prediction = self.model.predict(features)[0]

        # Debug: print raw prediction
        try:
            print(f"[DEBUG] predict_flood raw prediction -> {prediction}")
        except Exception:
            pass

        risk_score = max(0, min(100, prediction[0]))
        depth_inches = max(0, prediction[1])

        return {
            'riskScore': round(risk_score, 2),
            'riskLevel': self._get_risk_level(risk_score),
            'description': self._get_risk_description(risk_score),
            'depthInches': round(depth_inches, 1),
            'elevation': round(elevation, 1)
        }

    def predict_future_risk(self, current_data, lat=None, lng=None, city_multiplier=1.0):
        """
        Predict flood risk for future scenarios (5, 10, 20 years)
        Assumes climate change increases rainfall and sea levels (effectively lowering elevation relative to sea)
        """
        # Ensure model is loaded from joblib before predicting
        if self.model is None:
            self.load_model()
        if self.model is None:
            raise RuntimeError("Flood model is not available for future prediction")
        
        # Get location-specific elevation
        elevation = current_data.get('elevation', 10)
        if lat is not None and lng is not None:
            import hashlib
            loc_hash = hashlib.md5(f"{lat:.4f}{lng:.4f}".encode()).hexdigest()
            loc_variation = int(loc_hash[:4], 16) % 100 - 50
            elevation = max(0, elevation + loc_variation)
            
        scenarios = [
            {'years': 5, 'rainfall_increase': 1.05, 'elevation_decrease': 0.5},
            {'years': 10, 'rainfall_increase': 1.10, 'elevation_decrease': 1.0},
            {'years': 20, 'rainfall_increase': 1.20, 'elevation_decrease': 2.0}
        ]
        
        future_predictions = []
        
        for scenario in scenarios:
            # Adjust data for scenario
            future_data = current_data.copy()
            # apply base rainfall increase for scenario
            future_data['rainfall'] = future_data.get('rainfall', 0) * scenario['rainfall_increase']

            # Add a small deterministic, location-based perturbation so nearby parcels differ
            if lat is not None and lng is not None:
                try:
                    import hashlib
                    loc_hash = hashlib.md5(f"{lat:.6f}{lng:.6f}".encode()).hexdigest()
                    # derive a -10%..+10% perturbation
                    loc_pct = (int(loc_hash[:4], 16) % 21 - 10) / 100.0
                    future_data['rainfall'] = future_data['rainfall'] * (1.0 + loc_pct)
                except Exception:
                    pass

            # Prevent extreme rainfall values from saturating the model (keeps predictions varied)
            # This clamps to a reasonable upper bound while preserving relative differences
            future_data['rainfall'] = min(future_data['rainfall'], 300.0)

            future_elevation = max(0, elevation - scenario['elevation_decrease'])
            
            # Predict
            features = np.array([[
                future_data['rainfall'],
                future_data.get('temperature', 25) + (scenario['years'] * 0.05), # Slight temp increase
                future_data.get('humidity', 50),
                future_data.get('pressure', 1013),
                future_elevation
            ]])

            # Debug: print scenario and features
            try:
                print(f"[DEBUG] predict_future_risk scenario={scenario['years']}y features={features.tolist()} city_multiplier={city_multiplier}")
            except Exception:
                pass

            prediction = self.model.predict(features)[0]

            # Debug: print raw prediction for future scenario
            try:
                print(f"[DEBUG] predict_future_risk raw prediction -> {prediction}")
            except Exception:
                pass

            risk_score = max(0, min(100, prediction[0]))
            # scale depth by city multiplier so city-specific vulnerability affects future depths
            depth_inches = max(0, prediction[1] * float(city_multiplier))
            
            future_predictions.append({
                'year': f"+{scenario['years']} Years",
                'riskScore': round(risk_score, 3),
                'riskLevel': self._get_risk_level(risk_score),
                'depthInches': round(depth_inches, 2)
            })
            
        return future_predictions

    def _get_risk_level(self, score):
        if score < 20: return "Low"
        if score < 50: return "Moderate"
        if score < 80: return "High"
        return "Critical"

    def _get_risk_description(self, score):
        if score < 20: return "Minimal flood risk. Standard precautions recommended."
        if score < 50: return "Moderate flood risk. Monitor weather conditions."
        if score < 80: return "High flood risk. Prepare flood mitigation measures."
        return "Critical flood risk. Immediate action required."
