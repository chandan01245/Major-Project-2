/**
 * File upload validation for frontend.
 * Validates files before upload and during upload process.
 */

/**
 * File size constants.
 */
export const FILE_SIZE_LIMITS = {
  PDF: 50 * 1024 * 1024,    // 50 MB
  DOCX: 25 * 1024 * 1024,   // 25 MB
  IMAGE: 10 * 1024 * 1024,  // 10 MB
  MAX: 50 * 1024 * 1024     // 50 MB absolute max
};

/**
 * Allowed MIME types.
 */
export const ALLOWED_MIME_TYPES = {
  PDF: ['application/pdf'],
  DOCX: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ],
  IMAGE: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
};

/**
 * Validate file before upload.
 * 
 * @param {File} file - File object
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateFile(file, options = {}) {
  const {
    allowedTypes = [...ALLOWED_MIME_TYPES.PDF, ...ALLOWED_MIME_TYPES.DOCX],
    maxSize = FILE_SIZE_LIMITS.MAX,
    allowedExtensions = ['.pdf', '.docx', '.doc']
  } = options;

  const errors = [];
  const warnings = [];

  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      errors: ['No file provided'],
      warnings: []
    };
  }

  // Check if it's actually a File object
  if (!(file instanceof File)) {
    return {
      isValid: false,
      errors: ['Invalid file object'],
      warnings: []
    };
  }

  // Check file size
  if (file.size === 0) {
    errors.push('File is empty (0 bytes)');
  } else if (file.size > maxSize) {
    errors.push(`File size ${formatFileSize(file.size)} exceeds maximum allowed size ${formatFileSize(maxSize)}`);
  }

  // Warn about large files
  if (file.size > maxSize * 0.8) {
    warnings.push('File is quite large and may take some time to upload');
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Check file extension
  const filename = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => filename.endsWith(ext));

  if (!hasValidExtension) {
    errors.push(`File extension is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
  }

  // Check filename length
  if (file.name.length > 255) {
    errors.push('Filename is too long (max 255 characters)');
  }

  // Check for dangerous characters in filename
  if (/[<>:"|?*\x00-\x1F]/.test(file.name)) {
    errors.push('Filename contains invalid characters');
  }

  // Check for path traversal attempts
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push('Filename contains invalid path characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate PDF file specifically.
 * 
 * @param {File} file - PDF file
 * @returns {Promise<Object>} Validation result
 */
export async function validatePDFFile(file) {
  const basicValidation = validateFile(file, {
    allowedTypes: ALLOWED_MIME_TYPES.PDF,
    maxSize: FILE_SIZE_LIMITS.PDF,
    allowedExtensions: ['.pdf']
  });

  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Check PDF magic number
  try {
    const header = await readFileHeader(file, 5);
    if (header !== '%PDF-') {
      return {
        isValid: false,
        errors: ['File does not appear to be a valid PDF (invalid header)'],
        warnings: basicValidation.warnings
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errors: ['Failed to read file header: ' + error.message],
      warnings: basicValidation.warnings
    };
  }

  return basicValidation;
}

/**
 * Validate DOCX file specifically.
 * 
 * @param {File} file - DOCX file
 * @returns {Promise<Object>} Validation result
 */
export async function validateDOCXFile(file) {
  const basicValidation = validateFile(file, {
    allowedTypes: ALLOWED_MIME_TYPES.DOCX,
    maxSize: FILE_SIZE_LIMITS.DOCX,
    allowedExtensions: ['.docx', '.doc']
  });

  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Check ZIP magic number (DOCX is a ZIP archive)
  if (file.name.endsWith('.docx')) {
    try {
      const header = await readFileHeader(file, 4);
      const bytes = new Uint8Array([...header].map(c => c.charCodeAt(0)));

      // ZIP file starts with PK\x03\x04
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
        return {
          isValid: false,
          errors: ['File does not appear to be a valid DOCX (invalid ZIP header)'],
          warnings: basicValidation.warnings
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to read file header: ' + error.message],
        warnings: basicValidation.warnings
      };
    }
  }

  return basicValidation;
}

/**
 * Read file header bytes.
 * 
 * @param {File} file - File to read
 * @param {number} length - Number of bytes to read
 * @returns {Promise<string>} Header string
 */
function readFileHeader(file, length) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      resolve(text.substring(0, length));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file.slice(0, length));
  });
}

/**
 * Format file size for display.
 * 
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Monitor file upload progress.
 * 
 * @param {XMLHttpRequest} xhr - XMLHttpRequest object
 * @param {Function} onProgress - Progress callback
 * @param {Function} onComplete - Completion callback
 * @param {Function} onError - Error callback
 */
export function monitorUploadProgress(xhr, onProgress, onComplete, onError) {
  if (!xhr || !xhr.upload) {
    if (onError) onError(new Error('Invalid XMLHttpRequest object'));
    return;
  }

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable && onProgress) {
      const percentComplete = (e.loaded / e.total) * 100;
      onProgress({
        loaded: e.loaded,
        total: e.total,
        percentage: percentComplete
      });
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      if (onComplete) onComplete(xhr.response);
    } else {
      if (onError) onError(new Error(`Upload failed with status ${xhr.status}`));
    }
  });

  xhr.addEventListener('error', () => {
    if (onError) onError(new Error('Upload failed due to network error'));
  });

  xhr.addEventListener('abort', () => {
    if (onError) onError(new Error('Upload was aborted'));
  });
}

/**
 * Create FormData for file upload.
 * 
 * @param {File} file - File to upload
 * @param {Object} additionalData - Additional form fields
 * @returns {FormData} FormData object
 */
export function createUploadFormData(file, additionalData = {}) {
  const formData = new FormData();

  // Add file
  formData.append('file', file);

  // Add additional fields
  for (const [key, value] of Object.entries(additionalData)) {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  }

  return formData;
}

/**
 * Check if browser supports File API.
 * 
 * @returns {boolean} True if supported
 */
export function isFileAPISupported() {
  return !!(window.File && window.FileReader && window.FileList && window.Blob);
}

/**
 * Get file extension.
 * 
 * @param {string} filename - Filename
 * @returns {string} Extension (including dot)
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return '';
  }

  return filename.substring(lastDot).toLowerCase();
}

export default {
  validateFile,
  validatePDFFile,
  validateDOCXFile,
  formatFileSize,
  monitorUploadProgress,
  createUploadFormData,
  isFileAPISupported,
  getFileExtension,
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES
};
