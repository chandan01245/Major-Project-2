/**
 * Safe number formatting utilities.
 * Handles edge cases like NaN, Infinity, very large/small numbers.
 */

/**
 * Safely format a number with fallback.
 * 
 * @param {*} value - Value to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number or fallback
 */
export function formatNumber(value, options = {}) {
  const {
    decimals = 2,
    fallback = 'N/A',
    prefix = '',
    suffix = '',
    thousandsSeparator = ',',
    decimalSeparator = '.'
  } = options;

  // Parse value
  const num = typeof value === 'number' ? value : parseFloat(value);

  // Check for invalid values
  if (isNaN(num)) {
    return fallback;
  }

  if (!isFinite(num)) {
    return num > 0 ? '∞' : '-∞';
  }

  // Format with decimals
  let formatted = num.toFixed(decimals);

  // Add thousands separator
  if (thousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    formatted = parts.join(decimalSeparator);
  } else if (decimalSeparator !== '.') {
    formatted = formatted.replace('.', decimalSeparator);
  }

  // Add prefix/suffix
  return `${prefix}${formatted}${suffix}`;
}

/**
 * Format number as percentage.
 * 
 * @param {*} value - Value (0-1 or 0-100 based on isDecimal)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, options = {}) {
  const {
    decimals = 1,
    fallback = 'N/A',
    isDecimal = true // true if value is 0-1, false if 0-100
  } = options;

  const num = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  const percentage = isDecimal ? num * 100 : num;

  return formatNumber(percentage, {
    decimals,
    suffix: '%',
    fallback
  });
}

/**
 * Format number as currency.
 * 
 * @param {*} value - Numeric value
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency
 */
export function formatCurrency(value, options = {}) {
  const {
    currency = 'USD',
    locale = 'en-US',
    fallback = 'N/A'
  } = options;

  const num = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(num);
  } catch (error) {
    // Fallback if Intl API fails
    return formatNumber(num, {
      decimals: 2,
      prefix: '$',
      fallback
    });
  }
}

/**
 * Format file size in human-readable format.
 * 
 * @param {number} bytes - Size in bytes
 * @param {Object} options - Formatting options
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes, options = {}) {
  const {
    decimals = 2,
    fallback = 'N/A'
  } = options;

  const num = typeof bytes === 'number' ? bytes : parseFloat(bytes);

  if (isNaN(num) || !isFinite(num) || num < 0) {
    return fallback;
  }

  if (num === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));

  return formatNumber(num / Math.pow(k, i), {
    decimals,
    suffix: ' ' + sizes[i],
    fallback
  });
}

/**
 * Format large numbers with abbreviated units (K, M, B).
 * 
 * @param {*} value - Numeric value
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number
 */
export function formatCompactNumber(value, options = {}) {
  const {
    decimals = 1,
    fallback = 'N/A'
  } = options;

  const num = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum < 1000) {
    return formatNumber(num, { decimals: 0, fallback });
  }

  if (absNum < 1000000) {
    return sign + formatNumber(absNum / 1000, { decimals, suffix: 'K', fallback });
  }

  if (absNum < 1000000000) {
    return sign + formatNumber(absNum / 1000000, { decimals, suffix: 'M', fallback });
  }

  return sign + formatNumber(absNum / 1000000000, { decimals, suffix: 'B', fallback });
}

/**
 * Format coordinate (latitude or longitude).
 * 
 * @param {*} value - Coordinate value
 * @param {string} type - 'lat' or 'lng'
 * @param {Object} options - Formatting options
 * @returns {string} Formatted coordinate
 */
export function formatCoordinate(value, type = 'lat', options = {}) {
  const {
    decimals = 6,
    fallback = 'N/A',
    useDMS = false // Degrees, Minutes, Seconds
  } = options;

  const num = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  // Validate range
  if (type === 'lat' && (num < -90 || num > 90)) {
    return fallback;
  }
  if (type === 'lng' && (num < -180 || num > 180)) {
    return fallback;
  }

  if (useDMS) {
    return formatDMS(num, type);
  }

  const direction = type === 'lat'
    ? (num >= 0 ? 'N' : 'S')
    : (num >= 0 ? 'E' : 'W');

  return formatNumber(Math.abs(num), {
    decimals,
    suffix: '° ' + direction,
    fallback
  });
}

/**
 * Convert decimal degrees to DMS (Degrees, Minutes, Seconds).
 * 
 * @param {number} decimal - Decimal degrees
 * @param {string} type - 'lat' or 'lng'
 * @returns {string} DMS format
 */
function formatDMS(decimal, type) {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);

  const direction = type === 'lat'
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');

  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

/**
 * Format area in square meters with appropriate unit.
 * 
 * @param {*} sqMeters - Area in square meters
 * @param {Object} options - Formatting options
 * @returns {string} Formatted area
 */
export function formatArea(sqMeters, options = {}) {
  const {
    decimals = 2,
    fallback = 'N/A'
  } = options;

  const num = typeof sqMeters === 'number' ? sqMeters : parseFloat(sqMeters);

  if (isNaN(num) || !isFinite(num) || num < 0) {
    return fallback;
  }

  // Use km² for large areas
  if (num >= 1000000) {
    return formatNumber(num / 1000000, {
      decimals,
      suffix: ' km²',
      fallback
    });
  }

  return formatNumber(num, {
    decimals,
    suffix: ' m²',
    fallback
  });
}

/**
 * Format distance with appropriate unit.
 * 
 * @param {*} meters - Distance in meters
 * @param {Object} options - Formatting options
 * @returns {string} Formatted distance
 */
export function formatDistance(meters, options = {}) {
  const {
    decimals = 2,
    fallback = 'N/A'
  } = options;

  const num = typeof meters === 'number' ? meters : parseFloat(meters);

  if (isNaN(num) || !isFinite(num) || num < 0) {
    return fallback;
  }

  // Use km for distances >= 1000m
  if (num >= 1000) {
    return formatNumber(num / 1000, {
      decimals,
      suffix: ' km',
      fallback
    });
  }

  return formatNumber(num, {
    decimals: 0,
    suffix: ' m',
    fallback
  });
}

/**
 * Clamp number to range.
 * 
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  const num = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(num)) {
    return min;
  }

  return Math.max(min, Math.min(max, num));
}

/**
 * Round to specified number of decimal places.
 * 
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded value
 */
export function roundTo(value, decimals = 0) {
  const num = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }

  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier) / multiplier;
}

export default {
  formatNumber,
  formatPercentage,
  formatCurrency,
  formatFileSize,
  formatCompactNumber,
  formatCoordinate,
  formatArea,
  formatDistance,
  clamp,
  roundTo
};
