"""
Centralized error handlers for Flask application.
Provides consistent error responses and logging.
"""

from flask import jsonify
import traceback
import sys


def register_error_handlers(app):
    """
    Register all error handlers with Flask app.
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors."""
        return jsonify({
            'error': 'Bad Request',
            'message': str(error),
            'code': 'BAD_REQUEST'
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors."""
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found',
            'code': 'NOT_FOUND'
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Handle 405 Method Not Allowed errors."""
        return jsonify({
            'error': 'Method Not Allowed',
            'message': str(error),
            'code': 'METHOD_NOT_ALLOWED'
        }), 405
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        """Handle 413 Request Entity Too Large errors."""
        return jsonify({
            'error': 'Request Too Large',
            'message': 'The request payload is too large',
            'code': 'REQUEST_TOO_LARGE'
        }), 413
    
    @app.errorhandler(429)
    def too_many_requests(error):
        """Handle 429 Too Many Requests errors."""
        return jsonify({
            'error': 'Too Many Requests',
            'message': 'Rate limit exceeded. Please try again later.',
            'code': 'RATE_LIMIT_EXCEEDED'
        }), 429
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle 500 Internal Server Error."""
        # Log the full error for debugging
        print(f'❌ Internal Server Error: {error}', file=sys.stderr)
        traceback.print_exc()
        
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'code': 'INTERNAL_ERROR'
        }), 500
    
    @app.errorhandler(503)
    def service_unavailable(error):
        """Handle 503 Service Unavailable errors."""
        return jsonify({
            'error': 'Service Unavailable',
            'message': 'The service is temporarily unavailable',
            'code': 'SERVICE_UNAVAILABLE'
        }), 503
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle any unexpected exceptions."""
        print(f'❌ Unexpected Error: {error}', file=sys.stderr)
        traceback.print_exc()
        
        # Don't expose internal error details in production
        return jsonify({
            'error': 'Unexpected Error',
            'message': 'An unexpected error occurred',
            'code': 'UNEXPECTED_ERROR',
            'type': type(error).__name__
        }), 500


def handle_validation_error(error):
    """
    Handle validation errors from validators.
    
    Args:
        error: ValidationError instance
    
    Returns:
        JSON response tuple
    """
    return jsonify({
        'error': error.message,
        'code': error.code,
        'field': getattr(error, 'field', None)
    }), 400


def handle_file_validation_error(error):
    """
    Handle file validation errors.
    
    Args:
        error: FileValidationError instance
    
    Returns:
        JSON response tuple
    """
    return jsonify({
        'error': error.message,
        'code': error.code
    }), 400


def handle_geo_validation_error(error):
    """
    Handle geographic validation errors.
    
    Args:
        error: GeoValidationError instance
    
    Returns:
        JSON response tuple
    """
    return jsonify({
        'error': error.message,
        'code': error.code
    }), 400


def handle_circuit_breaker_error(error):
    """
    Handle circuit breaker errors.
    
    Args:
        error: CircuitBreakerError instance
    
    Returns:
        JSON response tuple
    """
    return jsonify({
        'error': str(error),
        'code': 'SERVICE_UNAVAILABLE',
        'retry_after': 60
    }), 503


def create_error_response(message, code='ERROR', status=400, **extra_fields):
    """
    Create a standardized error response.
    
    Args:
        message: Error message
        code: Error code
        status: HTTP status code
        **extra_fields: Additional fields to include
    
    Returns:
        JSON response tuple
    """
    response = {
        'error': message,
        'code': code
    }
    response.update(extra_fields)
    
    return jsonify(response), status


def create_success_response(data=None, message=None, **extra_fields):
    """
    Create a standardized success response.
    
    Args:
        data: Response data
        message: Success message
        **extra_fields: Additional fields to include
    
    Returns:
        JSON response
    """
    response = {
        'success': True
    }
    
    if message:
        response['message'] = message
    
    if data is not None:
        if isinstance(data, dict):
            response.update(data)
        else:
            response['data'] = data
    
    response.update(extra_fields)
    
    return jsonify(response)


class APIError(Exception):
    """Base exception for API errors."""
    def __init__(self, message, code='API_ERROR', status=400):
        self.message = message
        self.code = code
        self.status = status
        super().__init__(self.message)
    
    def to_response(self):
        """Convert to Flask JSON response."""
        return create_error_response(self.message, self.code, self.status)


class ValidationAPIError(APIError):
    """Validation error."""
    def __init__(self, message, field=None):
        super().__init__(message, code='VALIDATION_ERROR', status=400)
        self.field = field
    
    def to_response(self):
        return create_error_response(
            self.message,
            self.code,
            self.status,
            field=self.field
        )


class NotFoundAPIError(APIError):
    """Resource not found error."""
    def __init__(self, message='Resource not found'):
        super().__init__(message, code='NOT_FOUND', status=404)


class UnauthorizedAPIError(APIError):
    """Unauthorized access error."""
    def __init__(self, message='Unauthorized'):
        super().__init__(message, code='UNAUTHORIZED', status=401)


class ForbiddenAPIError(APIError):
    """Forbidden access error."""
    def __init__(self, message='Forbidden'):
        super().__init__(message, code='FORBIDDEN', status=403)


class RateLimitAPIError(APIError):
    """Rate limit exceeded error."""
    def __init__(self, message='Rate limit exceeded', retry_after=60):
        super().__init__(message, code='RATE_LIMIT_EXCEEDED', status=429)
        self.retry_after = retry_after
    
    def to_response(self):
        return create_error_response(
            self.message,
            self.code,
            self.status,
            retry_after=self.retry_after
        )
