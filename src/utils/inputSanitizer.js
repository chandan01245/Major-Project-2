/**
 * Input sanitization utilities.
 * Protects against XSS, injection attacks, and malformed data.
 */

/**
 * Sanitize string input to prevent XSS.
 * 
 * @param {string} input - Raw string input
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return String(input || '');
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // HTML entity encoding for common XSS characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Sanitize HTML while allowing safe tags.
 * 
 * @param {string} html - HTML string
 * @param {Array} allowedTags - List of allowed tags
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html, allowedTags = ['b', 'i', 'em', 'strong', 'br', 'p']) {
  if (typeof html !== 'string') {
    return '';
  }

  // Remove script tags and content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // If no tags allowed, strip all HTML
  if (allowedTags.length === 0) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else {
    // Remove tags not in allowedTags
    const allowedPattern = allowedTags.join('|');
    const regex = new RegExp(`<(?!\/?(${allowedPattern})\\b)[^>]*>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }

  return sanitized;
}

/**
 * Validate and sanitize number input.
 * 
 * @param {*} input - Input value
 * @param {Object} options - Validation options
 * @returns {number|null} Sanitized number or null if invalid
 */
export function sanitizeNumber(input, options = {}) {
  const {
    min = -Infinity,
    max = Infinity,
    integer = false,
    defaultValue = null
  } = options;

  // Parse number
  let num = typeof input === 'number' ? input : parseFloat(input);

  // Check if valid
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }

  // Round to integer if needed
  if (integer) {
    num = Math.round(num);
  }

  // Clamp to range
  num = Math.max(min, Math.min(max, num));

  return num;
}

/**
 * Sanitize array input.
 * 
 * @param {*} input - Input value
 * @param {Object} options - Validation options
 * @returns {Array} Sanitized array
 */
export function sanitizeArray(input, options = {}) {
  const {
    maxLength = 1000,
    itemValidator = null,
    defaultValue = []
  } = options;

  if (!Array.isArray(input)) {
    return defaultValue;
  }

  // Limit array length
  let sanitized = input.slice(0, maxLength);

  // Validate/sanitize each item
  if (itemValidator && typeof itemValidator === 'function') {
    sanitized = sanitized
      .map(itemValidator)
      .filter(item => item !== null && item !== undefined);
  }

  return sanitized;
}

/**
 * Sanitize filename to prevent directory traversal.
 * 
 * @param {string} filename - Original filename
 * @returns {string} Safe filename
 */
export function sanitizeFilename(filename) {
  if (typeof filename !== 'string') {
    return 'file.txt';
  }

  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[\/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*\x00-\x1F]/g, '')
    .trim();

  // Prevent hidden files on Unix
  if (sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }

  // Ensure filename is not empty
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    sanitized = 'file.txt';
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 250 - ext.length);
    sanitized = `${name}.${ext}`;
  }

  return sanitized;
}

/**
 * Sanitize URL to prevent open redirect vulnerabilities.
 * 
 * @param {string} url - URL string
 * @param {Array} allowedDomains - Whitelist of allowed domains
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeURL(url, allowedDomains = []) {
  if (typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    // Check domain whitelist if provided
    if (allowedDomains.length > 0) {
      const hostname = parsed.hostname;
      const isAllowed = allowedDomains.some(domain => {
        return hostname === domain || hostname.endsWith(`.${domain}`);
      });

      if (!isAllowed) {
        return null;
      }
    }

    return parsed.toString();
  } catch (error) {
    return null;
  }
}

/**
 * Sanitize email address.
 * 
 * @param {string} email - Email address
 * @returns {string|null} Sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Check length
  if (trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize JSON input to prevent prototype pollution.
 * 
 * @param {*} input - Input value
 * @returns {*} Sanitized value
 */
export function sanitizeJSON(input) {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeJSON);
  }

  const sanitized = {};

  for (const key in input) {
    // Skip dangerous keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(input, key)) {
      sanitized[key] = sanitizeJSON(input[key]);
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize phone number.
 * 
 * @param {string} phone - Phone number
 * @returns {string|null} Sanitized phone or null if invalid
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters except +
  const sanitized = phone.replace(/[^\d+]/g, '');

  // Check length (international format can be 7-15 digits)
  if (sanitized.length < 7 || sanitized.length > 15) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize city name to prevent injection.
 * 
 * @param {string} city - City name
 * @param {Array} validCities - Whitelist of valid cities
 * @returns {string|null} Sanitized city or null if invalid
 */
export function sanitizeCity(city, validCities = []) {
  if (typeof city !== 'string') {
    return null;
  }

  const sanitized = city.trim().toLowerCase();

  // If whitelist provided, enforce it
  if (validCities.length > 0) {
    const valid = validCities.map(c => c.toLowerCase());
    return valid.includes(sanitized) ? sanitized : null;
  }

  // Otherwise, basic validation
  if (!/^[a-z\s-]+$/i.test(sanitized)) {
    return null;
  }

  if (sanitized.length > 100) {
    return null;
  }

  return sanitized;
}

export default {
  sanitizeString,
  sanitizeHTML,
  sanitizeNumber,
  sanitizeArray,
  sanitizeFilename,
  sanitizeURL,
  sanitizeEmail,
  sanitizeJSON,
  sanitizePhone,
  sanitizeCity
};
