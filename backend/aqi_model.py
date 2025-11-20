import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from datetime import datetime, timedelta
import random

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

    def predict_future(self, current_aqi, days=30):
        """Predict AQI for next N days"""
        if not self.is_trained:
            self.train_mock_model()
            
        predictions = []
        current_seq = np.array([[current_aqi] for _ in range(self.sequence_length)]) # Initialize with current
        current_seq = current_seq.reshape(1, self.sequence_length, 1)
        
        # Add some randomness to initial sequence to make it look realistic
        for i in range(self.sequence_length):
            current_seq[0][i][0] += random.gauss(0, 10)

        for _ in range(days):
            pred = self.model.predict(current_seq, verbose=0)[0][0]
            # Add noise for realism
            pred += random.gauss(0, 5)
            pred = max(0, pred) # AQI can't be negative
            
            predictions.append(int(pred))
            
            # Update sequence: remove first, add prediction
            new_seq = np.roll(current_seq, -1, axis=1)
            new_seq[0][-1][0] = pred
            current_seq = new_seq
            
        return predictions

    def get_lightning_risk(self, city, building_type):
        """Get lightning risk warning"""
        high_risk_cities = ['bangalore', 'kolkata', 'ranchi', 'bhubaneswar']
        high_risk_types = ['commercial', 'mixed'] # Taller buildings
        
        risk_level = "Low"
        warning = None
        
        if city.lower() in high_risk_cities:
            risk_level = "Moderate"
            if building_type in high_risk_types:
                risk_level = "High"
                warning = "⚠️ High Lightning Risk Area. Install advanced lightning protection systems (LPS) as per IS/IEC 62305."
            else:
                warning = "⚠️ Moderate Lightning Risk. Basic lightning protection recommended."
        
        return {
            'riskLevel': risk_level,
            'warning': warning
        }

import math
