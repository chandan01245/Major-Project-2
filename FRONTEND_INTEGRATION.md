/**
 * Frontend Integration Guide
 * 
 * This guide shows how to integrate the frontend edge case handling utilities
 * into your React components and services.
 */

# Frontend Edge Case Handlers - Integration Guide

## Table of Contents
1. [API Error Handling](#api-error-handling)
2. [Form Validation](#form-validation)
3. [Safe State Management](#safe-state-management)
4. [Error Boundaries](#error-boundaries)
5. [Map Error Handling](#map-error-handling)
6. [Browser Compatibility](#browser-compatibility)
7. [File Upload Validation](#file-upload-validation)

---

## API Error Handling

### Basic Usage

```javascript
import { safeFetch, handleApiError, retryWithBackoff } from './utils/apiErrorHandler';

// Simple API call with error handling
async function fetchData() {
  try {
    const response = await safeFetch('http://localhost:5000/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 30000); // 30 second timeout

    const result = await response.json();
    return result;
  } catch (error) {
    const message = handleApiError(error, 'Prediction');
    alert(message); // Or use your notification system
  }
}

// With retry logic
async function fetchWithRetry() {
  return await retryWithBackoff(
    () => safeFetch('http://localhost:5000/api/amenities'),
    3, // max retries
    1000 // base delay
  );
}
```

---

## Form Validation

### Validating Prediction Request

```javascript
import { validatePredictRequest } from './utils/requestValidator';
import { sanitizeRequest } from './utils/requestValidator';

function handleSubmit(formData) {
  // Sanitize first
  const sanitized = sanitizeRequest(formData);

  // Validate
  const validation = validatePredictRequest(sanitized);

  if (!validation.isValid) {
    alert(`Validation errors:\n- ${validation.errors.join('\n- ')}`);
    return;
  }

  // Proceed with API call
  sendPredictionRequest(sanitized);
}
```

### Polygon Validation

```javascript
import { validatePolygon, sanitizePolygon } from './utils/polygonValidator';

function onDrawComplete(polygon) {
  // Validate polygon
  const validation = validatePolygon(polygon, {
    minPoints: 3,
    maxPoints: 1000,
    checkSelfIntersection: true,
    minArea: 100, // square meters
    maxArea: 10000000 // 10 km²
  });

  if (!validation.isValid) {
    alert(`Invalid polygon: ${validation.error}`);
    return;
  }

  if (validation.warnings.length > 0) {
    console.warn('Polygon warnings:', validation.warnings);
  }

  // Sanitize (close polygon, remove invalid points)
  const sanitized = sanitizePolygon(polygon);

  // Use sanitized polygon
  setSelectedPolygon(sanitized);
}
```

---

## Safe State Management

### Using useSafeState Hook

```javascript
import { useSafeState, useAsyncState } from './hooks/useSafeState';
import { safeFetch } from './utils/apiErrorHandler';

function MyComponent() {
  // Safe state that prevents updates after unmount
  const [data, setData, isMounted] = useSafeState(null);
  const [loading, setLoading] = useSafeState(false);

  // Or use async state hook
  const { 
    data: amenities, 
    loading: amenitiesLoading, 
    error, 
    execute 
  } = useAsyncState(async () => {
    const response = await safeFetch('/api/amenities');
    return response.json();
  });

  useEffect(() => {
    execute(); // Load data
  }, []);

  if (amenitiesLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Render amenities */}</div>;
}
```

### Using Safe Refs

```javascript
import { useSafeRef, useCallbackRef } from './hooks/useSafeRef';

function MapComponent() {
  const { ref: mapRef, getValue, setValue } = useSafeRef(null);

  // Callback ref for cleanup
  const setMapElement = useCallbackRef(
    (element) => {
      // Initialize map when element mounts
      const map = new maplibregl.Map({
        container: element,
        style: 'your-style-url'
      });
      setValue(map);
    },
    (element) => {
      // Cleanup when element unmounts
      const map = getValue();
      if (map) {
        map.remove();
      }
    }
  );

  return <div ref={setMapElement} />;
}
```

---

## Error Boundaries

### Wrapping Components

```javascript
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        // Log to error tracking service
        console.error('App error:', error, errorInfo);
      }}
    >
      <YourApp />
    </ErrorBoundary>
  );
}

// Or wrap specific components
function MyPage() {
  return (
    <div>
      <Header />
      
      <ErrorBoundary errorMessage="Map failed to load">
        <Map />
      </ErrorBoundary>

      <ErrorBoundary errorMessage="Failed to load predictions">
        <PredictionPanel />
      </ErrorBoundary>
    </div>
  );
}
```

### Using HOC

```javascript
import { withErrorBoundary } from './components/ErrorBoundary';

const SafeMap = withErrorBoundary(Map, {
  errorMessage: 'Map component crashed',
  showDetails: true
});

export default SafeMap;
```

---

## Map Error Handling

### Safe Map Operations

```javascript
import {
  safeAddLayer,
  safeAddSource,
  handleMapLoadError,
  waitForMapReady
} from './utils/mapErrorHandler';

async function initializeMap(container) {
  try {
    const map = new maplibregl.Map({
      container,
      style: 'your-style-url'
    });

    // Wait for map to be ready
    await waitForMapReady(map, 10000);

    // Safely add source
    safeAddSource(map, 'my-source', {
      type: 'geojson',
      data: myData
    });

    // Safely add layer
    safeAddLayer(map, {
      id: 'my-layer',
      type: 'fill',
      source: 'my-source',
      paint: {
        'fill-color': '#0080ff',
        'fill-opacity': 0.5
      }
    });

    return map;
  } catch (error) {
    const message = handleMapLoadError(error);
    alert(message);
    return null;
  }
}
```

---

## Browser Compatibility

### Checking Compatibility on Load

```javascript
import {
  checkBrowserSupport,
  getCompatibilityWarning,
  checkWebGLSupport
} from './utils/browserCheck';
import { getWebGLCapabilities } from './utils/webglValidator';

function App() {
  useEffect(() => {
    // Check browser support
    const browserSupport = checkBrowserSupport();

    if (!browserSupport.isSupported) {
      const warning = getCompatibilityWarning({ browser: browserSupport });
      alert(warning);
    }

    // Check WebGL
    const webgl = getWebGLCapabilities();

    if (!webgl.supported) {
      alert('WebGL is not supported. The map will not work.');
      return;
    }

    console.log('WebGL info:', webgl);
  }, []);

  return <YourApp />;
}
```

---

## File Upload Validation

### Validating Document Uploads

```javascript
import {
  validateFile,
  validatePDFFile,
  formatFileSize,
  monitorUploadProgress
} from './utils/fileUploadValidator';

async function handleFileUpload(event) {
  const file = event.target.files[0];

  if (!file) return;

  // Validate file
  const validation = await validatePDFFile(file);

  if (!validation.isValid) {
    alert(`File validation failed:\n- ${validation.errors.join('\n- ')}`);
    return;
  }

  if (validation.warnings.length > 0) {
    console.warn('File warnings:', validation.warnings);
  }

  // Upload file
  const xhr = new XMLHttpRequest();
  const formData = new FormData();
  formData.append('file', file);

  monitorUploadProgress(
    xhr,
    (progress) => {
      console.log(`Upload progress: ${progress.percentage.toFixed(1)}%`);
      setUploadProgress(progress.percentage);
    },
    (response) => {
      console.log('Upload complete:', response);
      setUploadProgress(100);
    },
    (error) => {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    }
  );

  xhr.open('POST', 'http://localhost:5000/api/process-document');
  xhr.send(formData);
}
```

---

## Number Formatting

### Safe Number Display

```javascript
import {
  formatNumber,
  formatPercentage,
  formatArea,
  formatDistance
} from './utils/numberFormatter';

function MetricsDisplay({ metrics }) {
  return (
    <div>
      <p>Area: {formatArea(metrics.area)}</p>
      <p>Distance: {formatDistance(metrics.distance)}</p>
      <p>Coverage: {formatPercentage(metrics.coverage, { isDecimal: true })}</p>
      <p>FAR: {formatNumber(metrics.far, { decimals: 2, fallback: 'N/A' })}</p>
    </div>
  );
}
```

---

## Input Sanitization

### Sanitizing User Input

```javascript
import {
  sanitizeString,
  sanitizeNumber,
  sanitizeJSON
} from './utils/inputSanitizer';

function handleUserInput(rawInput) {
  // Sanitize text input
  const safeText = sanitizeString(rawInput.text);

  // Sanitize number input
  const safeNumber = sanitizeNumber(rawInput.value, {
    min: 0,
    max: 100,
    integer: true,
    defaultValue: 0
  });

  // Sanitize JSON data
  const safeData = sanitizeJSON(rawInput.data);

  return {
    text: safeText,
    value: safeNumber,
    data: safeData
  };
}
```

---

## Quick Start Checklist

1. **Wrap your app with ErrorBoundary**
   ```javascript
   <ErrorBoundary>
     <App />
   </ErrorBoundary>
   ```

2. **Use safeFetch for all API calls**
   ```javascript
   const response = await safeFetch(url, options);
   ```

3. **Validate all form inputs before submission**
   ```javascript
   const validation = validatePredictRequest(data);
   if (!validation.isValid) return;
   ```

4. **Use useSafeState instead of useState**
   ```javascript
   const [state, setState] = useSafeState(initialValue);
   ```

5. **Validate polygons before sending to backend**
   ```javascript
   const validation = validatePolygon(polygon);
   const sanitized = sanitizePolygon(polygon);
   ```

6. **Handle map errors gracefully**
   ```javascript
   try {
     await waitForMapReady(map);
     safeAddLayer(map, layerConfig);
   } catch (error) {
     handleMapLoadError(error, map);
   }
   ```

---

## Production Checklist

- [ ] All API calls use safeFetch or handleAPICall
- [ ] All forms validate input before submission
- [ ] All polygons are validated and sanitized
- [ ] Error boundaries wrap major components
- [ ] Map operations use safe wrappers
- [ ] File uploads are validated before sending
- [ ] Browser compatibility is checked on startup
- [ ] WebGL support is verified before map init
- [ ] Numbers are formatted with fallbacks
- [ ] User input is sanitized for XSS protection

---

## Support

For issues or questions:
1. Check console for detailed error messages
2. Enable `showDetails={true}` in ErrorBoundary during development
3. Use browser DevTools to inspect network requests
4. Check backend logs for API errors
