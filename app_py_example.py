"""
COPY-PASTE EXAMPLE: Add Ocean Validation to app.py
===================================================

This file shows EXACTLY where to add ocean validation to your existing app.py

NO NEED to modify existing code - just add these imports and validation check.
"""

# ============================================================================
# STEP 1: Add this import at the top of app.py (with other imports)
# ============================================================================

from backend.location_validator import validate_location_for_development


# ============================================================================
# STEP 2: Find your existing /api/predict endpoint and add validation
# ============================================================================

# BEFORE (your existing code):
"""
@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    
    # Your existing ML prediction code
    result = perform_prediction(data)
    
    return jsonify(result)
"""


# AFTER (with ocean validation):
"""
@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    
    # ⭐ ADD THIS BLOCK - Ocean validation
    validation = validate_location_for_development(
        polygon=data.get('polygon'),
        check_ocean=True,
        check_protected=data.get('check_protected_areas', False),
        allow_protected=data.get('allow_protected_development', False)
    )
    
    if not validation['is_valid']:
        return jsonify({
            'success': False,
            'error': 'Location validation failed',
            'details': validation['errors'],
            'warnings': validation.get('warnings', [])
        }), 400
    # ⭐ END OF NEW CODE
    
    # Your existing ML prediction code (unchanged)
    result = perform_prediction(data)
    
    return jsonify(result)
"""


# ============================================================================
# COMPLETE EXAMPLE with all edge case handlers
# ============================================================================

"""
from flask import Flask, request, jsonify
from flask_cors import CORS

# ⭐ NEW: Add these imports
from backend.validators import validate_json
from backend.location_validator import validate_location_for_development
from backend.error_handlers import register_error_handlers

app = Flask(__name__)
CORS(app)

# ⭐ NEW: Register error handlers
register_error_handlers(app)


@app.route('/api/predict', methods=['POST'])
@validate_json(['city', 'polygon'])  # ⭐ NEW: Validate required fields
def predict():
    try:
        data = request.json
        
        # ⭐ NEW: Validate location (ocean check)
        validation = validate_location_for_development(
            polygon=data['polygon'],
            check_ocean=True,  # Always prevent ocean
            check_protected=data.get('check_protected_areas', False),
            allow_protected=data.get('allow_protected_development', False)
        )
        
        if not validation['is_valid']:
            return jsonify({
                'success': False,
                'error': 'Invalid location for development',
                'details': validation['errors'],
                'ocean_check': validation.get('ocean_check'),
                'protected_check': validation.get('protected_check')
            }), 400
        
        # Log warnings
        if validation['warnings']:
            app.logger.warning(f"Location warnings: {validation['warnings']}")
        
        # ========================================
        # YOUR EXISTING ML PREDICTION CODE HERE
        # (NO CHANGES NEEDED)
        # ========================================
        
        city = data['city']
        polygon = data['polygon']
        
        # Example: Your existing prediction logic
        prediction = your_zoning_model.predict(polygon, city)
        far_value = your_far_model.predict(polygon)
        
        # ========================================
        
        return jsonify({
            'success': True,
            'prediction': {
                'zone_type': prediction['zone'],
                'far': far_value,
                'coverage': prediction['coverage']
            },
            'warnings': validation.get('warnings', [])
        })
        
    except Exception as e:
        app.logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
"""


# ============================================================================
# WHAT HAPPENS NOW
# ============================================================================

"""
BEFORE ocean validation:
------------------------
User draws on ocean → 
Backend processes → 
ML model tries to predict → 
❌ Nonsensical results (or error)


AFTER ocean validation:
-----------------------
User draws on ocean → 
Frontend detects (1-2s) →
❌ "Location is over ocean" error shown →
User cannot proceed

OR (if user bypasses frontend):

User draws on ocean → 
Backend validates (4-5s) →
❌ 400 error: "Location is over ocean (87.5% water)" →
No ML processing wasted
"""


# ============================================================================
# TESTING YOUR IMPLEMENTATION
# ============================================================================

"""
1. Test with ocean coordinates:
   POST http://localhost:5000/api/predict
   {
     "city": "bangalore",
     "polygon": [
       [-140.0, 0.0],
       [-139.9, 0.0],
       [-139.9, 0.1],
       [-140.0, 0.1],
       [-140.0, 0.0]
     ]
   }
   
   Expected: 400 error "Location is over ocean"

2. Test with land coordinates (Bangalore):
   POST http://localhost:5000/api/predict
   {
     "city": "bangalore",
     "polygon": [
       [77.5946, 12.9716],
       [77.5956, 12.9716],
       [77.5956, 12.9726],
       [77.5946, 12.9726],
       [77.5946, 12.9716]
     ]
   }
   
   Expected: 200 success with prediction

3. Test protected area (optional):
   Include in request:
   {
     "city": "bangalore",
     "polygon": [...],
     "check_protected_areas": true,
     "allow_protected_development": false
   }
"""


# ============================================================================
# TROUBLESHOOTING
# ============================================================================

"""
Error: "Module 'location_validator' not found"
Fix: Ensure location_validator.py is in backend/ folder

Error: "Timeout checking location"  
Fix: Normal - validation continues (doesn't block on timeout)

Error: "requests module not found"
Fix: pip install requests (should already be in requirements.txt)

Warning: "Nominatim rate limit"
Fix: Built-in 0.5s delays handle this

False positive: Land detected as ocean
Fix: Increase sample points:
     is_polygon_over_ocean(polygon, sample_points=10)
"""


# ============================================================================
# MINIMAL INTEGRATION (Just ocean check, no extras)
# ============================================================================

"""
Absolute minimum code to add:

# Import
from backend.location_validator import validate_location_for_development

# In predict endpoint (before ML processing):
validation = validate_location_for_development(data['polygon'], check_ocean=True)
if not validation['is_valid']:
    return jsonify({'error': validation['errors'][0]}), 400

That's it! 3 lines of code.
"""


if __name__ == "__main__":
    print("=" * 70)
    print("OCEAN VALIDATION - COPY-PASTE GUIDE")
    print("=" * 70)
    print("\n1. Add import: from backend.location_validator import ...")
    print("2. Add validation block before ML prediction")
    print("3. Test with ocean coordinates")
    print("\nSee LOCATION_VALIDATION.md for complete guide")
    print("=" * 70)
