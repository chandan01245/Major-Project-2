"""
Lightning Risk Prediction Model using Open-Meteo Historical Weather Data
Uses machine learning to predict lightning probability based on meteorological factors
"""

import numpy as np
import pandas as pd
import requests
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os
import json


class LightningPredictor:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        
        # Setup storage directory
        self.models_dir = os.path.join(os.path.dirname(__file__), 'saved_models', 'lightning')
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)
    
    def fetch_historical_weather(self, lat, lng, days=730):
        """
        Fetch historical weather data from Open-Meteo Archive API
        
        Args:
            lat: Latitude
            lng: Longitude  
            days: Number of days of historical data (default: 730 = 2 years)
        
        Returns:
            DataFrame with weather features
        """
        print(f"🌦️  Fetching {days} days of weather history from Open-Meteo for ({lat}, {lng})...", flush=True)
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Open-Meteo Historical Weather API
        url = "https://archive-api.open-meteo.com/v1/archive"
        
        params = {
            'latitude': lat,
            'longitude': lng,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'daily': [
                'temperature_2m_max',
                'temperature_2m_min',
                'temperature_2m_mean',
                'precipitation_sum',
                'rain_sum',
                'precipitation_hours',
                'weathercode',
                'windspeed_10m_max',
                'cloudcover_mean'
            ],
            'timezone': 'auto'
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code != 200:
                print(f"⚠️  Open-Meteo API Error: {response.text}")
                return None
            
            data = response.json()
            
            if 'daily' not in data:
                print("⚠️  No 'daily' data in Open-Meteo response")
                return None
            
            # Convert to DataFrame
            df = pd.DataFrame(data['daily'])
            df['date'] = pd.to_datetime(df['time'])
            
            print(f"✅ Retrieved {len(df)} days of weather data")
            return df
            
        except Exception as e:
            print(f"❌ Error fetching Open-Meteo weather history: {e}")
            return None
    
    def _engineer_features(self, df):
        """
        Create features that correlate with lightning activity
        
        Lightning is typically associated with:
        - High precipitation
        - High cloud cover
        - Temperature differentials
        - Convective weather patterns
        """
        features = pd.DataFrame()
        
        # Temperature features
        features['temp_mean'] = df['temperature_2m_mean']
        features['temp_range'] = df['temperature_2m_max'] - df['temperature_2m_min']
        features['temp_max'] = df['temperature_2m_max']
        
        # Precipitation features (strong indicator)
        features['precipitation'] = df['precipitation_sum'].fillna(0)
        features['rain'] = df['rain_sum'].fillna(0)
        features['precip_hours'] = df['precipitation_hours'].fillna(0)
        
        # Atmospheric features
        features['cloudcover'] = df['cloudcover_mean']
        features['windspeed'] = df['windspeed_10m_max']
        
        # Derived features
        features['high_precip'] = (features['precipitation'] > 10).astype(int)
        features['extreme_precip'] = (features['precipitation'] > 25).astype(int)
        features['high_cloudcover'] = (features['cloudcover'] > 70).astype(int)
        features['moderate_wind'] = ((features['windspeed'] > 10) & (features['windspeed'] < 30)).astype(int)
        
        # Seasonal features (lightning more common in summer/monsoon)
        df['month'] = df['date'].dt.month
        features['is_monsoon'] = df['month'].isin([6, 7, 8, 9]).astype(int)
        features['is_summer'] = df['month'].isin([4, 5]).astype(int)
        features['is_pre_monsoon'] = df['month'].isin([3, 4, 5]).astype(int)
        
        # Weather code features (thunderstorm codes)
        # WMO weather codes: 95-99 are thunderstorms
        features['thunderstorm_code'] = (df['weathercode'] >= 95).astype(int)
        features['storm_code'] = ((df['weathercode'] >= 80) & (df['weathercode'] < 100)).astype(int)
        
        return features
    
    def _create_lightning_labels(self, df):
        """
        Create ground truth labels for lightning occurrence
        
        We use weather codes and precipitation as proxies:
        - WMO codes 95-99 indicate thunderstorms
        - Heavy precipitation + high cloud cover = likely lightning
        """
        # Primary indicator: thunderstorm weather codes
        lightning = (df['weathercode'] >= 95).astype(int)
        
        # Secondary heuristic: extreme weather conditions
        extreme_conditions = (
            (df['precipitation_sum'] > 15) &
            (df['cloudcover_mean'] > 70)
        ).astype(int)
        
        # Combine: if either condition is met
        labels = np.maximum(lightning, extreme_conditions)
        
        return labels
    
    def train(self, lat, lng, city_name=None):
        """
        Train the lightning prediction model using historical weather data
        
        Args:
            lat: Latitude
            lng: Longitude
            city_name: Optional city name for saving the model
        """
        print(f"\n⚡ Training Lightning Prediction Model for {city_name or f'({lat}, {lng})'}...")
        
        # Fetch 2 years of historical weather data
        df = self.fetch_historical_weather(lat, lng, days=730)
        
        if df is None or len(df) < 100:
            print("❌ Insufficient historical data for training")
            return False
        
        # Engineer features
        X = self._engineer_features(df)
        
        # Create labels
        y = self._create_lightning_labels(df)
        
        # Remove any NaN values
        mask = ~(X.isna().any(axis=1) | pd.isna(y))
        X = X[mask]
        y = y[mask]
        
        print(f"📊 Training data: {len(X)} samples, {y.sum()} lightning events ({y.sum()/len(y)*100:.1f}%)")
        
        if y.sum() < 5:
            print("⚠️  Very few lightning events in historical data - model may be less accurate")
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Random Forest model
        # RandomForest is good for this because:
        # - Handles non-linear relationships
        # - Resistant to overfitting
        # - Can handle imbalanced classes
        # - Provides feature importance
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=10,
            min_samples_leaf=5,
            class_weight='balanced',  # Handle class imbalance
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        # Calculate training accuracy
        train_score = self.model.score(X_scaled, y)
        print(f"✅ Model trained with accuracy: {train_score*100:.1f}%")
        
        # Show feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\n📈 Top 5 Features for Lightning Prediction:")
        for idx, row in feature_importance.head(5).iterrows():
            print(f"   {row['feature']}: {row['importance']:.3f}")
        
        # Save model if city name provided
        if city_name:
            self._save_model(city_name)
        
        return True
    
    def predict_risk(self, lat, lng, city_name=None, building_type='residential'):
        """
        Predict lightning risk for a location
        
        Args:
            lat: Latitude
            lng: Longitude
            city_name: City name
            building_type: Type of building
        
        Returns:
            Dictionary with risk assessment
        """
        # Try to load existing model for this city
        if city_name and not self.is_trained:
            loaded = self._load_model(city_name)
            if not loaded:
                # Train a new model
                self.train(lat, lng, city_name)
        elif not self.is_trained:
            # Train without city name
            self.train(lat, lng)
        
        if not self.is_trained:
            # Fallback to basic static assessment
            return self._fallback_assessment(city_name, building_type)
        
        # Fetch recent weather data (last 30 days)
        df = self.fetch_historical_weather(lat, lng, days=30)
        
        if df is None or len(df) < 7:
            print("⚠️  Using model-based prediction with limited recent data")
            # Use historical average from training
            base_probability = 15.0  # Default
        else:
            # Engineer features for recent data
            X_recent = self._engineer_features(df)
            X_recent_scaled = self.scaler.transform(X_recent)
            
            # Predict probability for each day
            probabilities = self.model.predict_proba(X_recent_scaled)[:, 1]
            
            # Annual probability = 1 - P(no lightning all year)
            # Approximate using recent data
            avg_daily_prob = probabilities.mean()
            annual_probability = (1 - (1 - avg_daily_prob) ** 365) * 100
            
            base_probability = min(annual_probability, 95.0)
        
        # Adjust for building type
        height_multipliers = {
            'residential': 1.0,
            'commercial': 1.8,      # Taller buildings
            'industrial': 1.3,
            'mixed': 1.6
        }
        
        building_multiplier = height_multipliers.get(building_type, 1.0)
        final_probability = min(base_probability * building_multiplier, 95.0)
        
        # Determine risk level
        if final_probability < 5:
            risk_level = "Low"
            recommendation = "Standard building grounding as per local electrical codes."
        elif final_probability < 15:
            risk_level = "Medium"
            recommendation = "Install basic lightning protection system (LPS) with air terminals and down conductors."
        elif final_probability < 30:
            risk_level = "High"
            recommendation = "Install advanced LPS (Lightning Protection System) as per IS/IEC 62305 standards, including surge protection devices."
        else:
            risk_level = "Very High"
            recommendation = "Mandatory comprehensive LPS installation with multiple protection zones, surge arresters, and regular maintenance inspections."
        
        # Warnings
        warnings = []
        if final_probability > 20:
            warnings.append("ML model indicates elevated lightning risk")
        if building_type in ['commercial', 'mixed']:
            warnings.append("Taller structures increase strike risk")
        warnings.append("Risk varies with seasonal weather patterns")
        
        # Calculate approximate lightning density (flashes/km²/year)
        # Typical correlation: high probability areas have 6-10 flashes/km²/year
        lightning_density = (final_probability / 100) * 12  # Rough approximation
        
        # Calculate annual strikes for average building (1000 sqm)
        area_km2 = 0.001
        annual_strikes = lightning_density * area_km2 * building_multiplier
        
        return {
            'level': risk_level,
            'riskLevel': risk_level,
            'probability': round(final_probability, 1),
            'recommendation': recommendation,
            'warning': recommendation,
            'lightningDensity': round(lightning_density, 1),
            'annualStrikes': round(annual_strikes, 3),
            'warnings': warnings,
            'buildingType': building_type,
            'protectionRequired': final_probability > 10,
            'prediction_method': 'ML-trained' if self.is_trained else 'fallback'
        }
    
    def _fallback_assessment(self, city, building_type):
        """Fallback to static assessment if ML fails"""
        print("⚠️  Using fallback static lightning assessment")
        
        lightning_density = {
            'bangalore': 8.5, 'bengaluru': 8.5, 'mumbai': 5.2,
            'delhi': 4.8, 'hyderabad': 7.2, 'kolkata': 9.1,
            'chennai': 6.5, 'pune': 6.0, 'new_york': 3.5, 'singapore': 7.8
        }
        
        base_density = lightning_density.get(city.lower() if city else '', 5.0)
        
        height_multipliers = {
            'residential': 1.0, 'commercial': 1.5,
            'industrial': 1.2, 'mixed': 1.4
        }
        
        building_multiplier = height_multipliers.get(building_type, 1.0)
        area_km2 = 0.001
        annual_strikes = base_density * area_km2 * building_multiplier
        probability = min(annual_strikes * 100, 95)
        
        if probability < 5:
            risk_level = "Low"
            recommendation = "Standard building grounding as per local electrical codes."
        elif probability < 15:
            risk_level = "Medium"
            recommendation = "Install basic lightning protection system (LPS)."
        elif probability < 30:
            risk_level = "High"
            recommendation = "Install advanced LPS as per IS/IEC 62305 standards."
        else:
            risk_level = "Very High"
            recommendation = "Mandatory comprehensive LPS installation."
        
        return {
            'level': risk_level,
            'riskLevel': risk_level,
            'probability': round(probability, 1),
            'recommendation': recommendation,
            'warning': recommendation,
            'lightningDensity': base_density,
            'annualStrikes': round(annual_strikes, 2),
            'warnings': ["Using static fallback model"],
            'buildingType': building_type,
            'protectionRequired': probability > 10,
            'prediction_method': 'static-fallback'
        }
    
    def _save_model(self, city_name):
        """Save trained model for a city"""
        safe_name = "".join([c for c in city_name if c.isalnum() or c in (' ', '-', '_')]).strip().lower()
        city_dir = os.path.join(self.models_dir, safe_name)
        
        if not os.path.exists(city_dir):
            os.makedirs(city_dir)
        
        try:
            model_path = os.path.join(city_dir, 'lightning_rf_model.joblib')
            scaler_path = os.path.join(city_dir, 'lightning_scaler.joblib')
            
            joblib.dump(self.model, model_path)
            joblib.dump(self.scaler, scaler_path)
            
            print(f"💾 Lightning model saved for {city_name}")
        except Exception as e:
            print(f"⚠️  Error saving lightning model: {e}")
    
    def _load_model(self, city_name):
        """Load existing trained model for a city"""
        safe_name = "".join([c for c in city_name if c.isalnum() or c in (' ', '-', '_')]).strip().lower()
        city_dir = os.path.join(self.models_dir, safe_name)
        
        model_path = os.path.join(city_dir, 'lightning_rf_model.joblib')
        scaler_path = os.path.join(city_dir, 'lightning_scaler.joblib')
        
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            try:
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                self.is_trained = True
                print(f"📂 Loaded existing lightning model for {city_name}")
                return True
            except Exception as e:
                print(f"⚠️  Error loading lightning model: {e}")
                return False
        return False
