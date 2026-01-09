/**
 * Frontend location validation utilities.
 * Checks if selected location is over ocean or in restricted areas.
 */

import { validatePolygon, validateCoordinate } from './polygonValidator';

/**
 * Check if coordinates are over ocean (simplified client-side check).
 * 
 * For more accurate validation, the backend will perform the definitive check.
 * This is a quick pre-check to provide faster feedback to users.
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Result with isOcean boolean
 */
export async function quickOceanCheck(lat, lon) {
  try {
    // Validate coordinates first
    const coordValidation = validateCoordinate([lon, lat]);
    if (!coordValidation.isValid) {
      return {
        isOcean: false,
        error: coordValidation.error
      };
    }

    // Use Nominatim for quick reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'UrbanFormPro/1.0'
      }
    });

    // 404 usually means ocean
    if (response.status === 404) {
      return {
        isOcean: true,
        message: 'Location appears to be over ocean (no address found)'
      };
    }

    if (!response.ok) {
      return {
        isOcean: false,
        error: 'Unable to verify location, will check on backend'
      };
    }

    const data = await response.json();

    // Check if error in response
    if (data.error) {
      return {
        isOcean: true,
        message: 'Location appears to be over ocean'
      };
    }

    // Check address type
    const addressType = (data.type || '').toLowerCase();
    const waterTypes = ['sea', 'ocean', 'water', 'bay', 'strait', 'channel'];

    if (waterTypes.includes(addressType)) {
      return {
        isOcean: true,
        message: `Location is over ${addressType}`
      };
    }

    // Check if has valid address
    const address = data.address || {};
    const hasValidAddress = address.city || address.town || address.village || 
                           address.country || address.state;

    if (!hasValidAddress) {
      return {
        isOcean: true,
        message: 'Location has no valid address, likely ocean'
      };
    }

    return {
      isOcean: false,
      address: data.display_name
    };

  } catch (error) {
    console.warn('Error in quick ocean check:', error);
    return {
      isOcean: false,
      error: 'Unable to verify location, will check on backend'
    };
  }
}

/**
 * Calculate polygon centroid.
 * 
 * @param {Array} polygon - Array of [lng, lat] coordinates
 * @returns {Array} [lat, lng] of centroid
 */
export function calculatePolygonCentroid(polygon) {
  if (!polygon || polygon.length === 0) {
    return null;
  }

  // Remove last point if polygon is closed
  let coords = polygon;
  if (polygon.length > 1 && 
      polygon[0][0] === polygon[polygon.length - 1][0] &&
      polygon[0][1] === polygon[polygon.length - 1][1]) {
    coords = polygon.slice(0, -1);
  }

  // Calculate average
  const sumLng = coords.reduce((sum, coord) => sum + coord[0], 0);
  const sumLat = coords.reduce((sum, coord) => sum + coord[1], 0);

  const avgLng = sumLng / coords.length;
  const avgLat = sumLat / coords.length;

  return [avgLat, avgLng];
}

/**
 * Check if polygon is over ocean.
 * 
 * @param {Array} polygon - Array of [lng, lat] coordinates
 * @param {Object} options - Check options
 * @returns {Promise<Object>} Result
 */
export async function checkPolygonLocation(polygon, options = {}) {
  const {
    checkOcean = true,
    checkProtected = false,
    samplePoints = 3
  } = options;

  const results = {
    isValid: true,
    errors: [],
    warnings: [],
    oceanCheck: null,
    protectedCheck: null
  };

  try {
    // Validate polygon first
    const polygonValidation = validatePolygon(polygon);
    if (!polygonValidation.isValid) {
      results.isValid = false;
      results.errors.push(polygonValidation.error);
      return results;
    }

    if (!checkOcean && !checkProtected) {
      return results; // Nothing to check
    }

    // Calculate centroid
    const centroid = calculatePolygonCentroid(polygon);
    if (!centroid) {
      results.errors.push('Failed to calculate polygon centroid');
      results.isValid = false;
      return results;
    }

    const [centroidLat, centroidLng] = centroid;

    // Quick ocean check on centroid
    if (checkOcean) {
      const oceanCheck = await quickOceanCheck(centroidLat, centroidLng);
      results.oceanCheck = oceanCheck;

      if (oceanCheck.isOcean) {
        results.isValid = false;
        results.errors.push(
          oceanCheck.message || 
          'Selected location appears to be over ocean. Please select a land area for urban development analysis.'
        );
      }
    }

    // Note: Protected area check is done on backend due to API rate limits
    if (checkProtected) {
      results.warnings.push('Protected area check will be performed on backend');
    }

    return results;

  } catch (error) {
    console.error('Error checking polygon location:', error);
    results.warnings.push('Location validation will be performed on backend');
    // Don't block on client-side errors
    return results;
  }
}

/**
 * Validate location before sending to backend.
 * This provides quick user feedback.
 * 
 * @param {Object} requestData - Request data with polygon
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Validation result
 */
export async function validateLocationForDevelopment(requestData, options = {}) {
  const {
    checkOcean = true,
    checkProtected = false
  } = options;

  if (!requestData.polygon) {
    return {
      isValid: false,
      errors: ['No polygon provided'],
      warnings: []
    };
  }

  return await checkPolygonLocation(requestData.polygon, {
    checkOcean,
    checkProtected
  });
}

/**
 * Get user-friendly error message for location validation.
 * 
 * @param {Object} validationResult - Result from validation
 * @returns {string} User-friendly message
 */
export function getLocationErrorMessage(validationResult) {
  if (!validationResult || validationResult.isValid) {
    return '';
  }

  const { errors, warnings } = validationResult;

  let message = '';

  if (errors.length > 0) {
    message += '❌ Location Validation Failed:\n\n';
    message += errors.map(err => `• ${err}`).join('\n');
    message += '\n\nPlease select a different location on land.';
  }

  if (warnings.length > 0 && errors.length === 0) {
    message += '⚠️ Location Warnings:\n\n';
    message += warnings.map(warn => `• ${warn}`).join('\n');
  }

  return message;
}

/**
 * Show location validation error to user.
 * 
 * @param {Object} validationResult - Validation result
 * @param {Function} showError - Function to show error (e.g., alert or toast)
 */
export function showLocationValidationError(validationResult, showError = alert) {
  const message = getLocationErrorMessage(validationResult);
  if (message) {
    showError(message);
  }
}

/**
 * Check if location is likely in a specific region (for UI hints).
 * 
 * @param {Array} centroid - [lat, lng]
 * @returns {Object} Region information
 */
export function identifyRegion(centroid) {
  if (!centroid || centroid.length !== 2) {
    return { region: 'unknown' };
  }

  const [lat, lng] = centroid;

  // Rough region identification
  if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) {
    return {
      region: 'India',
      country: 'India',
      isSupported: true
    };
  }

  if (lat >= 1 && lat <= 1.5 && lng >= 103.6 && lng <= 104.1) {
    return {
      region: 'Singapore',
      country: 'Singapore',
      isSupported: true
    };
  }

  if (lat >= 40 && lat <= 41 && lng >= -74.5 && lng <= -73.5) {
    return {
      region: 'New York',
      country: 'USA',
      isSupported: true
    };
  }

  // Check if clearly ocean (far from any land mass)
  if (Math.abs(lat) < 60) {
    // Check major ocean regions
    if ((lng >= -180 && lng <= -100 && lat >= -30 && lat <= 30) ||  // Pacific
        (lng >= -70 && lng <= 20 && lat >= -30 && lat <= 30)) {      // Atlantic
      return {
        region: 'Ocean',
        country: null,
        isSupported: false,
        isOcean: true
      };
    }
  }

  return {
    region: 'Other',
    country: null,
    isSupported: false
  };
}

export default {
  quickOceanCheck,
  calculatePolygonCentroid,
  checkPolygonLocation,
  validateLocationForDevelopment,
  getLocationErrorMessage,
  showLocationValidationError,
  identifyRegion
};
