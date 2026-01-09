"""
Test script for Lightning Prediction Model
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from models.lightning_model import LightningPredictor

def test_lightning_prediction():
    print("=" * 60)
    print("Testing Lightning Prediction Model")
    print("=" * 60)
    
    # Test locations
    test_cases = [
        {"city": "Bangalore", "lat": 12.9716, "lng": 77.5946, "building": "commercial"},
        {"city": "Mumbai", "lat": 19.0760, "lng": 72.8777, "building": "residential"},
        {"city": "Delhi", "lat": 28.7041, "lng": 77.1025, "building": "mixed"},
    ]
    
    predictor = LightningPredictor()
    
    for test in test_cases:
        print(f"\n{'='*60}")
        print(f"Testing: {test['city']} ({test['lat']}, {test['lng']})")
        print(f"Building Type: {test['building']}")
        print(f"{'='*60}")
        
        result = predictor.predict_risk(
            lat=test['lat'],
            lng=test['lng'],
            city_name=test['city'],
            building_type=test['building']
        )
        
        print(f"\n📊 Results:")
        print(f"   Risk Level: {result['level']}")
        print(f"   Probability: {result['probability']}%")
        print(f"   Lightning Density: {result['lightningDensity']} flashes/km²/year")
        print(f"   Annual Strikes: {result['annualStrikes']}")
        print(f"   Method: {result['prediction_method']}")
        print(f"   Recommendation: {result['recommendation']}")
        print(f"   Warnings:")
        for warning in result['warnings']:
            print(f"      - {warning}")
    
    print(f"\n{'='*60}")
    print("✅ Testing Complete!")
    print(f"{'='*60}")

if __name__ == "__main__":
    test_lightning_prediction()
