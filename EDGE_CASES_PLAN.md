# 🔍 Edge Cases Analysis & Implementation Plan

## 📋 Overview
Comprehensive analysis of edge cases across the entire UrbanForm Pro codebase with specific fixes.
**IMPORTANT**: All fixes are ADDITIVE only - no existing code will be modified or removed.

---

## 🎯 BACKEND EDGE CASES

### 1. API Request Validation

#### 1.1 Missing or Invalid JSON Body
**Files**: `backend/app.py` (all routes with `request.json`)
**Edge Cases**:
- Empty request body
- Malformed JSON
- Missing required fields
- Wrong data types

**New File**: `backend/validators.py`
```python
# Input validation decorators and functions
```

#### 1.2 File Upload Edge Cases
**File**: `backend/app.py` - `/api/upload-document`
**Edge Cases**:
- File too large (> 50MB)
- Invalid file types (not PDF/DOCX)
- Corrupted files
- Empty files (0 bytes)
- Filename with special characters/unicode
- Duplicate filenames
- Concurrent uploads to same city

**New File**: `backend/file_validator.py`
```python
# File validation utilities
```

#### 1.3 Coordinate Validation
**Files**: Multiple routes accepting lat/lng
**Edge Cases**:
- Coordinates out of bounds (lat > 90, lng > 180)
- Null/undefined coordinates
- String instead of number
- Very high precision (performance)
- Coordinates in ocean/invalid areas

**New File**: `backend/geo_validator.py`
```python
# Geographic coordinate validation
```

### 2. External API Failures

#### 2.1 WAQI Service
**File**: `backend/waqi_service.py`
**Edge Cases**:
- API key missing/invalid
- Rate limit exceeded (429)
- Network timeouts
- Service unavailable (503)
- Invalid response format
- Empty/null AQI data

**New File**: `backend/api_resilience.py`
```python
# Retry logic, circuit breaker, fallback data
```

#### 2.2 Overpass API (Amenities)
**File**: `backend/amenities_service.py`
**Edge Cases**:
- 504 Gateway Timeout (already partially handled)
- No amenities found in radius
- Invalid query syntax
- Rate limiting
- Very large result sets (memory)
- Corrupted coordinates in response

**Enhancement File**: `backend/amenities_cache.py`
```python
# Persistent cache with expiry
```

#### 2.3 Nominatim Geocoding
**File**: `backend/geocoding_service.py`
**Edge Cases**:
- Rate limit violations (< 1 req/sec)
- No address found
- Very slow responses
- Blocked IP

**New File**: `backend/geocoding_cache.py`
```python
# Persistent geocoding cache
```

### 3. ML Model Edge Cases

#### 3.1 Zoning ML Model
**File**: `backend/zoning_ml_model.py`
**Edge Cases**:
- No training data
- Training data too small (< 10 samples)
- Predict before training
- Invalid features (NaN, Inf)
- Features outside training range
- Model file corrupted
- Concurrent predictions during training

**New File**: `backend/ml_safeguards.py`
```python
# Model validation and safety checks
```

#### 3.2 Flood Prediction
**File**: `backend/flood_model.py`
**Edge Cases**:
- Model file missing/corrupted
- Invalid input features
- Extreme weather values
- Division by zero
- Memory issues with large predictions

**New File**: `backend/flood_safeguards.py`
```python
# Flood model safety checks
```

#### 3.3 AQI Prediction
**File**: `backend/aqi_model.py`
**Edge Cases**:
- Negative AQI values
- AQI > 500 (off-scale)
- Empty historical data
- All zeros in history
- Sudden spikes/anomalies

**New File**: `backend/aqi_validators.py`
```python
# AQI data validation
```

### 4. Document Processing

#### 4.1 PDF Processing
**File**: `backend/document_processor_improved.py`
**Edge Cases**:
- Password-protected PDFs
- Scanned images (no text)
- Very large PDFs (> 1000 pages)
- Corrupted PDFs
- PDFs with non-standard encoding
- Empty PDFs
- PDF processing crashes

**New File**: `backend/pdf_safeguards.py`
```python
# PDF processing error handling
```

#### 4.2 DOCX Processing
**Edge Cases**:
- Corrupted DOCX files
- DOCX with only images
- Complex tables
- Embedded objects
- Very large files

**New File**: `backend/docx_safeguards.py`
```python
# DOCX processing error handling
```

#### 4.3 NLTK Dependencies
**Edge Cases**:
- NLTK data not downloaded
- NLTK download failures
- Missing punkt tokenizer
- Unicode encoding issues

**New File**: `backend/nltk_validator.py`
```python
# NLTK setup validation
```

### 5. Data Persistence

#### 5.1 File System
**Edge Cases**:
- Disk full
- Permission denied
- Path traversal attacks
- Concurrent file writes
- Filename collisions
- File locks

**New File**: `backend/storage_manager.py`
```python
# Safe file operations with locking
```

#### 5.2 JSON Data Files
**Edge Cases**:
- Corrupted JSON
- Very large JSON (memory)
- Concurrent reads/writes
- Encoding issues

**New File**: `backend/json_handler.py`
```python
# Safe JSON operations with validation
```

### 6. Threading & Concurrency

#### 6.1 Background Processing
**File**: `backend/app.py` - document upload
**Edge Cases**:
- Thread crashes silently
- Multiple threads accessing same resource
- Thread pool exhaustion
- Memory leaks in threads
- Zombie threads

**New File**: `backend/thread_manager.py`
```python
# Thread pool with monitoring
```

#### 6.2 Status Tracking
**Edge Cases**:
- Race conditions in status_lock
- Status never reaches 'complete'
- Memory leak from old statuses
- Concurrent status updates

**New File**: `backend/status_tracker.py`
```python
# Thread-safe status tracking with cleanup
```

### 7. Database/Storage Edge Cases

#### 7.1 Model Storage
**Edge Cases**:
- Model file too large
- Joblib version mismatch
- Corrupted pickle files
- Model path doesn't exist

**New File**: `backend/model_persistence.py`
```python
# Safe model save/load with versioning
```

### 8. City Configuration

#### 8.1 Unknown Cities
**File**: `backend/city_config.py`
**Edge Cases**:
- City not in config
- Null city parameter
- City name typos
- Case sensitivity issues

**New File**: `backend/city_validator.py`
```python
# City validation with fuzzy matching
```

### 9. Memory Management

#### 9.1 Large Data Processing
**Edge Cases**:
- Very large polygons (> 10000 points)
- Huge document files
- Memory exhaustion
- Numpy array overflow

**New File**: `backend/memory_monitor.py`
```python
# Memory usage monitoring and limits
```

### 10. Environment Variables

**Edge Cases**:
- .env file missing
- Required vars not set
- Invalid API keys
- Empty string values

**New File**: `backend/env_validator.py`
```python
# Environment validation on startup
```

---

## 🖥️ FRONTEND EDGE CASES

### 11. Map Initialization

#### 11.1 MapTiler API
**File**: `src/App.jsx`
**Edge Cases**:
- API key missing/invalid
- Network offline during init
- API quota exceeded
- Tile loading failures

**New File**: `src/utils/mapErrorHandler.js`
```javascript
// Map error handling and fallbacks
```

#### 11.2 Draw Control
**Edge Cases**:
- Draw control already added
- Draw while map not loaded
- Multiple simultaneous draws
- Draw with no city selected

**New File**: `src/utils/drawValidator.js`
```javascript
// Drawing state validation
```

### 12. User Input Validation

#### 12.1 Polygon Drawing
**Edge Cases**:
- Polygon with < 3 points
- Self-intersecting polygons
- Very large polygons (> 1000 points)
- Polygon crosses dateline
- Invalid coordinates

**New File**: `src/utils/polygonValidator.js`
```javascript
// Polygon validation utilities
```

#### 12.2 Search Input
**Edge Cases**:
- Empty search
- Special characters
- SQL injection attempts
- XSS attempts
- Very long queries

**New File**: `src/utils/inputSanitizer.js`
```javascript
// Input sanitization
```

### 13. API Communication

#### 13.1 Backend Connectivity
**File**: `src/services/mlServiceBackend.js`
**Edge Cases**:
- Backend offline
- Network errors
- Timeout errors
- Partial responses
- CORS errors

**New File**: `src/utils/apiErrorHandler.js`
```javascript
// Centralized API error handling
```

#### 13.2 Request Validation
**Edge Cases**:
- Missing required fields
- Wrong data types
- Null/undefined values
- Very large payloads

**New File**: `src/utils/requestValidator.js`
```javascript
// Request validation before sending
```

### 14. State Management

#### 14.1 React State
**Edge Cases**:
- setState on unmounted component
- Stale closures
- Race conditions
- Infinite re-renders

**New File**: `src/hooks/useSafeState.js`
```javascript
// Safe state management hook
```

#### 14.2 Refs
**Edge Cases**:
- Accessing null refs
- Refs not initialized
- Stale ref values

**New File**: `src/hooks/useSafeRef.js`
```javascript
// Safe ref hook
```

### 15. File Upload (Frontend)

**Edge Cases**:
- No file selected
- Multiple files
- Very large files
- Invalid file types
- Upload progress tracking
- Upload cancellation

**New File**: `src/utils/fileUploadValidator.js`
```javascript
// File upload validation and limits
```

### 16. Report Generation

#### 16.1 PDF Generation
**File**: `src/services/pdfService.js`
**Edge Cases**:
- Missing report data
- Null/undefined values
- Very long text overflow
- Special characters in text
- Unicode handling
- Memory issues with large reports

**New File**: `src/utils/pdfSafeguards.js`
```javascript
// PDF generation safety checks
```

#### 16.2 Data Formatting
**Edge Cases**:
- Division by zero
- Null currency symbol
- Invalid numbers
- Infinity values
- Negative values where not allowed

**New File**: `src/utils/numberFormatter.js`
```javascript
// Safe number formatting
```

### 17. 3D Buildings

**File**: `src/services/building3DService.js`
**Edge Cases**:
- WebGL not supported
- GPU memory exhaustion
- Too many buildings
- Invalid building data
- Layer already exists

**New File**: `src/utils/webglValidator.js`
```javascript
// WebGL capability checks
```

### 18. Browser Compatibility

**Edge Cases**:
- Old browsers
- Missing APIs (localStorage, fetch)
- WebGL not available
- ServiceWorker not supported

**New File**: `src/utils/browserCheck.js`
```javascript
// Browser compatibility checks
```

### 19. Performance

#### 19.1 Large Datasets
**Edge Cases**:
- Rendering 1000+ markers
- Very complex polygons
- Too many zones
- Memory leaks

**New File**: `src/utils/performanceMonitor.js`
```javascript
// Performance monitoring
```

### 20. Error Boundaries

**Edge Cases**:
- Component crashes
- Unhandled promise rejections
- Network errors during render

**New File**: `src/components/ErrorBoundary.jsx`
```javascript
// React error boundary
```

---

## 🐳 DOCKER EDGE CASES

### 21. Container Issues

**Edge Cases**:
- Port conflicts
- Volume mount permissions
- Network isolation issues
- Container OOM
- Health check failures
- Build failures

**New File**: `docker-healthcheck.sh`
```bash
# Advanced health checks
```

**New File**: `.dockerignore` improvements

### 22. Environment Variables

**Edge Cases**:
- Missing .env file
- Invalid env values
- Env not passed to container

**New File**: `docker-entrypoint.sh`
```bash
# Validate environment before starting
```

---

## 🔧 IMPLEMENTATION FILES TO CREATE

### Backend Files (15 new files):
1. `backend/validators.py` - General input validation
2. `backend/file_validator.py` - File upload validation
3. `backend/geo_validator.py` - Geographic validation
4. `backend/api_resilience.py` - API retry/circuit breaker
5. `backend/amenities_cache.py` - Persistent amenities cache
6. `backend/geocoding_cache.py` - Geocoding cache
7. `backend/ml_safeguards.py` - ML model safety
8. `backend/flood_safeguards.py` - Flood model safety
9. `backend/aqi_validators.py` - AQI validation
10. `backend/pdf_safeguards.py` - PDF processing safety
11. `backend/docx_safeguards.py` - DOCX processing safety
12. `backend/nltk_validator.py` - NLTK validation
13. `backend/storage_manager.py` - Safe file operations
14. `backend/json_handler.py` - Safe JSON operations
15. `backend/thread_manager.py` - Thread management
16. `backend/status_tracker.py` - Status tracking
17. `backend/model_persistence.py` - Model save/load
18. `backend/city_validator.py` - City validation
19. `backend/memory_monitor.py` - Memory monitoring
20. `backend/env_validator.py` - Environment validation

### Frontend Files (13 new files):
1. `src/utils/mapErrorHandler.js` - Map error handling
2. `src/utils/drawValidator.js` - Drawing validation
3. `src/utils/polygonValidator.js` - Polygon validation
4. `src/utils/inputSanitizer.js` - Input sanitization
5. `src/utils/apiErrorHandler.js` - API error handling
6. `src/utils/requestValidator.js` - Request validation
7. `src/hooks/useSafeState.js` - Safe state hook
8. `src/hooks/useSafeRef.js` - Safe ref hook
9. `src/utils/fileUploadValidator.js` - File upload validation
10. `src/utils/pdfSafeguards.js` - PDF safety
11. `src/utils/numberFormatter.js` - Number formatting
12. `src/utils/webglValidator.js` - WebGL checks
13. `src/utils/browserCheck.js` - Browser compatibility
14. `src/utils/performanceMonitor.js` - Performance monitoring
15. `src/components/ErrorBoundary.jsx` - Error boundary

### Docker Files (2 new files):
1. `docker-healthcheck.sh` - Advanced health checks
2. `docker-entrypoint.sh` - Container startup validation

### Integration Files (3 new files):
1. `backend/error_handlers.py` - Centralized Flask error handlers
2. `backend/middleware.py` - Request/response middleware
3. `tests/edge_cases_test.py` - Edge case tests

---

## 📊 PRIORITY LEVELS

### 🔴 Critical (Must Fix - Security/Data Loss)
1. Input validation (SQL injection, XSS)
2. File upload validation
3. Coordinate validation
4. Thread safety
5. API key validation

### 🟠 High (User Experience Breaking)
1. API error handling with fallbacks
2. Null/undefined checks
3. Backend connectivity
4. Model file handling
5. Memory management

### 🟡 Medium (Graceful Degradation)
1. Browser compatibility
2. Performance monitoring
3. Cache implementation
4. Error boundaries
5. WebGL fallbacks

### 🟢 Low (Nice to Have)
1. Advanced logging
2. Metrics collection
3. A/B testing hooks

---

## 🚀 IMPLEMENTATION ORDER

### Phase 1: Critical Safety (Week 1)
1. Input validators
2. File validators
3. Error handlers
4. API resilience

### Phase 2: Robustness (Week 2)
1. ML safeguards
2. Thread management
3. Memory monitoring
4. Cache systems

### Phase 3: User Experience (Week 3)
1. Frontend validators
2. Error boundaries
3. Performance monitoring
4. Browser compatibility

### Phase 4: Polish (Week 4)
1. Docker improvements
2. Tests
3. Documentation
4. Monitoring dashboards

---

## 📝 NEXT STEPS

Ready to implement! I will create all edge case handling files as NEW additions.
No existing code will be modified - only imports and integrations will be added.

**Would you like me to proceed with implementation?**
