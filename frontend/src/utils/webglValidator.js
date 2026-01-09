/**
 * WebGL validation and compatibility utilities.
 * Checks browser support for WebGL required by MapTiler/Mapbox.
 */

/**
 * Check if WebGL is supported.
 * 
 * @returns {Object} Support status and details
 */
export function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    
    // Try WebGL 2 first
    const gl2 = canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2');
    if (gl2) {
      return {
        supported: true,
        version: 2,
        context: 'webgl2'
      };
    }

    // Fall back to WebGL 1
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      return {
        supported: true,
        version: 1,
        context: 'webgl'
      };
    }

    return {
      supported: false,
      version: 0,
      context: null,
      error: 'WebGL is not supported in this browser'
    };
  } catch (error) {
    return {
      supported: false,
      version: 0,
      context: null,
      error: error.message
    };
  }
}

/**
 * Get WebGL context parameters.
 * 
 * @returns {Object} WebGL capabilities
 */
export function getWebGLCapabilities() {
  const support = checkWebGLSupport();

  if (!support.supported) {
    return {
      supported: false,
      error: support.error
    };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext(support.context);

    if (!gl) {
      return {
        supported: false,
        error: 'Failed to get WebGL context'
      };
    }

    return {
      supported: true,
      version: support.version,
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      extensions: gl.getSupportedExtensions() || []
    };
  } catch (error) {
    return {
      supported: false,
      error: error.message
    };
  }
}

/**
 * Check if WebGL context was lost.
 * 
 * @param {WebGLRenderingContext} gl - WebGL context
 * @returns {boolean} True if context was lost
 */
export function isWebGLContextLost(gl) {
  if (!gl) return true;

  try {
    return gl.isContextLost();
  } catch (error) {
    return true;
  }
}

/**
 * Handle WebGL context lost event.
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Function} onLost - Callback when context is lost
 * @param {Function} onRestored - Callback when context is restored
 * @returns {Function} Cleanup function
 */
export function handleWebGLContextEvents(canvas, onLost, onRestored) {
  if (!canvas) {
    console.warn('No canvas provided for WebGL context event handling');
    return () => {};
  }

  const handleContextLost = (event) => {
    event.preventDefault();
    console.warn('WebGL context lost');

    if (onLost) {
      onLost(event);
    }
  };

  const handleContextRestored = (event) => {
    console.log('WebGL context restored');

    if (onRestored) {
      onRestored(event);
    }
  };

  canvas.addEventListener('webglcontextlost', handleContextLost, false);
  canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
  };
}

/**
 * Get user-friendly WebGL error message.
 * 
 * @param {Object} capabilities - WebGL capabilities object
 * @returns {string} Error message
 */
export function getWebGLErrorMessage(capabilities) {
  if (!capabilities || !capabilities.supported) {
    return 'Your browser does not support WebGL, which is required for the interactive map. ' +
           'Please use a modern browser like Chrome, Firefox, Edge, or Safari.';
  }

  if (capabilities.error) {
    return `WebGL error: ${capabilities.error}. The map may not display correctly.`;
  }

  return 'An unknown WebGL error occurred.';
}

/**
 * Check if device has sufficient WebGL capabilities for mapping.
 * 
 * @param {Object} capabilities - WebGL capabilities
 * @returns {Object} Validation result
 */
export function validateWebGLForMapping(capabilities) {
  const warnings = [];
  const errors = [];

  if (!capabilities || !capabilities.supported) {
    errors.push('WebGL is not supported');
    return {
      isValid: false,
      errors,
      warnings
    };
  }

  // Check minimum texture size (should be at least 2048x2048)
  if (capabilities.maxTextureSize < 2048) {
    warnings.push(`Maximum texture size is low (${capabilities.maxTextureSize}). Map performance may be degraded.`);
  }

  // Check viewport dimensions
  const [maxWidth, maxHeight] = capabilities.maxViewportDims;
  if (maxWidth < 1920 || maxHeight < 1080) {
    warnings.push('Maximum viewport dimensions are low. Large displays may not be fully supported.');
  }

  // Check for required extensions
  const requiredExtensions = [
    'OES_element_index_uint',
    'OES_standard_derivatives'
  ];

  const missingExtensions = requiredExtensions.filter(ext => 
    !capabilities.extensions.includes(ext)
  );

  if (missingExtensions.length > 0) {
    warnings.push(`Missing recommended WebGL extensions: ${missingExtensions.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Detect if running in software renderer (slow WebGL).
 * 
 * @param {Object} capabilities - WebGL capabilities
 * @returns {boolean} True if software renderer detected
 */
export function isSoftwareRenderer(capabilities) {
  if (!capabilities || !capabilities.supported) {
    return false;
  }

  const renderer = (capabilities.renderer || '').toLowerCase();
  const vendor = (capabilities.vendor || '').toLowerCase();

  // Common software renderer indicators
  const softwareIndicators = [
    'swiftshader',
    'llvmpipe',
    'software',
    'microsoft basic render',
    'mesa',
    'gallium'
  ];

  return softwareIndicators.some(indicator => 
    renderer.includes(indicator) || vendor.includes(indicator)
  );
}

/**
 * Get performance recommendation based on WebGL capabilities.
 * 
 * @param {Object} capabilities - WebGL capabilities
 * @returns {string} Performance level ('high', 'medium', 'low')
 */
export function getPerformanceLevel(capabilities) {
  if (!capabilities || !capabilities.supported) {
    return 'unsupported';
  }

  if (isSoftwareRenderer(capabilities)) {
    return 'low';
  }

  // Check texture size
  if (capabilities.maxTextureSize >= 8192) {
    return 'high';
  }

  if (capabilities.maxTextureSize >= 4096) {
    return 'medium';
  }

  return 'low';
}

/**
 * Create diagnostic report for WebGL issues.
 * 
 * @returns {Object} Diagnostic information
 */
export function createWebGLDiagnosticReport() {
  const capabilities = getWebGLCapabilities();
  const validation = validateWebGLForMapping(capabilities);
  const performanceLevel = getPerformanceLevel(capabilities);
  const isSoftware = isSoftwareRenderer(capabilities);

  return {
    timestamp: new Date().toISOString(),
    browser: navigator.userAgent,
    capabilities,
    validation,
    performanceLevel,
    isSoftwareRenderer: isSoftware,
    recommendations: getRecommendations(capabilities, validation, performanceLevel, isSoftware)
  };
}

/**
 * Get recommendations based on WebGL diagnostics.
 */
function getRecommendations(capabilities, validation, performanceLevel, isSoftware) {
  const recommendations = [];

  if (!capabilities.supported) {
    recommendations.push('Update your browser to the latest version');
    recommendations.push('Try a different browser (Chrome, Firefox, Edge, or Safari)');
    recommendations.push('Check if WebGL is disabled in your browser settings');
  } else if (isSoftware) {
    recommendations.push('Update your graphics drivers');
    recommendations.push('Enable hardware acceleration in your browser');
    recommendations.push('Check if your GPU is blacklisted for WebGL');
  } else if (performanceLevel === 'low') {
    recommendations.push('Update your graphics drivers');
    recommendations.push('Close other tabs or applications to free up GPU resources');
    recommendations.push('Consider using a device with better graphics capabilities');
  }

  if (validation.warnings.length > 0) {
    recommendations.push('Some map features may not work optimally');
  }

  return recommendations;
}

export default {
  checkWebGLSupport,
  getWebGLCapabilities,
  isWebGLContextLost,
  handleWebGLContextEvents,
  getWebGLErrorMessage,
  validateWebGLForMapping,
  isSoftwareRenderer,
  getPerformanceLevel,
  createWebGLDiagnosticReport
};
