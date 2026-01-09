/**
 * Request validation utilities for frontend.
 * Validates data before sending to backend.
 */

import { validatePolygon, validateCoordinate } from './polygonValidator';
import { sanitizeString, sanitizeNumber, sanitizeJSON } from './inputSanitizer';

/**
 * Validate predict request payload.
 * 
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export function validatePredictRequest(data) {
  const errors = [];

  // Check city
  if (!data.city || typeof data.city !== 'string') {
    errors.push('City is required');
  } else {
    const validCities = ['bangalore', 'delhi', 'mumbai', 'hyderabad', 'singapore', 'new_york'];
    if (!validCities.includes(data.city.toLowerCase())) {
      errors.push(`Invalid city. Must be one of: ${validCities.join(', ')}`);
    }
  }

  // Check polygon
  if (!data.polygon) {
    errors.push('Polygon is required');
  } else {
    const polygonValidation = validatePolygon(data.polygon);
    if (!polygonValidation.isValid) {
      errors.push(`Polygon validation failed: ${polygonValidation.error}`);
    }
  }

  // Check area (optional but should be number if present)
  if (data.area !== undefined) {
    if (typeof data.area !== 'number' || data.area <= 0) {
      errors.push('Area must be a positive number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate flood prediction request.
 * 
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export function validateFloodRequest(data) {
  const errors = [];

  // Validate coordinates
  if (!data.coordinates || !Array.isArray(data.coordinates)) {
    errors.push('Coordinates array is required');
  } else {
    const coordValidation = validateCoordinate(data.coordinates);
    if (!coordValidation.isValid) {
      errors.push(`Invalid coordinates: ${coordValidation.error}`);
    }
  }

  // Validate weather data
  if (data.weather) {
    const { rainfall, temperature, humidity, pressure } = data.weather;

    if (rainfall !== undefined) {
      const sanitized = sanitizeNumber(rainfall, { min: 0, max: 2000 });
      if (sanitized === null) {
        errors.push('Rainfall must be between 0 and 2000 mm');
      }
    }

    if (temperature !== undefined) {
      const sanitized = sanitizeNumber(temperature, { min: -50, max: 60 });
      if (sanitized === null) {
        errors.push('Temperature must be between -50 and 60°C');
      }
    }

    if (humidity !== undefined) {
      const sanitized = sanitizeNumber(humidity, { min: 0, max: 100 });
      if (sanitized === null) {
        errors.push('Humidity must be between 0 and 100%');
      }
    }

    if (pressure !== undefined) {
      const sanitized = sanitizeNumber(pressure, { min: 800, max: 1100 });
      if (sanitized === null) {
        errors.push('Pressure must be between 800 and 1100 hPa');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate AQI prediction request.
 * 
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export function validateAQIRequest(data) {
  const errors = [];

  // Validate coordinates
  if (!data.coordinates || !Array.isArray(data.coordinates)) {
    errors.push('Coordinates array is required');
  } else {
    const coordValidation = validateCoordinate(data.coordinates);
    if (!coordValidation.isValid) {
      errors.push(`Invalid coordinates: ${coordValidation.error}`);
    }
  }

  // Validate city (optional)
  if (data.city && typeof data.city !== 'string') {
    errors.push('City must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate document upload request.
 * 
 * @param {File} file - File object
 * @returns {Object} Validation result
 */
export function validateDocumentUpload(file) {
  const errors = [];

  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  // Check file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only PDF and DOCX files are allowed');
  }

  // Check file extension
  const filename = file.name.toLowerCase();
  if (!filename.endsWith('.pdf') && !filename.endsWith('.docx')) {
    errors.push('Invalid file extension. Only .pdf and .docx are allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate amenities request.
 * 
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export function validateAmenitiesRequest(data) {
  const errors = [];

  // Validate coordinates
  if (!data.lat || !data.lon) {
    errors.push('Latitude and longitude are required');
  } else {
    const latValid = sanitizeNumber(data.lat, { min: -90, max: 90 });
    const lonValid = sanitizeNumber(data.lon, { min: -180, max: 180 });

    if (latValid === null) {
      errors.push('Invalid latitude (must be between -90 and 90)');
    }
    if (lonValid === null) {
      errors.push('Invalid longitude (must be between -180 and 180)');
    }
  }

  // Validate radius
  if (data.radius !== undefined) {
    const radius = sanitizeNumber(data.radius, { min: 100, max: 10000, integer: true });
    if (radius === null) {
      errors.push('Radius must be between 100 and 10000 meters');
    }
  }

  // Validate amenity type
  if (data.amenity) {
    if (typeof data.amenity !== 'string') {
      errors.push('Amenity type must be a string');
    } else if (data.amenity.length > 50) {
      errors.push('Amenity type is too long');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate building placement request.
 * 
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export function validateBuildingRequest(data) {
  const errors = [];

  // Validate position
  if (!data.position || !Array.isArray(data.position)) {
    errors.push('Position array is required');
  } else {
    const coordValidation = validateCoordinate(data.position);
    if (!coordValidation.isValid) {
      errors.push(`Invalid position: ${coordValidation.error}`);
    }
  }

  // Validate dimensions
  if (data.width !== undefined) {
    const width = sanitizeNumber(data.width, { min: 1, max: 500 });
    if (width === null) {
      errors.push('Width must be between 1 and 500 meters');
    }
  }

  if (data.height !== undefined) {
    const height = sanitizeNumber(data.height, { min: 1, max: 1000 });
    if (height === null) {
      errors.push('Height must be between 1 and 1000 meters');
    }
  }

  // Validate building type
  if (data.type) {
    const validTypes = ['residential', 'commercial', 'industrial', 'mixed'];
    if (!validTypes.includes(data.type.toLowerCase())) {
      errors.push(`Invalid building type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize request payload before sending.
 * 
 * @param {Object} data - Request data
 * @returns {Object} Sanitized data
 */
export function sanitizeRequest(data) {
  if (!data || typeof data !== 'object') {
    return {};
  }

  return sanitizeJSON(data);
}

/**
 * Validate common request fields.
 * 
 * @param {Object} data - Request data
 * @param {Array} requiredFields - List of required field names
 * @returns {Object} Validation result
 */
export function validateRequiredFields(data, requiredFields = []) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Request data must be an object');
    return { isValid: false, errors };
  }

  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create validation error message from errors array.
 * 
 * @param {Array} errors - Array of error messages
 * @returns {string} Formatted error message
 */
export function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return '';
  }

  if (errors.length === 1) {
    return errors[0];
  }

  return `Multiple validation errors:\n- ${errors.join('\n- ')}`;
}

export default {
  validatePredictRequest,
  validateFloodRequest,
  validateAQIRequest,
  validateDocumentUpload,
  validateAmenitiesRequest,
  validateBuildingRequest,
  sanitizeRequest,
  validateRequiredFields,
  formatValidationErrors
};
