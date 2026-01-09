/**
 * Centralized API error handling utility.
 * Provides consistent error messages and logging for API errors.
 */

export class APIError extends Error {
  constructor(message, code = 'API_ERROR', status = 500, details = null) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Handle API errors and return user-friendly messages.
 * 
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @returns {string} User-friendly error message
 */
export function handleApiError(error, context = '') {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

  // Handle network errors
  if (error.message === 'Failed to fetch' || !navigator.onLine) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Handle timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return 'Request timed out. The server is taking too long to respond. Please try again.';
  }

  // Handle API response errors
  if (error.response) {
    const status = error.response.status;
    
    switch (status) {
      case 400:
        return error.response.data?.error || 'Invalid request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in again.';
      case 403:
        return 'Access forbidden. You don\'t have permission for this action.';
      case 404:
        return 'Resource not found. The requested data is not available.';
      case 413:
        return 'File or request is too large. Please try with smaller data.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again in a few minutes.';
      default:
        return error.response.data?.error || `Server returned error (${status}). Please try again.`;
    }
  }

  // Handle APIError instances
  if (error instanceof APIError) {
    return error.message;
  }

  // Default error message
  return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Retry a function with exponential backoff.
 * 
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the function
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Make a safe API call with error handling and timeout.
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} API response
 */
export async function safeFetch(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error || `Request failed with status ${response.status}`,
        errorData.code || 'REQUEST_FAILED',
        response.status,
        errorData
      );
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error.name === 'AbortError') {
      throw new APIError(
        'Request timed out',
        'TIMEOUT',
        408
      );
    }

    throw error;
  }
}

/**
 * Parse and validate JSON response.
 * 
 * @param {Response} response - Fetch response
 * @returns {Promise<Object>} Parsed JSON
 */
export async function parseJSONResponse(response) {
  try {
    const data = await response.json();
    return data;
  } catch (error) {
    throw new APIError(
      'Invalid JSON response from server',
      'INVALID_JSON',
      500
    );
  }
}

/**
 * Check if backend is available.
 * 
 * @param {string} healthUrl - Health check endpoint URL
 * @returns {Promise<boolean>} True if backend is available
 */
export async function checkBackendHealth(healthUrl) {
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
}

/**
 * Handle common fetch errors with user notifications.
 * 
 * @param {Function} apiCall - Async function that makes API call
 * @param {Function} onError - Callback for error handling
 * @param {Function} onSuccess - Callback for successful response
 */
export async function handleAPICall(apiCall, onError, onSuccess) {
  try {
    const result = await apiCall();
    if (onSuccess) {
      onSuccess(result);
    }
    return result;
  } catch (error) {
    const message = handleApiError(error);
    if (onError) {
      onError(message, error);
    } else {
      console.error(message);
    }
    throw error;
  }
}

export default {
  handleApiError,
  retryWithBackoff,
  safeFetch,
  parseJSONResponse,
  checkBackendHealth,
  handleAPICall,
  APIError
};
