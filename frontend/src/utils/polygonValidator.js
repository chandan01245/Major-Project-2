/**
 * Polygon validation utilities.
 * Validates polygon geometry before sending to backend.
 */

/**
 * Validate polygon coordinates.
 * 
 * @param {Array} polygon - Array of [lng, lat] coordinates
 * @param {Object} options - Validation options
 * @returns {Object} Validation result {isValid, error, warnings}
 */
export function validatePolygon(polygon, options = {}) {
  const {
    minPoints = 3,
    maxPoints = 10000,
    checkSelfIntersection = true,
    checkArea = false, // Disabled - area validation not required
    minArea = 1, // square meters
    maxArea = 10000000 // 10 km²
  } = options;

  const warnings = [];

  // Check if polygon exists
  if (!polygon) {
    return { isValid: false, error: 'Polygon is null or undefined' };
  }

  // Check if it's an array
  if (!Array.isArray(polygon)) {
    return { isValid: false, error: 'Polygon must be an array of coordinates' };
  }

  // Check number of points
  if (polygon.length < minPoints) {
    return {
      isValid: false,
      error: `Polygon must have at least ${minPoints} points (found ${polygon.length})`
    };
  }

  if (polygon.length > maxPoints) {
    return {
      isValid: false,
      error: `Polygon has too many points (${polygon.length}). Maximum is ${maxPoints}`
    };
  }

  // Validate each coordinate
  for (let i = 0; i < polygon.length; i++) {
    const coord = polygon[i];

    if (!Array.isArray(coord) || coord.length !== 2) {
      return {
        isValid: false,
        error: `Point ${i} is invalid. Each point must be [longitude, latitude]`
      };
    }

    const [lng, lat] = coord;

    // Validate types
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return {
        isValid: false,
        error: `Point ${i} has non-numeric coordinates`
      };
    }

    // Check for NaN or Infinity
    if (!isFinite(lng) || !isFinite(lat)) {
      return {
        isValid: false,
        error: `Point ${i} has invalid values (NaN or Infinity)`
      };
    }

    // Validate ranges
    if (lat < -90 || lat > 90) {
      return {
        isValid: false,
        error: `Point ${i} has invalid latitude ${lat} (must be between -90 and 90)`
      };
    }

    if (lng < -180 || lng > 180) {
      return {
        isValid: false,
        error: `Point ${i} has invalid longitude ${lng} (must be between -180 and 180)`
      };
    }
  }

  // Check for duplicate consecutive points
  for (let i = 0; i < polygon.length - 1; i++) {
    const [lng1, lat1] = polygon[i];
    const [lng2, lat2] = polygon[i + 1];

    if (lng1 === lng2 && lat1 === lat2) {
      warnings.push(`Duplicate consecutive points found at index ${i}`);
    }
  }

  // Check if polygon is closed (first point === last point)
  if (polygon.length > 0) {
    const first = polygon[0];
    const last = polygon[polygon.length - 1];

    if (first[0] !== last[0] || first[1] !== last[1]) {
      warnings.push('Polygon is not closed (first point !== last point). This will be auto-corrected.');
    }
  }

  // Check for self-intersection (optional, can be expensive)
  if (checkSelfIntersection && polygon.length >= 4) {
    const hasSelfIntersection = checkSelfIntersecting(polygon);
    if (hasSelfIntersection) {
      return {
        isValid: false,
        error: 'Polygon is self-intersecting. Please draw a simple polygon without crossing edges.'
      };
    }
  }

  // Check area (if requested)
  if (checkArea) {
    // Use simple shoelace formula for approximate area in square degrees
    const area = calculatePolygonArea(polygon);

    if (area === 0) {
      return {
        isValid: false,
        error: 'Polygon has zero area. Points may be collinear.'
      };
    }

    // Very rough approximation: 1 degree² ≈ 12,000 km² at equator
    // For more accurate area, use turf.js in the actual app
    const approxAreaKm2 = area * 12000;

    if (approxAreaKm2 < minArea / 1000000) {
      warnings.push(`Polygon area is very small (< ${minArea} m²)`);
    }

    if (approxAreaKm2 > maxArea / 1000000) {
      return {
        isValid: false,
        error: `Polygon area is too large (> ${maxArea / 1000000} km²)`
      };
    }
  }

  return { isValid: true, error: null, warnings };
}

/**
 * Calculate polygon area using shoelace formula.
 * Returns area in square degrees (approximate).
 */
function calculatePolygonArea(polygon) {
  if (polygon.length < 3) return 0;

  let area = 0;
  const n = polygon.length;

  for (let i = 0; i < n - 1; i++) {
    area += polygon[i][0] * polygon[i + 1][1];
    area -= polygon[i + 1][0] * polygon[i][1];
  }

  return Math.abs(area) / 2;
}

/**
 * Check if polygon is self-intersecting.
 * Uses line segment intersection algorithm.
 */
function checkSelfIntersecting(polygon) {
  const n = polygon.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n - 1; j++) {
      // Don't check adjacent segments
      if (j === i + 1 || (i === 0 && j === n - 2)) {
        continue;
      }

      if (segmentsIntersect(
        polygon[i],
        polygon[i + 1],
        polygon[j],
        polygon[j + 1]
      )) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two line segments intersect.
 */
function segmentsIntersect(p1, p2, p3, p4) {
  const ccw = (a, b, c) => {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  };

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

/**
 * Validate coordinate pair.
 * 
 * @param {Array} coord - [lng, lat]
 * @returns {Object} Validation result
 */
export function validateCoordinate(coord) {
  if (!Array.isArray(coord) || coord.length !== 2) {
    return {
      isValid: false,
      error: 'Coordinate must be [longitude, latitude]'
    };
  }

  const [lng, lat] = coord;

  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return {
      isValid: false,
      error: 'Coordinates must be numbers'
    };
  }

  if (!isFinite(lng) || !isFinite(lat)) {
    return {
      isValid: false,
      error: 'Coordinates cannot be NaN or Infinity'
    };
  }

  if (lat < -90 || lat > 90) {
    return {
      isValid: false,
      error: `Invalid latitude: ${lat} (must be between -90 and 90)`
    };
  }

  if (lng < -180 || lng > 180) {
    return {
      isValid: false,
      error: `Invalid longitude: ${lng} (must be between -180 and 180)`
    };
  }

  return { isValid: true, error: null };
}

/**
 * Sanitize polygon by removing invalid points and closing if needed.
 * 
 * @param {Array} polygon - Polygon coordinates
 * @returns {Array} Sanitized polygon
 */
export function sanitizePolygon(polygon) {
  if (!Array.isArray(polygon)) return [];

  // Filter out invalid points
  const validPoints = polygon.filter(coord => {
    if (!Array.isArray(coord) || coord.length !== 2) return false;
    const [lng, lat] = coord;
    return (
      typeof lng === 'number' &&
      typeof lat === 'number' &&
      isFinite(lng) &&
      isFinite(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  });

  if (validPoints.length < 3) return [];

  // Close polygon if not closed
  const first = validPoints[0];
  const last = validPoints[validPoints.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    validPoints.push([first[0], first[1]]);
  }

  return validPoints;
}

export default {
  validatePolygon,
  validateCoordinate,
  sanitizePolygon
};
