"""
File upload validation utilities.
Validates file uploads for size, type, content, and security.
"""

import os
import re
import hashlib
import magic  # python-magic for MIME type detection
from werkzeug.utils import secure_filename
from datetime import datetime


# Allowed MIME types and extensions
ALLOWED_DOCUMENT_TYPES = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'text/plain': ['.txt']
}

# Maximum file sizes (in bytes)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MIN_FILE_SIZE = 100  # 100 bytes (prevent empty files)

# Dangerous filename patterns
DANGEROUS_PATTERNS = [
    r'\.\.',  # Path traversal
    r'[<>:"|?*]',  # Windows invalid chars
    r'[\x00-\x1f]',  # Control characters
    r'^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$',  # Windows reserved names
]


class FileValidationError(Exception):
    """Custom exception for file validation errors."""
    def __init__(self, message, code='FILE_VALIDATION_ERROR'):
        self.message = message
        self.code = code
        super().__init__(self.message)


def validate_file_upload(file, allowed_types=None, max_size=MAX_FILE_SIZE, min_size=MIN_FILE_SIZE):
    """
    Comprehensive file upload validation.
    
    Args:
        file: Flask file object from request.files
        allowed_types: Dict of allowed MIME types and extensions (None = use defaults)
        max_size: Maximum file size in bytes
        min_size: Minimum file size in bytes
    
    Returns:
        dict with validation results and metadata
    
    Raises:
        FileValidationError: If validation fails
    """
    if allowed_types is None:
        allowed_types = ALLOWED_DOCUMENT_TYPES
    
    # Check if file exists
    if file is None:
        raise FileValidationError('No file provided', 'NO_FILE')
    
    # Check if filename is provided
    if not file.filename or file.filename == '':
        raise FileValidationError('No filename provided', 'NO_FILENAME')
    
    # Validate filename
    safe_filename = validate_filename(file.filename)
    
    # Check file extension
    file_ext = os.path.splitext(safe_filename)[1].lower()
    allowed_extensions = []
    for mime_type, extensions in allowed_types.items():
        allowed_extensions.extend(extensions)
    
    if file_ext not in allowed_extensions:
        raise FileValidationError(
            f'File type not allowed. Allowed types: {", ".join(allowed_extensions)}',
            'INVALID_FILE_TYPE'
        )
    
    # Read file content for validation
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    # Validate file size
    if file_size > max_size:
        raise FileValidationError(
            f'File size ({file_size} bytes) exceeds maximum allowed ({max_size} bytes)',
            'FILE_TOO_LARGE'
        )
    
    if file_size < min_size:
        raise FileValidationError(
            f'File size ({file_size} bytes) is too small (minimum {min_size} bytes)',
            'FILE_TOO_SMALL'
        )
    
    # Validate MIME type (if python-magic is available)
    try:
        file_content = file.read(2048)  # Read first 2KB for MIME detection
        file.seek(0)
        
        mime_type = magic.from_buffer(file_content, mime=True)
        
        if mime_type not in allowed_types:
            raise FileValidationError(
                f'File MIME type ({mime_type}) does not match extension',
                'MIME_TYPE_MISMATCH'
            )
    except ImportError:
        # python-magic not installed, skip MIME validation
        print("⚠️ python-magic not installed, skipping MIME type validation")
        mime_type = None
    except Exception as e:
        print(f"⚠️ Error detecting MIME type: {e}")
        mime_type = None
    
    # Generate file hash for deduplication
    file_hash = generate_file_hash(file)
    
    # Return validation results
    return {
        'is_valid': True,
        'safe_filename': safe_filename,
        'original_filename': file.filename,
        'file_extension': file_ext,
        'file_size': file_size,
        'mime_type': mime_type,
        'file_hash': file_hash
    }


def validate_filename(filename, max_length=255):
    """
    Validate and sanitize filename.
    
    Args:
        filename: Original filename
        max_length: Maximum filename length
    
    Returns:
        Safe filename
    
    Raises:
        FileValidationError: If filename is invalid
    """
    if not filename:
        raise FileValidationError('Filename is empty', 'EMPTY_FILENAME')
    
    # Check for dangerous patterns
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, filename, re.IGNORECASE):
            raise FileValidationError(
                f'Filename contains invalid characters or patterns',
                'INVALID_FILENAME'
            )
    
    # Use werkzeug's secure_filename
    safe_name = secure_filename(filename)
    
    if not safe_name:
        raise FileValidationError(
            'Filename becomes empty after sanitization',
            'INVALID_FILENAME'
        )
    
    # Check length
    if len(safe_name) > max_length:
        # Preserve extension, truncate name
        name, ext = os.path.splitext(safe_name)
        max_name_length = max_length - len(ext)
        safe_name = name[:max_name_length] + ext
    
    return safe_name


def generate_unique_filename(original_filename, city=None, add_timestamp=True, add_hash=False):
    """
    Generate a unique filename to prevent collisions.
    
    Args:
        original_filename: Original filename
        city: Optional city identifier
        add_timestamp: Whether to add timestamp
        add_hash: Whether to add hash for extra uniqueness
    
    Returns:
        Unique filename
    """
    safe_name = validate_filename(original_filename)
    name, ext = os.path.splitext(safe_name)
    
    parts = []
    
    # Add city prefix
    if city:
        safe_city = re.sub(r'[^a-z0-9_-]', '', city.lower())
        parts.append(safe_city)
    
    # Add timestamp
    if add_timestamp:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        parts.append(timestamp)
    
    # Add hash
    if add_hash:
        hash_str = hashlib.md5(f"{original_filename}{datetime.now().isoformat()}".encode()).hexdigest()[:8]
        parts.append(hash_str)
    
    # Add original name
    parts.append(name)
    
    # Combine parts
    unique_name = '_'.join(parts) + ext
    
    return unique_name


def generate_file_hash(file, algorithm='sha256'):
    """
    Generate hash of file content for deduplication.
    
    Args:
        file: File object
        algorithm: Hash algorithm (md5, sha1, sha256)
    
    Returns:
        Hex digest of file hash
    """
    if algorithm == 'md5':
        hasher = hashlib.md5()
    elif algorithm == 'sha1':
        hasher = hashlib.sha1()
    else:
        hasher = hashlib.sha256()
    
    # Read file in chunks to handle large files
    file.seek(0)
    while True:
        chunk = file.read(8192)
        if not chunk:
            break
        hasher.update(chunk)
    file.seek(0)
    
    return hasher.hexdigest()


def check_file_exists(filepath):
    """
    Check if file exists and is accessible.
    
    Args:
        filepath: Path to file
    
    Returns:
        (exists, is_readable, file_size)
    """
    if not os.path.exists(filepath):
        return False, False, 0
    
    is_readable = os.access(filepath, os.R_OK)
    file_size = os.path.getsize(filepath) if is_readable else 0
    
    return True, is_readable, file_size


def validate_pdf_file(file):
    """
    Validate PDF file specifically.
    
    Args:
        file: File object
    
    Returns:
        (is_valid, error_message)
    """
    try:
        # Read first few bytes to check PDF signature
        file.seek(0)
        header = file.read(8)
        file.seek(0)
        
        # PDF files start with %PDF-
        if not header.startswith(b'%PDF-'):
            return False, 'File is not a valid PDF (missing PDF header)'
        
        # Check for encrypted PDFs (they have /Encrypt in the file)
        file.seek(0)
        content = file.read(10240)  # Read first 10KB
        file.seek(0)
        
        if b'/Encrypt' in content:
            return False, 'PDF is encrypted/password-protected'
        
        return True, None
        
    except Exception as e:
        return False, f'Error validating PDF: {str(e)}'


def validate_docx_file(file):
    """
    Validate DOCX file specifically.
    
    Args:
        file: File object
    
    Returns:
        (is_valid, error_message)
    """
    try:
        # DOCX files are ZIP archives, check for ZIP signature
        file.seek(0)
        header = file.read(4)
        file.seek(0)
        
        # ZIP files start with PK (50 4B)
        if header[:2] != b'PK':
            return False, 'File is not a valid DOCX (not a ZIP archive)'
        
        return True, None
        
    except Exception as e:
        return False, f'Error validating DOCX: {str(e)}'


def get_safe_upload_path(base_dir, city, filename, create_dirs=True):
    """
    Generate safe upload path with directory creation.
    
    Args:
        base_dir: Base upload directory
        city: City identifier
        filename: Filename
        create_dirs: Whether to create directories if they don't exist
    
    Returns:
        Safe absolute path
    """
    # Sanitize inputs
    safe_city = re.sub(r'[^a-z0-9_-]', '', city.lower())
    safe_filename = validate_filename(filename)
    
    # Build path
    city_dir = os.path.join(base_dir, safe_city)
    
    # Create directories if needed
    if create_dirs:
        os.makedirs(city_dir, exist_ok=True)
    
    # Absolute path
    filepath = os.path.abspath(os.path.join(city_dir, safe_filename))
    
    # Security check: ensure path is within base_dir
    base_abs = os.path.abspath(base_dir)
    if not filepath.startswith(base_abs):
        raise FileValidationError(
            'Invalid path: directory traversal detected',
            'PATH_TRAVERSAL'
        )
    
    return filepath
