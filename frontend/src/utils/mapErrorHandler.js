/**
 * Map error handling utilities.
 * Handles MapTiler and Mapbox GL errors gracefully.
 */

/**
 * Map error types.
 */
export const MapErrorTypes = {
  LOAD_ERROR: 'LOAD_ERROR',
  STYLE_ERROR: 'STYLE_ERROR',
  SOURCE_ERROR: 'SOURCE_ERROR',
  LAYER_ERROR: 'LAYER_ERROR',
  WEBGL_ERROR: 'WEBGL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TOKEN_ERROR: 'TOKEN_ERROR'
};

/**
 * Handle map load error.
 * 
 * @param {Error} error - Error object
 * @param {Object} map - Map instance
 * @returns {string} User-friendly error message
 */
export function handleMapLoadError(error, map = null) {
  console.error('Map load error:', error);

  // Check for WebGL errors
  if (error.message && error.message.includes('WebGL')) {
    return 'Your browser does not support WebGL, which is required for the map. Please try a different browser or enable WebGL in your browser settings.';
  }

  // Check for style errors
  if (error.message && error.message.includes('style')) {
    return 'Failed to load map style. Please check your internet connection and try again.';
  }

  // Check for token errors
  if (error.message && (error.message.includes('token') || error.message.includes('401'))) {
    return 'Map authentication failed. Please check the API token configuration.';
  }

  // Check for network errors
  if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
    return 'Network error while loading map. Please check your internet connection.';
  }

  // Cleanup map if provided
  if (map && map.remove) {
    try {
      map.remove();
    } catch (e) {
      console.warn('Failed to remove map:', e);
    }
  }

  return 'Failed to load map. Please refresh the page and try again.';
}

/**
 * Handle map source error.
 * 
 * @param {Error} error - Error object
 * @param {string} sourceId - Source ID
 * @returns {string} Error message
 */
export function handleMapSourceError(error, sourceId) {
  console.error(`Map source error for "${sourceId}":`, error);

  if (error.status === 404) {
    return `Map data source "${sourceId}" not found.`;
  }

  if (error.status === 403) {
    return `Access denied to map source "${sourceId}".`;
  }

  return `Failed to load map source "${sourceId}". Data may not display correctly.`;
}

/**
 * Handle map layer error.
 * 
 * @param {Error} error - Error object
 * @param {string} layerId - Layer ID
 * @returns {string} Error message
 */
export function handleMapLayerError(error, layerId) {
  console.error(`Map layer error for "${layerId}":`, error);

  if (error.message && error.message.includes('already exists')) {
    console.warn(`Layer "${layerId}" already exists, skipping creation`);
    return null; // Not a critical error
  }

  if (error.message && error.message.includes('does not exist')) {
    return `Required map source for layer "${layerId}" not found.`;
  }

  return `Failed to add map layer "${layerId}". Some features may not display.`;
}

/**
 * Safe map operation wrapper.
 * Executes map operation with error handling.
 * 
 * @param {Function} operation - Map operation function
 * @param {string} operationName - Name for logging
 * @param {Function} onError - Error handler callback
 * @returns {*} Operation result or null on error
 */
export async function safeMapOperation(operation, operationName = 'Map operation', onError = null) {
  try {
    return await operation();
  } catch (error) {
    console.error(`${operationName} failed:`, error);

    if (onError) {
      onError(error);
    }

    return null;
  }
}

/**
 * Check if map is loaded and ready.
 * 
 * @param {Object} map - Map instance
 * @returns {boolean} True if map is ready
 */
export function isMapReady(map) {
  if (!map) {
    return false;
  }

  try {
    return map.loaded() && map.isStyleLoaded();
  } catch (error) {
    console.warn('Error checking map ready state:', error);
    return false;
  }
}

/**
 * Wait for map to be ready.
 * 
 * @param {Object} map - Map instance
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if map is ready
 */
export function waitForMapReady(map, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (isMapReady(map)) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('Map load timeout'));
    }, timeout);

    const checkReady = () => {
      if (isMapReady(map)) {
        clearTimeout(timeoutId);
        map.off('load', checkReady);
        resolve(true);
      }
    };

    map.on('load', checkReady);

    // Also check on style.load
    map.on('style.load', checkReady);
  });
}

/**
 * Safe add layer to map.
 * 
 * @param {Object} map - Map instance
 * @param {Object} layer - Layer configuration
 * @param {string} beforeId - ID of layer to insert before
 * @returns {boolean} True if successful
 */
export function safeAddLayer(map, layer, beforeId = null) {
  if (!map || !layer) {
    console.warn('Invalid map or layer configuration');
    return false;
  }

  try {
    // Check if layer already exists
    if (map.getLayer(layer.id)) {
      console.warn(`Layer "${layer.id}" already exists, removing first`);
      map.removeLayer(layer.id);
    }

    // Add layer
    if (beforeId) {
      map.addLayer(layer, beforeId);
    } else {
      map.addLayer(layer);
    }

    return true;
  } catch (error) {
    const message = handleMapLayerError(error, layer.id);
    if (message) {
      console.error(message);
    }
    return false;
  }
}

/**
 * Safe add source to map.
 * 
 * @param {Object} map - Map instance
 * @param {string} sourceId - Source ID
 * @param {Object} sourceConfig - Source configuration
 * @returns {boolean} True if successful
 */
export function safeAddSource(map, sourceId, sourceConfig) {
  if (!map || !sourceId || !sourceConfig) {
    console.warn('Invalid map, sourceId, or sourceConfig');
    return false;
  }

  try {
    // Check if source already exists
    if (map.getSource(sourceId)) {
      console.warn(`Source "${sourceId}" already exists, removing first`);
      
      // Remove layers using this source first
      const layers = map.getStyle().layers || [];
      layers.forEach(layer => {
        if (layer.source === sourceId) {
          map.removeLayer(layer.id);
        }
      });

      map.removeSource(sourceId);
    }

    // Add source
    map.addSource(sourceId, sourceConfig);

    return true;
  } catch (error) {
    const message = handleMapSourceError(error, sourceId);
    console.error(message);
    return false;
  }
}

/**
 * Safe remove layer from map.
 * 
 * @param {Object} map - Map instance
 * @param {string} layerId - Layer ID
 * @returns {boolean} True if successful
 */
export function safeRemoveLayer(map, layerId) {
  if (!map || !layerId) {
    return false;
  }

  try {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
      return true;
    }
  } catch (error) {
    console.warn(`Failed to remove layer "${layerId}":`, error);
  }

  return false;
}

/**
 * Safe remove source from map.
 * 
 * @param {Object} map - Map instance
 * @param {string} sourceId - Source ID
 * @returns {boolean} True if successful
 */
export function safeRemoveSource(map, sourceId) {
  if (!map || !sourceId) {
    return false;
  }

  try {
    // Remove all layers using this source first
    const style = map.getStyle();
    if (style && style.layers) {
      style.layers.forEach(layer => {
        if (layer.source === sourceId) {
          safeRemoveLayer(map, layer.id);
        }
      });
    }

    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
      return true;
    }
  } catch (error) {
    console.warn(`Failed to remove source "${sourceId}":`, error);
  }

  return false;
}

/**
 * Cleanup all custom layers and sources.
 * 
 * @param {Object} map - Map instance
 * @param {Array} customSourceIds - Array of custom source IDs to remove
 */
export function cleanupMap(map, customSourceIds = []) {
  if (!map) return;

  try {
    customSourceIds.forEach(sourceId => {
      safeRemoveSource(map, sourceId);
    });
  } catch (error) {
    console.warn('Error during map cleanup:', error);
  }
}

/**
 * Handle map resize safely.
 * 
 * @param {Object} map - Map instance
 */
export function safeResizeMap(map) {
  if (!map) return;

  try {
    if (map.resize) {
      map.resize();
    }
  } catch (error) {
    console.warn('Failed to resize map:', error);
  }
}

/**
 * Set map bounds safely.
 * 
 * @param {Object} map - Map instance
 * @param {Array} bounds - [[west, south], [east, north]]
 * @param {Object} options - Fit bounds options
 */
export function safeFitBounds(map, bounds, options = {}) {
  if (!map || !bounds) return;

  try {
    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 16,
      ...options
    });
  } catch (error) {
    console.warn('Failed to fit bounds:', error);
  }
}

export default {
  MapErrorTypes,
  handleMapLoadError,
  handleMapSourceError,
  handleMapLayerError,
  safeMapOperation,
  isMapReady,
  waitForMapReady,
  safeAddLayer,
  safeAddSource,
  safeRemoveLayer,
  safeRemoveSource,
  cleanupMap,
  safeResizeMap,
  safeFitBounds
};
