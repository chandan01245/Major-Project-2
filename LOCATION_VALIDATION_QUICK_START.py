"""
Quick Reference: Location Validation Implementation
====================================================

OCEAN DETECTION - Prevent users from generating reports on water
"""

# ============================================================================
# BACKEND EXAMPLE - Add to app.py predict endpoint
# ============================================================================

from flask import Flask, request, jsonify
from backend.location_validator import validate_location_for_development
from backend.validators import validate_json

app = Flask(__name__)

@app.route('/api/predict', methods=['POST'])
@validate_json(['city', 'polygon'])
def predict():
    """
    Generate urban development prediction.
    Now includes ocean detection to prevent water locations.
    """
    try:
        data = request.json
        
        # ⭐ CRITICAL: Validate location before processing
        validation = validate_location_for_development(
            polygon=data['polygon'],
            check_ocean=True,  # ✅ Always True - prevents ocean locations
            check_protected=data.get('check_protected_areas', False),
            allow_protected=data.get('allow_protected_development', False)
        )
        
        # Block if invalid location
        if not validation['is_valid']:
            return jsonify({
                'success': False,
                'error': 'Invalid location for development',
                'details': validation['errors'],
                'ocean_check': validation.get('ocean_check'),
                'protected_check': validation.get('protected_check')
            }), 400
        
        # Log warnings (e.g., protected areas with allow flag)
        if validation['warnings']:
            app.logger.warning(f"Location warnings: {validation['warnings']}")
        
        # YOUR EXISTING PREDICTION CODE HERE
        # ...
        prediction = your_ml_model.predict(data)
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'warnings': validation.get('warnings', [])
        })
        
    except Exception as e:
        app.logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================================================
# FRONTEND EXAMPLE - Check before submitting
# ============================================================================

"""
import {
  validateLocationForDevelopment,
  showLocationValidationError
} from './utils/locationValidator';
import { safeFetch } from './utils/apiErrorHandler';

async function generateReport(polygon, city) {
  try {
    // ⭐ Step 1: Quick client-side ocean check
    const validation = await validateLocationForDevelopment(
      { polygon },
      { checkOcean: true }
    );

    if (!validation.isValid) {
      // Show error to user
      showLocationValidationError(validation);
      return;
    }

    // ⭐ Step 2: Send to backend (will do thorough validation)
    const response = await safeFetch('http://localhost:5000/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: city,
        polygon: polygon,
        check_protected_areas: false  // Optional
      })
    });

    const result = await response.json();

    if (!result.success) {
      // Backend validation failed
      if (result.details) {
        alert('Location Error:\\n' + result.details.join('\\n'));
      }
      return;
    }

    // Success - display report
    displayReport(result.prediction);

  } catch (error) {
    console.error('Report generation failed:', error);
    alert('Failed to generate report');
  }
}


// ⭐ BONUS: Check immediately when user draws polygon
map.on('draw.create', async function(e) {
  const polygon = e.features[0].geometry.coordinates[0];
  
  const validation = await checkPolygonLocation(polygon, {
    checkOcean: true
  });

  if (!validation.isValid) {
    // Remove the polygon immediately
    draw.delete(e.features[0].id);
    
    // Show error
    alert('⚠️ Cannot select ocean area\\n\\n' + validation.errors.join('\\n'));
    return;
  }

  // Valid - save polygon
  setSelectedPolygon(polygon);
});
"""


# ============================================================================
# CONFIGURATION OPTIONS
# ============================================================================

"""
Backend Options:
----------------
validate_location_for_development(
    polygon=polygon,              # Required: List of [lon, lat] coordinates
    check_ocean=True,             # Recommended: Always True
    check_protected=False,        # Optional: Check national parks
    allow_protected=False         # Optional: Allow with warnings
)

Returns:
{
    'is_valid': bool,             # True if location can be used
    'errors': List[str],          # Blocking errors (e.g., ocean)
    'warnings': List[str],        # Non-blocking warnings
    'ocean_check': {
        'is_ocean': bool,
        'percentage_ocean': float,
        'ocean_points': int,
        'total_points': int
    },
    'protected_check': {
        'is_protected': bool,
        'count': int,
        'areas': List[Dict]
    }
}
"""


# ============================================================================
# ERROR MESSAGES
# ============================================================================

# Ocean Detection - User sees:
"""
❌ Location Validation Failed:

• Location is over ocean (75.0% water). Urban development 
  reports can only be generated for land areas.

Please select a different location on land.
"""

# Protected Area - User sees (if check_protected=True, allow_protected=False):
"""
❌ Location Validation Failed:

• Location overlaps with 1 protected area(s): 
  Yellowstone National Park

Please select a different location.
"""

# Protected Area Warning - User sees (if allow_protected=True):
"""
⚠️ Location Warning:

• Location overlaps with Heritage Conservation Area 
  (Development report will include preservation considerations)

Report generated with preservation constraints.
"""


# ============================================================================
# TESTING
# ============================================================================

# Test ocean detection:
def test_ocean():
    from backend.location_validator import is_location_over_ocean
    
    # Should return True (Pacific Ocean)
    assert is_location_over_ocean(0.0, -140.0) == True
    
    # Should return False (New York)
    assert is_location_over_ocean(40.7128, -74.0060) == False
    
    print("✅ Ocean detection working")


# Test polygon validation:
def test_polygon():
    from backend.location_validator import validate_location_for_development
    
    # Ocean polygon (should fail)
    ocean_polygon = [
        [-140.0, 0.0],
        [-139.9, 0.0],
        [-139.9, 0.1],
        [-140.0, 0.1],
        [-140.0, 0.0]
    ]
    
    result = validate_location_for_development(ocean_polygon, check_ocean=True)
    assert result['is_valid'] == False
    assert 'ocean' in result['errors'][0].lower()
    
    print("✅ Polygon validation working")


# ============================================================================
# TROUBLESHOOTING
# ============================================================================

"""
Issue: "Timeout checking location"
Solution: Increase timeout or handle gracefully
- Validation allows requests on timeout (doesn't block)
- Increase timeout: is_location_over_ocean(lat, lon, timeout=20)

Issue: "False positive - land detected as ocean"
Solution: Adjust sample points
- Increase sample_points: is_polygon_over_ocean(polygon, sample_points=10)

Issue: "API rate limit"
Solution: Add delays
- Built-in: 0.5s delay between point checks
- Nominatim limit: 1 req/sec (we respect this)

Issue: "Protected area check too slow"
Solution: Make it optional
- Default: check_protected=False
- User can enable via toggle in UI
"""


# ============================================================================
# DEPLOYMENT CHECKLIST
# ============================================================================

"""
Backend:
[ ] ✅ location_validator.py exists in backend/
[ ] ✅ Import added to app.py
[ ] ✅ Validation added to predict endpoint
[ ] ✅ check_ocean=True set
[ ] ⚠️ Error responses tested
[ ] ⚠️ Logging configured

Frontend:
[ ] ✅ locationValidator.js exists in src/utils/
[ ] ✅ Import in prediction component
[ ] ✅ Pre-validation before API call
[ ] ⚠️ Polygon draw validation
[ ] ⚠️ User-friendly error messages
[ ] ⚠️ Optional: Protected areas toggle

Testing:
[ ] ⚠️ Test with ocean coordinates
[ ] ⚠️ Test with land coordinates
[ ] ⚠️ Test with coastal polygon (part water)
[ ] ⚠️ Test error message display
[ ] ⚠️ Test timeout handling
[ ] ⚠️ Test protected area detection (optional)
"""


# ============================================================================
# SUMMARY
# ============================================================================

"""
WHAT IT DOES:
✅ Prevents users from selecting ocean/water areas
✅ Validates polygon is on land before ML prediction
✅ Optional: Checks for national parks/protected areas
✅ Provides clear error messages to users

HOW IT WORKS:
1. Client-side: Quick check on polygon centroid (Nominatim)
2. Backend: Thorough check on multiple polygon points
3. Uses reverse geocoding to detect land vs water
4. Samples 5+ points across polygon for accuracy

PERFORMANCE:
- Client check: ~1-2 seconds
- Backend check: ~4-5 seconds (5 points × 0.5s delay)
- Cached results for repeated locations
- Non-blocking on API errors

INTEGRATION:
- Backend: 3 lines of code in predict endpoint
- Frontend: 5 lines before API call
- Zero breaking changes to existing code
"""


if __name__ == "__main__":
    print("=" * 60)
    print("LOCATION VALIDATION - QUICK REFERENCE")
    print("=" * 60)
    print("\n✅ Prevents ocean locations")
    print("✅ Optional protected area checks")
    print("✅ User-friendly error messages")
    print("\nSee LOCATION_VALIDATION.md for full guide")
    print("=" * 60)
