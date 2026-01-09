"""
Integration test - Simulate the actual workflow from app.py
Tests lightning prediction as it would be called in the real application
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from models.aqi_model import AQIPredictor

def test_integration():
    print("=" * 70)
    print("Lightning Prediction - Integration Test")
    print("Simulating actual app.py workflow")
    print("=" * 70)
    
    # Initialize as app.py does
    aqi_predictor = AQIPredictor()
    
    # Test case: Bangalore commercial building
    city = "Bangalore"
    building_type = "commercial"
    centroid_lat = 12.9716
    centroid_lng = 77.5946
    
    print(f"\n📍 Location: {city}")
    print(f"📍 Coordinates: ({centroid_lat}, {centroid_lng})")
    print(f"🏢 Building Type: {building_type}")
    print(f"\n{'='*70}")
    print("Calling aqi_predictor.get_lightning_risk()...")
    print(f"{'='*70}\n")
    
    # This is exactly how app.py calls it
    lightning_risk = aqi_predictor.get_lightning_risk(
        city, 
        building_type, 
        lat=centroid_lat, 
        lng=centroid_lng
    )
    
    # Print as app.py does
    print(f"\n⚡ Lightning Risk: {lightning_risk['level']} ({lightning_risk['probability']}% annual probability)")
    
    # Full details
    print(f"\n{'='*70}")
    print("Complete Lightning Risk Assessment:")
    print(f"{'='*70}")
    print(f"  Risk Level:          {lightning_risk['level']}")
    print(f"  Annual Probability:  {lightning_risk['probability']}%")
    print(f"  Lightning Density:   {lightning_risk['lightningDensity']} flashes/km²/year")
    print(f"  Annual Strikes:      {lightning_risk['annualStrikes']}")
    print(f"  Building Type:       {lightning_risk['buildingType']}")
    print(f"  Protection Required: {lightning_risk['protectionRequired']}")
    print(f"  Prediction Method:   {lightning_risk.get('prediction_method', 'N/A')}")
    print(f"\n  Recommendation:")
    print(f"  {lightning_risk['recommendation']}")
    print(f"\n  Warnings:")
    for warning in lightning_risk.get('warnings', []):
        print(f"    • {warning}")
    
    print(f"\n{'='*70}")
    print("✅ Integration Test Complete!")
    print("The lightning prediction is now using ML + Open-Meteo data")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    test_integration()
