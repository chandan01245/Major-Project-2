# Location Validation Guide

## Overview

Location validation prevents users from generating urban development reports for:
1. **Ocean areas** ✅ (Required - Always enforced)
2. **Protected areas** 🔧 (Optional - Can be toggled on/off)

---

## Backend Integration

### 1. Import the validator in your route file

```python
from backend.location_validator import validate_location_for_development
```

### 2. Add validation to the `/api/predict` endpoint

```python
@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    polygon = data.get('polygon', [])
    
    # Optional: Get settings from request
    check_protected = data.get('check_protected_areas', False)
    allow_protected = data.get('allow_protected_development', False)
    
    # Validate location
    validation = validate_location_for_development(
        polygon=polygon,
        check_ocean=True,  # Always check ocean
        check_protected=check_protected,
        allow_protected=allow_protected
    )
    
    if not validation['is_valid']:
        return jsonify({
            'error': 'Location validation failed',
            'details': validation['errors'],
            'warnings': validation.get('warnings', [])
        }), 400
    
    # Log warnings if any
    if validation['warnings']:
        for warning in validation['warnings']:
            logger.warning(warning)
    
    # Continue with your existing prediction logic
    # ...
```

### 3. Full integration example

```python
from flask import Flask, request, jsonify
from backend.location_validator import validate_location_for_development
from backend.validators import validate_json

app = Flask(__name__)

@app.route('/api/predict', methods=['POST'])
@validate_json(['city', 'polygon'])
def predict():
    try:
        data = request.json
        polygon = data.get('polygon')
        city = data.get('city')
        
        # Location validation
        validation = validate_location_for_development(
            polygon=polygon,
            check_ocean=True,
            check_protected=data.get('check_protected_areas', False),
            allow_protected=data.get('allow_protected_development', False)
        )
        
        if not validation['is_valid']:
            return jsonify({
                'success': False,
                'error': 'Invalid location',
                'errors': validation['errors'],
                'warnings': validation.get('warnings', []),
                'ocean_check': validation.get('ocean_check'),
                'protected_check': validation.get('protected_check')
            }), 400
        
        # Your existing ML prediction code
        # ...
        
        response = {
            'success': True,
            'prediction': prediction_result,
            'warnings': validation.get('warnings', [])
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500
```

---

## Frontend Integration

### 1. Import the validator

```javascript
import {
  checkPolygonLocation,
  validateLocationForDevelopment,
  showLocationValidationError
} from './utils/locationValidator';
```

### 2. Validate before API call

```javascript
async function handlePredictRequest(formData) {
  // Quick client-side check
  const validation = await validateLocationForDevelopment(formData, {
    checkOcean: true,
    checkProtected: false  // Backend will do full check
  });

  if (!validation.isValid) {
    // Show error to user
    showLocationValidationError(validation);
    return;
  }

  // Show warnings if any
  if (validation.warnings.length > 0) {
    console.warn('Location warnings:', validation.warnings);
  }

  // Proceed with API call
  try {
    const response = await fetch('http://localhost:5000/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle backend validation errors
      if (result.errors) {
        alert('Location Error:\n' + result.errors.join('\n'));
      }
      return;
    }

    // Success - show result
    displayPrediction(result);

  } catch (error) {
    console.error('Prediction error:', error);
    alert('Failed to generate prediction');
  }
}
```

### 3. Check location on polygon draw

```javascript
// When user completes drawing polygon on map
map.on('draw.create', async function(e) {
  const polygon = e.features[0].geometry.coordinates[0];
  
  // Immediate feedback
  const validation = await checkPolygonLocation(polygon, {
    checkOcean: true
  });

  if (!validation.isValid) {
    // Remove the drawn polygon
    draw.delete(e.features[0].id);
    
    // Show error
    alert(validation.errors.join('\n'));
    return;
  }

  // Polygon is valid
  setSelectedPolygon(polygon);
});
```

### 4. Add toggle for protected areas

```javascript
function SettingsPanel() {
  const [checkProtectedAreas, setCheckProtectedAreas] = useState(false);
  const [allowProtectedDev, setAllowProtectedDev] = useState(false);

  return (
    <div className="settings-panel">
      <label>
        <input
          type="checkbox"
          checked={checkProtectedAreas}
          onChange={(e) => setCheckProtectedAreas(e.target.checked)}
        />
        Check for protected areas (national parks, reserves)
      </label>

      {checkProtectedAreas && (
        <label className="sub-option">
          <input
            type="checkbox"
            checked={allowProtectedDev}
            onChange={(e) => setAllowProtectedDev(e.target.checked)}
          />
          Allow development with preservation considerations
        </label>
      )}
    </div>
  );
}
```

---

## API Response Format

### Success Response

```json
{
  "success": true,
  "prediction": {
    "zone_type": "Residential",
    "far": 2.5,
    "building_coverage": 45
  },
  "warnings": [
    "Location overlaps with Heritage Conservation Area (Development report includes preservation considerations)"
  ]
}
```

### Ocean Error Response

```json
{
  "success": false,
  "error": "Invalid location",
  "errors": [
    "Location is over ocean (87.5% water). Urban development reports can only be generated for land areas."
  ],
  "ocean_check": {
    "is_ocean": true,
    "ocean_points": 7,
    "total_points": 8,
    "percentage_ocean": 87.5
  }
}
```

### Protected Area Error Response

```json
{
  "success": false,
  "error": "Invalid location",
  "errors": [
    "Location overlaps with 2 protected area(s): Yellowstone National Park, Grand Teton National Park"
  ],
  "protected_check": {
    "is_protected": true,
    "count": 2,
    "areas": [
      {
        "name": "Yellowstone National Park",
        "type": "national_park",
        "protect_class": "2"
      },
      {
        "name": "Grand Teton National Park",
        "type": "national_park",
        "protect_class": "2"
      }
    ]
  }
}
```

---

## Configuration Options

### Backend Options

```python
validate_location_for_development(
    polygon=polygon,           # Required: List of [lon, lat]
    check_ocean=True,          # Default: True (recommended)
    check_protected=False,     # Default: False
    allow_protected=False      # Default: False
)
```

### Frontend Options

```javascript
validateLocationForDevelopment(requestData, {
  checkOcean: true,      // Default: true
  checkProtected: false  // Default: false (backend does full check)
})
```

---

## Error Messages

### User-Friendly Messages

**Ocean Detection:**
- ✅ "Selected location appears to be over ocean. Please select a land area for urban development analysis."
- ✅ "Location is over ocean (75.0% water). Urban development reports can only be generated for land areas."

**Protected Areas:**
- ⚠️ "Location overlaps with Heritage Conservation Area (Development report will include preservation considerations)"
- ❌ "Location overlaps with Yellowstone National Park. Development is not allowed in this protected area."

---

## Performance Considerations

### API Rate Limits

**Nominatim (Ocean Check):**
- Rate limit: 1 request/second
- Implementation: 0.5s delay between points
- For 8 sample points: ~4 seconds total

**Overpass API (Protected Areas):**
- Rate limit: Varies by server load
- Timeout: 15 seconds
- Cached results recommended

### Optimization Tips

1. **Client-side pre-check**: Quick centroid check before backend validation
2. **Caching**: Cache validation results for the same location
3. **Batch validation**: Validate once per polygon, not per edit
4. **Async processing**: Don't block UI during validation

---

## Testing

### Test Ocean Detection

```python
# Test in Python
from backend.location_validator import is_location_over_ocean

# Ocean location
print(is_location_over_ocean(0.0, -140.0))  # True (Pacific Ocean)

# Land location
print(is_location_over_ocean(40.7128, -74.0060))  # False (New York)
```

### Test Polygon Validation

```python
from backend.location_validator import validate_location_for_development

# New York polygon (land)
ny_polygon = [
    [-74.0060, 40.7128],
    [-74.0050, 40.7128],
    [-74.0050, 40.7138],
    [-74.0060, 40.7138],
    [-74.0060, 40.7128]
]

result = validate_location_for_development(
    polygon=ny_polygon,
    check_ocean=True,
    check_protected=True
)

print("Valid:", result['is_valid'])
print("Errors:", result['errors'])
print("Warnings:", result['warnings'])
```

### Frontend Testing

```javascript
// Test in browser console
import { quickOceanCheck } from './utils/locationValidator';

// Ocean
quickOceanCheck(0, -140).then(console.log);

// Land
quickOceanCheck(40.7128, -74.0060).then(console.log);
```

---

## Troubleshooting

### Issue: "Timeout checking location"

**Solution**: Increase timeout or skip validation on timeout
```python
# In location_validator.py, adjust timeout
response = requests.get(url, timeout=20)  # Increase from 10 to 20
```

### Issue: "Rate limit exceeded"

**Solution**: Add delays or implement caching
```python
import time
time.sleep(1)  # Wait 1 second between requests
```

### Issue: False positives (land detected as ocean)

**Solution**: Adjust sampling or use multiple validation points
```python
ocean_check = is_polygon_over_ocean(polygon, sample_points=10)
```

---

## Production Checklist

- [ ] Ocean validation enabled on all prediction endpoints
- [ ] User-friendly error messages configured
- [ ] Frontend pre-validation implemented
- [ ] Protected area toggle added to UI (if desired)
- [ ] Error logging configured
- [ ] Rate limiting respected (Nominatim, Overpass)
- [ ] Timeout handling tested
- [ ] Cache implemented for repeated locations
- [ ] User notifications tested (alerts, toasts)
- [ ] Documentation updated

---

## Examples

### Complete React Component Example

```javascript
import React, { useState } from 'react';
import { validateLocationForDevelopment, showLocationValidationError } from './utils/locationValidator';
import { safeFetch } from './utils/apiErrorHandler';

function PredictionForm() {
  const [polygon, setPolygon] = useState(null);
  const [checkProtected, setCheckProtected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!polygon) {
      alert('Please draw a polygon on the map');
      return;
    }

    setLoading(true);

    try {
      // Client-side validation
      const validation = await validateLocationForDevelopment(
        { polygon },
        { checkOcean: true }
      );

      if (!validation.isValid) {
        showLocationValidationError(validation);
        setLoading(false);
        return;
      }

      // Backend request
      const response = await safeFetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'bangalore',
          polygon: polygon,
          check_protected_areas: checkProtected
        })
      });

      const result = await response.json();

      if (result.warnings && result.warnings.length > 0) {
        console.warn('Warnings:', result.warnings);
      }

      // Display result
      displayResult(result);

    } catch (error) {
      alert('Failed to generate prediction: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={!polygon || loading}>
        {loading ? 'Validating...' : 'Generate Report'}
      </button>

      <label>
        <input
          type="checkbox"
          checked={checkProtected}
          onChange={(e) => setCheckProtected(e.target.checked)}
        />
        Check for protected areas
      </label>
    </div>
  );
}
```

---

## Support

For issues or questions:
1. Check logs for detailed error messages
2. Verify API connectivity (Nominatim, Overpass)
3. Test with known ocean/land coordinates
4. Check rate limits haven't been exceeded
