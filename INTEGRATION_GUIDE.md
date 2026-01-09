"""
INTEGRATION GUIDE: Edge Case Handling
======================================

This file provides instructions for integrating all edge case handlers into the application.

## Backend Integration

### 1. app.py - Add imports at the top:

```python
# Edge case handling imports
from validators import validate_json, validate_request_size
from file_validator import validate_file_upload, FileValidationError
from geo_validator import validate_coordinates, validate_polygon, GeoValidationError
from api_resilience import retry_with_backoff, get_circuit_breaker
from amenities_cache import get_amenities_cache
from geocoding_cache import get_geocoding_cache
from ml_safeguards import validate_features, validate_prediction_output, get_default_prediction
from flood_safeguards import validate_weather_data, validate_flood_prediction
from aqi_validators import validate_aqi_value, sanitize_aqi_data
from error_handlers import register_error_handlers, create_error_response, create_success_response
from env_validator import startup_validation
```

### 2. app.py - Run validation on startup (add after app creation):

```python
# Register error handlers
register_error_handlers(app)

# Run environment validation
validation_results = startup_validation(strict=False)
if not validation_results['valid']:
    print("⚠️  Some environment checks failed, but continuing...")
```

### 3. app.py - Update upload-document endpoint:

```python
@app.route('/api/upload-document', methods=['POST'])
@validate_request_size(max_size_mb=50)
def upload_document():
    if 'file' not in request.files:
        return create_error_response('No file provided', 'NO_FILE')
    
    file = request.files['file']
    
    # Validate file
    try:
        validation_result = validate_file_upload(file, max_size=50*1024*1024)
        safe_filename = validation_result['safe_filename']
    except FileValidationError as e:
        return create_error_response(e.message, e.code)
    
    # ... rest of existing code ...
```

### 4. app.py - Update predict-zoning endpoint:

```python
@app.route('/api/predict-zoning', methods=['POST'])
@validate_json('polygon')
def predict_zoning():
    data = request.json
    
    try:
        # Validate polygon
        polygon = validate_polygon(data['polygon'])
        
        # Validate coordinates in polygon
        for coord in polygon:
            validate_coordinates(coord[1], coord[0])  # lat, lng
        
        # ... existing prediction code ...
        
        # Validate prediction output
        predictions = validate_prediction_output(predictions)
        
    except GeoValidationError as e:
        return create_error_response(e.message, e.code)
    except Exception as e:
        return create_error_response(str(e), 'PREDICTION_ERROR', status=500)
```

### 5. amenities_service.py - Add caching:

```python
from amenities_cache import get_amenities_cache

class AmenitiesFinder:
    def __init__(self):
        self.cache = get_amenities_cache()
        # ... existing code ...
    
    def find_amenities(self, lat, lng, radius_km=5.0):
        # Check cache first
        cached = self.cache.get(lat, lng, radius_km)
        if cached:
            return cached
        
        # ... existing API call code ...
        
        # Cache the results
        self.cache.set(lat, lng, amenities, radius_km)
        return amenities
```

### 6. geocoding_service.py - Add caching:

```python
from geocoding_cache import get_geocoding_cache

class GeocodingService:
    def __init__(self):
        self.cache = get_geocoding_cache()
        # ... existing code ...
    
    def get_address(self, lat, lng):
        # Check cache first
        cached = self.cache.get(lat, lng)
        if cached:
            return cached
        
        # ... existing API call code ...
        
        # Cache the result
        if address:
            self.cache.set(lat, lng, address)
        
        return address
```

### 7. waqi_service.py - Add circuit breaker:

```python
from api_resilience import get_circuit_breaker, retry_with_backoff

class WAQIService:
    def __init__(self):
        self.circuit_breaker = get_circuit_breaker('waqi')
        # ... existing code ...
    
    @retry_with_backoff(max_retries=3, base_delay=1.0)
    def get_current_aqi(self, lat, lng):
        def fetch():
            # ... existing API call code ...
            return response
        
        return self.circuit_breaker.call(fetch)
```

## Frontend Integration (Quick Start)

### Key files to create:
1. src/utils/apiErrorHandler.js - Centralized API error handling
2. src/utils/polygonValidator.js - Polygon validation before sending to backend
3. src/components/ErrorBoundary.jsx - React error boundary
4. src/hooks/useSafeState.js - Safe state management

### Example usage in App.jsx:

```javascript
import ErrorBoundary from './components/ErrorBoundary';
import { validatePolygon } from './utils/polygonValidator';
import { handleApiError } from './utils/apiErrorHandler';

// Wrap app in error boundary
function App() {
  return (
    <ErrorBoundary>
      <IndianUrbanForm />
    </ErrorBoundary>
  );
}

// Validate polygon before API call
const handleGenerateReport = async () => {
  try {
    // Validate polygon
    const validation = validatePolygon(drawnPolygon);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }
    
    // Make API call
    const report = await mlService.generateReport(polygon, ...);
    setGeneratedReport(report);
  } catch (error) {
    const userMessage = handleApiError(error);
    alert(userMessage);
  }
};
```

## Testing Edge Cases

Run the test suite to verify edge case handling:

```bash
# Backend tests
python tests/edge_cases_test.py

# Frontend tests (if implemented)
npm test -- edge-cases
```

## Monitoring

Check logs for edge case warnings:
- Look for `⚠️` warnings in console
- Monitor circuit breaker state changes
- Check cache hit rates
- Review validation errors

## Production Checklist

- [ ] All environment variables set in .env
- [ ] API keys validated
- [ ] NLTK data downloaded
- [ ] Directories created with proper permissions
- [ ] Cache directory has sufficient space
- [ ] Error handlers registered
- [ ] Circuit breakers configured
- [ ] File size limits appropriate
- [ ] Rate limits configured
- [ ] Logging configured

## Need Help?

See EDGE_CASES_PLAN.md for comprehensive documentation of all edge cases.
