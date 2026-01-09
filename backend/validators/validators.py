"""
Input validation utilities for API requests.
Provides decorators and functions for validating request data.
"""

from functools import wraps
from flask import request, jsonify
import re


def validate_json(*required_fields):
    """
    Decorator to validate JSON request body.
    Checks for presence of required fields and valid JSON format.
    
    Usage:
        @app.route('/api/endpoint', methods=['POST'])
        @validate_json('field1', 'field2')
        def endpoint():
            data = request.json
            # data is guaranteed to have field1 and field2
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if request has JSON content type
            if not request.is_json:
                return jsonify({
                    'error': 'Content-Type must be application/json',
                    'code': 'INVALID_CONTENT_TYPE'
                }), 400
            
            # Try to parse JSON
            try:
                data = request.json
            except Exception as e:
                return jsonify({
                    'error': 'Invalid JSON format',
                    'code': 'INVALID_JSON',
                    'details': str(e)
                }), 400
            
            # Check for None (empty body)
            if data is None:
                return jsonify({
                    'error': 'Request body is empty',
                    'code': 'EMPTY_BODY'
                }), 400
            
            # Check required fields
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return jsonify({
                    'error': f'Missing required fields: {", ".join(missing_fields)}',
                    'code': 'MISSING_FIELDS',
                    'missing': missing_fields
                }), 400
            
            # Check for null values in required fields
            null_fields = [field for field in required_fields if data.get(field) is None]
            if null_fields:
                return jsonify({
                    'error': f'Required fields cannot be null: {", ".join(null_fields)}',
                    'code': 'NULL_VALUES',
                    'null_fields': null_fields
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_optional_json(f):
    """
    Decorator for endpoints that accept optional JSON.
    Returns empty dict if no JSON provided.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.is_json:
            try:
                data = request.json
                if data is None:
                    request._cached_json = ({}, None)
            except Exception:
                return jsonify({
                    'error': 'Invalid JSON format',
                    'code': 'INVALID_JSON'
                }), 400
        return f(*args, **kwargs)
    return decorated_function


def validate_string(value, min_length=None, max_length=None, pattern=None, field_name="field"):
    """
    Validate string value.
    
    Args:
        value: String to validate
        min_length: Minimum length (inclusive)
        max_length: Maximum length (inclusive)
        pattern: Regex pattern to match
        field_name: Name of field for error messages
    
    Returns:
        (is_valid, error_message)
    """
    if not isinstance(value, str):
        return False, f"{field_name} must be a string"
    
    if min_length is not None and len(value) < min_length:
        return False, f"{field_name} must be at least {min_length} characters"
    
    if max_length is not None and len(value) > max_length:
        return False, f"{field_name} must be at most {max_length} characters"
    
    if pattern is not None:
        if not re.match(pattern, value):
            return False, f"{field_name} format is invalid"
    
    return True, None


def validate_number(value, min_value=None, max_value=None, allow_float=True, field_name="field"):
    """
    Validate numeric value.
    
    Args:
        value: Number to validate
        min_value: Minimum value (inclusive)
        max_value: Maximum value (inclusive)
        allow_float: Whether to allow float values
        field_name: Name of field for error messages
    
    Returns:
        (is_valid, error_message)
    """
    if not isinstance(value, (int, float)):
        return False, f"{field_name} must be a number"
    
    if not allow_float and isinstance(value, float) and not value.is_integer():
        return False, f"{field_name} must be an integer"
    
    # Check for special values
    if isinstance(value, float):
        if value != value:  # NaN check
            return False, f"{field_name} cannot be NaN"
        if value == float('inf') or value == float('-inf'):
            return False, f"{field_name} cannot be infinite"
    
    if min_value is not None and value < min_value:
        return False, f"{field_name} must be at least {min_value}"
    
    if max_value is not None and value > max_value:
        return False, f"{field_name} must be at most {max_value}"
    
    return True, None


def validate_array(value, min_length=None, max_length=None, item_validator=None, field_name="field"):
    """
    Validate array value.
    
    Args:
        value: Array to validate
        min_length: Minimum array length
        max_length: Maximum array length
        item_validator: Function to validate each item (validator_func(item) -> (bool, error))
        field_name: Name of field for error messages
    
    Returns:
        (is_valid, error_message)
    """
    if not isinstance(value, list):
        return False, f"{field_name} must be an array"
    
    if min_length is not None and len(value) < min_length:
        return False, f"{field_name} must have at least {min_length} items"
    
    if max_length is not None and len(value) > max_length:
        return False, f"{field_name} must have at most {max_length} items"
    
    if item_validator is not None:
        for i, item in enumerate(value):
            is_valid, error = item_validator(item)
            if not is_valid:
                return False, f"{field_name}[{i}]: {error}"
    
    return True, None


def validate_enum(value, allowed_values, field_name="field", case_sensitive=True):
    """
    Validate that value is in allowed set.
    
    Args:
        value: Value to validate
        allowed_values: List/set of allowed values
        field_name: Name of field for error messages
        case_sensitive: Whether string comparison is case-sensitive
    
    Returns:
        (is_valid, error_message)
    """
    if not case_sensitive and isinstance(value, str):
        value = value.lower()
        allowed_values = [v.lower() if isinstance(v, str) else v for v in allowed_values]
    
    if value not in allowed_values:
        return False, f"{field_name} must be one of: {', '.join(map(str, allowed_values))}"
    
    return True, None


def sanitize_string(value, max_length=1000, strip=True, remove_null_bytes=True):
    """
    Sanitize string input to prevent injection attacks.
    
    Args:
        value: String to sanitize
        max_length: Maximum allowed length
        strip: Whether to strip whitespace
        remove_null_bytes: Whether to remove null bytes
    
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        return str(value)
    
    # Remove null bytes
    if remove_null_bytes:
        value = value.replace('\x00', '')
    
    # Strip whitespace
    if strip:
        value = value.strip()
    
    # Truncate to max length
    if len(value) > max_length:
        value = value[:max_length]
    
    return value


def validate_request_size(max_size_mb=50):
    """
    Decorator to validate request content length.
    
    Args:
        max_size_mb: Maximum request size in megabytes
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            content_length = request.content_length
            if content_length and content_length > max_size_mb * 1024 * 1024:
                return jsonify({
                    'error': f'Request size exceeds maximum allowed ({max_size_mb}MB)',
                    'code': 'REQUEST_TOO_LARGE',
                    'max_size_mb': max_size_mb
                }), 413
            return f(*args, **kwargs)
        return decorated_function
    return decorator


class ValidationError(Exception):
    """Custom exception for validation errors."""
    def __init__(self, message, code='VALIDATION_ERROR', field=None):
        self.message = message
        self.code = code
        self.field = field
        super().__init__(self.message)
    
    def to_dict(self):
        return {
            'error': self.message,
            'code': self.code,
            'field': self.field
        }
