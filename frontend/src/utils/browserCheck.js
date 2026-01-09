/**
 * Browser compatibility checking utilities.
 * Detects browser features and warns about unsupported functionality.
 */

/**
 * Detect current browser.
 * 
 * @returns {Object} Browser information
 */
export function detectBrowser() {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let version = 'Unknown';
  let engine = 'Unknown';

  // Chrome
  if (/Chrome/.test(ua) && /Google Inc/.test(navigator.vendor)) {
    browserName = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    engine = 'Blink';
  }
  // Edge (Chromium)
  else if (/Edg/.test(ua)) {
    browserName = 'Edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
    engine = 'Blink';
  }
  // Firefox
  else if (/Firefox/.test(ua)) {
    browserName = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    engine = 'Gecko';
  }
  // Safari
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    browserName = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    engine = 'WebKit';
  }
  // Opera
  else if (/OPR/.test(ua)) {
    browserName = 'Opera';
    version = ua.match(/OPR\/(\d+)/)?.[1] || 'Unknown';
    engine = 'Blink';
  }
  // IE 11
  else if (/Trident/.test(ua)) {
    browserName = 'Internet Explorer';
    version = '11';
    engine = 'Trident';
  }

  return {
    name: browserName,
    version: parseInt(version, 10),
    versionString: version,
    engine,
    userAgent: ua,
    isMobile: /Mobile|Android|iPhone|iPad/.test(ua),
    isTablet: /iPad|Android/.test(ua) && !/Mobile/.test(ua)
  };
}

/**
 * Check if browser is supported.
 * 
 * @returns {Object} Support status
 */
export function checkBrowserSupport() {
  const browser = detectBrowser();
  const issues = [];
  const warnings = [];

  // Minimum versions for full support
  const minVersions = {
    Chrome: 90,
    Edge: 90,
    Firefox: 88,
    Safari: 14,
    Opera: 76
  };

  // Check for outdated browsers
  if (browser.name === 'Internet Explorer') {
    issues.push('Internet Explorer is not supported. Please use a modern browser like Chrome, Firefox, Edge, or Safari.');
  }

  if (browser.name in minVersions && browser.version < minVersions[browser.name]) {
    warnings.push(`Your browser version (${browser.name} ${browser.version}) is outdated. Please update to version ${minVersions[browser.name]} or higher for best experience.`);
  }

  // Check required features
  const features = checkRequiredFeatures();

  Object.entries(features).forEach(([feature, supported]) => {
    if (!supported) {
      issues.push(`Your browser does not support ${feature}`);
    }
  });

  return {
    isSupported: issues.length === 0,
    browser,
    issues,
    warnings,
    features
  };
}

/**
 * Check for required browser features.
 * 
 * @returns {Object} Feature support status
 */
export function checkRequiredFeatures() {
  return {
    'ES6': typeof Symbol !== 'undefined',
    'Promises': typeof Promise !== 'undefined',
    'Fetch API': typeof fetch !== 'undefined',
    'Web Workers': typeof Worker !== 'undefined',
    'Local Storage': typeof localStorage !== 'undefined',
    'Session Storage': typeof sessionStorage !== 'undefined',
    'IndexedDB': typeof indexedDB !== 'undefined',
    'Geolocation': 'geolocation' in navigator,
    'File API': typeof File !== 'undefined' && typeof FileReader !== 'undefined',
    'Canvas': (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
      } catch (e) {
        return false;
      }
    })(),
    'WebGL': (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch (e) {
        return false;
      }
    })(),
    'ResizeObserver': typeof ResizeObserver !== 'undefined',
    'IntersectionObserver': typeof IntersectionObserver !== 'undefined',
    'Intl': typeof Intl !== 'undefined'
  };
}

/**
 * Check for optional features that enhance user experience.
 * 
 * @returns {Object} Optional feature support
 */
export function checkOptionalFeatures() {
  return {
    'Clipboard API': typeof navigator.clipboard !== 'undefined',
    'Notifications': 'Notification' in window,
    'Service Workers': 'serviceWorker' in navigator,
    'WebRTC': typeof RTCPeerConnection !== 'undefined',
    'WebSockets': typeof WebSocket !== 'undefined',
    'WebAssembly': typeof WebAssembly !== 'undefined',
    'SharedArrayBuffer': typeof SharedArrayBuffer !== 'undefined',
    'OffscreenCanvas': typeof OffscreenCanvas !== 'undefined',
    'Web Animations': typeof Element !== 'undefined' && typeof Element.prototype.animate !== 'undefined'
  };
}

/**
 * Detect device type and capabilities.
 * 
 * @returns {Object} Device information
 */
export function detectDevice() {
  const ua = navigator.userAgent;

  return {
    isMobile: /Mobile|Android|iPhone/.test(ua),
    isTablet: /iPad|Android/.test(ua) && !/Mobile/.test(ua),
    isDesktop: !/Mobile|Android|iPhone|iPad/.test(ua),
    isIOS: /iPhone|iPad|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    isRetina: (window.devicePixelRatio || 1) > 1,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    cores: navigator.hardwareConcurrency || 1,
    memory: (navigator as any).deviceMemory || 'Unknown',
    connection: detectConnection()
  };
}

/**
 * Detect network connection type and speed.
 * 
 * @returns {Object} Connection information
 */
export function detectConnection() {
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;

  if (!connection) {
    return {
      type: 'Unknown',
      effectiveType: 'Unknown',
      downlink: null,
      rtt: null,
      saveData: false
    };
  }

  return {
    type: connection.type || 'Unknown',
    effectiveType: connection.effectiveType || 'Unknown',
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData || false
  };
}

/**
 * Check if connection is slow.
 * 
 * @returns {boolean} True if slow connection detected
 */
export function isSlowConnection() {
  const connection = detectConnection();

  if (connection.saveData) {
    return true;
  }

  if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
    return true;
  }

  if (connection.downlink && connection.downlink < 1) {
    return true;
  }

  return false;
}

/**
 * Get performance recommendations.
 * 
 * @returns {Object} Performance settings
 */
export function getPerformanceRecommendations() {
  const device = detectDevice();
  const isSlowConn = isSlowConnection();

  return {
    useSimplifiedUI: device.isMobile || device.memory < 4,
    reducedAnimations: device.isMobile || isSlowConn,
    lowQualityImages: isSlowConn || device.memory < 4,
    limitMapLayers: device.isMobile,
    enableCaching: true,
    maxConcurrentRequests: device.cores > 4 ? 6 : 3,
    tileSize: device.isRetina ? 512 : 256,
    maxZoom: device.isMobile ? 18 : 20
  };
}

/**
 * Create compatibility report.
 * 
 * @returns {Object} Full compatibility report
 */
export function createCompatibilityReport() {
  const browser = checkBrowserSupport();
  const device = detectDevice();
  const requiredFeatures = checkRequiredFeatures();
  const optionalFeatures = checkOptionalFeatures();
  const recommendations = getPerformanceRecommendations();

  return {
    timestamp: new Date().toISOString(),
    browser,
    device,
    requiredFeatures,
    optionalFeatures,
    recommendations,
    summary: {
      isFullyCompatible: browser.isSupported,
      hasWarnings: browser.warnings.length > 0,
      criticalIssues: browser.issues.filter(issue => !issue.includes('outdated')),
      performanceLevel: getDevicePerformanceLevel(device)
    }
  };
}

/**
 * Get device performance level.
 */
function getDevicePerformanceLevel(device) {
  if (device.isDesktop && device.cores > 4 && device.memory >= 8) {
    return 'high';
  }

  if (device.isMobile || device.memory < 4 || device.cores < 2) {
    return 'low';
  }

  return 'medium';
}

/**
 * Show compatibility warning to user.
 * 
 * @param {Object} report - Compatibility report
 * @returns {string} Warning message (empty if compatible)
 */
export function getCompatibilityWarning(report) {
  if (!report || report.browser.isSupported) {
    return '';
  }

  const issues = report.browser.issues;
  const warnings = report.browser.warnings;

  if (issues.length > 0) {
    return `Compatibility Issues:\n- ${issues.join('\n- ')}`;
  }

  if (warnings.length > 0) {
    return `Warnings:\n- ${warnings.join('\n- ')}`;
  }

  return '';
}

/**
 * Check if running in private/incognito mode.
 * 
 * @returns {Promise<boolean>} True if private mode
 */
export async function isPrivateMode() {
  try {
    // Try to use FileSystem API (fails in private mode)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota } = await navigator.storage.estimate();
      return quota < 120000000; // Less than 120MB suggests private mode
    }

    // Fallback: Try IndexedDB
    return new Promise((resolve) => {
      try {
        const db = indexedDB.open('test');
        db.onsuccess = () => resolve(false);
        db.onerror = () => resolve(true);
      } catch (e) {
        resolve(true);
      }
    });
  } catch (error) {
    return false;
  }
}

export default {
  detectBrowser,
  checkBrowserSupport,
  checkRequiredFeatures,
  checkOptionalFeatures,
  detectDevice,
  detectConnection,
  isSlowConnection,
  getPerformanceRecommendations,
  createCompatibilityReport,
  getCompatibilityWarning,
  isPrivateMode
};
