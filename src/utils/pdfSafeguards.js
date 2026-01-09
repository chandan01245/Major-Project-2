/**
 * PDF generation safeguards for frontend.
 * Handles errors during PDF creation with jsPDF.
 */

/**
 * Safely create PDF document.
 * 
 * @param {Function} pdfGenerator - Function that generates PDF
 * @param {Object} options - PDF options
 * @returns {Promise<Object>} Result with success status and data/error
 */
export async function safeCreatePDF(pdfGenerator, options = {}) {
  const {
    filename = 'document.pdf',
    onProgress = null,
    maxSize = 50 * 1024 * 1024 // 50MB
  } = options;

  try {
    // Execute PDF generation
    if (onProgress) onProgress({ stage: 'generating', progress: 0 });

    const pdfDoc = await pdfGenerator();

    if (!pdfDoc) {
      throw new Error('PDF generator returned null or undefined');
    }

    if (onProgress) onProgress({ stage: 'generating', progress: 50 });

    // Check memory usage if possible
    if (performance.memory && performance.memory.usedJSHeapSize > 1.5e9) {
      console.warn('High memory usage detected during PDF generation');
    }

    if (onProgress) onProgress({ stage: 'finalizing', progress: 75 });

    // Generate blob
    const blob = pdfDoc.output('blob');

    if (!blob) {
      throw new Error('Failed to generate PDF blob');
    }

    // Check file size
    if (blob.size > maxSize) {
      throw new Error(`Generated PDF is too large (${formatBytes(blob.size)}). Maximum size is ${formatBytes(maxSize)}`);
    }

    if (blob.size === 0) {
      throw new Error('Generated PDF is empty (0 bytes)');
    }

    if (onProgress) onProgress({ stage: 'complete', progress: 100 });

    return {
      success: true,
      blob,
      size: blob.size,
      filename
    };
  } catch (error) {
    console.error('PDF generation failed:', error);

    return {
      success: false,
      error: error.message || 'Unknown error during PDF generation',
      filename
    };
  }
}

/**
 * Safely download PDF.
 * 
 * @param {Blob} blob - PDF blob
 * @param {string} filename - Filename
 * @returns {Object} Result
 */
export function safeDownloadPDF(blob, filename = 'document.pdf') {
  try {
    if (!blob || !(blob instanceof Blob)) {
      throw new Error('Invalid blob provided');
    }

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitizeFilename(filename);

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    return {
      success: true,
      filename: link.download
    };
  } catch (error) {
    console.error('PDF download failed:', error);

    return {
      success: false,
      error: error.message || 'Failed to download PDF'
    };
  }
}

/**
 * Safely add image to PDF.
 * 
 * @param {Object} doc - jsPDF document
 * @param {string} imageUrl - Image URL
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {Promise<Object>} Result
 */
export async function safeAddImage(doc, imageUrl, x, y, width, height) {
  try {
    if (!doc) {
      throw new Error('PDF document is null or undefined');
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid image URL');
    }

    // Validate dimensions
    if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
      throw new Error('Invalid image dimensions');
    }

    // Load image
    const img = await loadImage(imageUrl);

    if (!img) {
      throw new Error('Failed to load image');
    }

    // Add to PDF
    doc.addImage(img, 'PNG', x, y, width, height);

    return {
      success: true
    };
  } catch (error) {
    console.error('Failed to add image to PDF:', error);

    return {
      success: false,
      error: error.message || 'Failed to add image'
    };
  }
}

/**
 * Load image from URL.
 * 
 * @param {string} url - Image URL
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<HTMLImageElement>} Image element
 */
function loadImage(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeoutId = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Safely add text to PDF with word wrapping.
 * 
 * @param {Object} doc - jsPDF document
 * @param {string} text - Text to add
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} options - Text options
 * @returns {Object} Result
 */
export function safeAddText(doc, text, x, y, options = {}) {
  try {
    if (!doc) {
      throw new Error('PDF document is null or undefined');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    const {
      maxWidth = doc.internal.pageSize.width - 40,
      fontSize = 12,
      fontStyle = 'normal',
      lineHeight = 1.2
    } = options;

    // Set font properties
    doc.setFontSize(fontSize);
    doc.setFont(undefined, fontStyle);

    // Split text into lines
    const lines = doc.splitTextToSize(text, maxWidth);

    // Add text
    doc.text(lines, x, y);

    return {
      success: true,
      linesCount: lines.length,
      height: lines.length * fontSize * lineHeight
    };
  } catch (error) {
    console.error('Failed to add text to PDF:', error);

    return {
      success: false,
      error: error.message || 'Failed to add text'
    };
  }
}

/**
 * Check if enough space on current page.
 * 
 * @param {Object} doc - jsPDF document
 * @param {number} currentY - Current Y position
 * @param {number} requiredHeight - Required height
 * @param {number} margin - Bottom margin
 * @returns {boolean} True if enough space
 */
export function hasEnoughSpace(doc, currentY, requiredHeight, margin = 20) {
  if (!doc) return false;

  const pageHeight = doc.internal.pageSize.height;
  return currentY + requiredHeight + margin <= pageHeight;
}

/**
 * Add new page if needed.
 * 
 * @param {Object} doc - jsPDF document
 * @param {number} currentY - Current Y position
 * @param {number} requiredHeight - Required height
 * @param {number} margin - Bottom margin
 * @returns {number} New Y position
 */
export function addPageIfNeeded(doc, currentY, requiredHeight, margin = 20) {
  if (!hasEnoughSpace(doc, currentY, requiredHeight, margin)) {
    doc.addPage();
    return 20; // Reset to top margin
  }

  return currentY;
}

/**
 * Sanitize filename for PDF.
 * 
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'document.pdf';
  }

  // Remove dangerous characters
  let sanitized = filename
    .replace(/[<>:"|?*\x00-\x1F]/g, '')
    .replace(/\.\./g, '')
    .trim();

  // Ensure .pdf extension
  if (!sanitized.toLowerCase().endsWith('.pdf')) {
    sanitized += '.pdf';
  }

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 251) + '.pdf';
  }

  return sanitized;
}

/**
 * Format bytes for display.
 * 
 * @param {number} bytes - Bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estimate PDF size before generation.
 * 
 * @param {Object} content - Content statistics
 * @returns {number} Estimated size in bytes
 */
export function estimatePDFSize(content) {
  const {
    pageCount = 1,
    imageCount = 0,
    textLength = 0,
    avgImageSize = 100000
  } = content;

  // Rough estimation
  const baseSize = 10000; // Base PDF overhead
  const pageSize = 5000; // Per page
  const textSize = textLength * 2; // Rough text size
  const imageSize = imageCount * avgImageSize;

  return baseSize + (pageCount * pageSize) + textSize + imageSize;
}

export default {
  safeCreatePDF,
  safeDownloadPDF,
  safeAddImage,
  safeAddText,
  hasEnoughSpace,
  addPageIfNeeded,
  estimatePDFSize
};
