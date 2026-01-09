"""
ML Model safeguards for zoning predictions.
Validates inputs, outputs, and model state for the ML model.
"""

import numpy as np
import math
from typing import Dict, Any, List


class MLValidationError(Exception):
    """Custom exception for ML validation errors."""
    def __init__(self, message, code='ML_VALIDATION_ERROR'):
        self.message = message
        self.code = code
        super().__init__(self.message)


def validate_features(features, expected_feature_names=None):
    """
    Validate feature dictionary for ML prediction.
    
    Args:
        features: Dict of feature values
        expected_feature_names: List of expected feature names (optional)
    
    Returns:
        Validated features dict
    
    Raises:
        MLValidationError: If validation fails
    """
    if not isinstance(features, dict):
        raise MLValidationError(
            'Features must be a dictionary',
            'INVALID_TYPE'
        )
    
    if len(features) == 0:
        raise MLValidationError(
            'Features dictionary is empty',
            'EMPTY_FEATURES'
        )
    
    # Check for expected features if provided
    if expected_feature_names:
        missing_features = set(expected_feature_names) - set(features.keys())
        if missing_features:
            raise MLValidationError(
                f'Missing required features: {", ".join(missing_features)}',
                'MISSING_FEATURES'
            )
    
    # Validate each feature value
    validated_features = {}
    for name, value in features.items():
        validated_value = validate_feature_value(value, name)
        validated_features[name] = validated_value
    
    return validated_features


def validate_feature_value(value, feature_name='feature'):
    """
    Validate individual feature value.
    
    Args:
        value: Feature value
        feature_name: Name of feature for error messages
    
    Returns:
        Validated value (converted to float)
    
    Raises:
        MLValidationError: If validation fails
    """
    # Try to convert to float
    try:
        value = float(value)
    except (TypeError, ValueError):
        raise MLValidationError(
            f'{feature_name} must be a numeric value (got {type(value).__name__})',
            'INVALID_FEATURE_TYPE'
        )
    
    # Check for NaN
    if math.isnan(value):
        raise MLValidationError(
            f'{feature_name} cannot be NaN',
            'NAN_VALUE'
        )
    
    # Check for infinity
    if math.isinf(value):
        raise MLValidationError(
            f'{feature_name} cannot be infinite',
            'INFINITE_VALUE'
        )
    
    # Check for extremely large values (potential overflow)
    if abs(value) > 1e10:
        raise MLValidationError(
            f'{feature_name} value is too large: {value}',
            'VALUE_TOO_LARGE'
        )
    
    return value


def validate_training_data(training_data, min_samples=10):
    """
    Validate training data before model training.
    
    Args:
        training_data: List of training samples
        min_samples: Minimum required samples for training
    
    Returns:
        (is_valid, error_message)
    """
    if not isinstance(training_data, list):
        return False, 'Training data must be a list'
    
    if len(training_data) < min_samples:
        return False, f'Insufficient training data: {len(training_data)} samples (minimum {min_samples} required)'
    
    # Check if all samples have consistent structure
    if len(training_data) > 0:
        first_sample = training_data[0]
        if not isinstance(first_sample, dict):
            return False, 'Training samples must be dictionaries'
        
        required_keys = set(first_sample.keys())
        for i, sample in enumerate(training_data[1:], 1):
            if not isinstance(sample, dict):
                return False, f'Sample {i} is not a dictionary'
            
            sample_keys = set(sample.keys())
            if sample_keys != required_keys:
                return False, f'Sample {i} has inconsistent keys'
    
    return True, None


def validate_model_exists(model):
    """
    Check if model exists and is trained.
    
    Args:
        model: Model object
    
    Returns:
        (is_valid, error_message)
    """
    if model is None:
        return False, 'Model is None'
    
    # Check if model has necessary attributes
    if not hasattr(model, 'predict'):
        return False, 'Model does not have predict method'
    
    return True, None


def sanitize_prediction(prediction):
    """
    Sanitize model prediction output.
    Replaces NaN/Inf with safe defaults.
    
    Args:
        prediction: Raw prediction value or array
    
    Returns:
        Sanitized prediction
    """
    if isinstance(prediction, (list, np.ndarray)):
        sanitized = []
        for value in prediction:
            sanitized.append(_sanitize_single_value(value))
        return sanitized if isinstance(prediction, list) else np.array(sanitized)
    else:
        return _sanitize_single_value(prediction)


def _sanitize_single_value(value):
    """Sanitize a single numeric value."""
    if not isinstance(value, (int, float, np.number)):
        return 0.0
    
    if math.isnan(value):
        return 0.0
    
    if math.isinf(value):
        return 0.0 if value < 0 else 100.0
    
    return float(value)


def validate_far_value(far_value):
    """
    Validate FAR (Floor Area Ratio) prediction.
    
    Args:
        far_value: Predicted FAR value
    
    Returns:
        Validated FAR value
    
    Raises:
        MLValidationError: If value is invalid
    """
    far_value = validate_feature_value(far_value, 'FAR')
    
    # FAR typically ranges from 0.5 to 5.0 in most cities
    # Values outside this range are suspicious
    if far_value < 0:
        raise MLValidationError(
            'FAR cannot be negative',
            'INVALID_FAR'
        )
    
    if far_value > 10:
        # Very high FAR - warn but don't fail
        print(f'⚠️  Warning: Very high FAR predicted: {far_value}')
    
    return far_value


def validate_height_value(height_value):
    """
    Validate building height prediction.
    
    Args:
        height_value: Predicted height in meters
    
    Returns:
        Validated height value
    
    Raises:
        MLValidationError: If value is invalid
    """
    height_value = validate_feature_value(height_value, 'height')
    
    if height_value < 0:
        raise MLValidationError(
            'Height cannot be negative',
            'INVALID_HEIGHT'
        )
    
    if height_value > 1000:
        # Extremely tall building - probably an error
        raise MLValidationError(
            f'Height value too large: {height_value}m',
            'INVALID_HEIGHT'
        )
    
    return height_value


def validate_coverage_value(coverage_value):
    """
    Validate ground coverage percentage.
    
    Args:
        coverage_value: Predicted coverage percentage (0-100)
    
    Returns:
        Validated coverage value
    
    Raises:
        MLValidationError: If value is invalid
    """
    coverage_value = validate_feature_value(coverage_value, 'coverage')
    
    if coverage_value < 0 or coverage_value > 100:
        raise MLValidationError(
            f'Coverage must be between 0 and 100 (got {coverage_value})',
            'INVALID_COVERAGE'
        )
    
    return coverage_value


def validate_zone_type(zone_type, allowed_types=None):
    """
    Validate zone type classification.
    
    Args:
        zone_type: Predicted zone type
        allowed_types: List of allowed zone types
    
    Returns:
        Validated zone type
    
    Raises:
        MLValidationError: If value is invalid
    """
    if allowed_types is None:
        allowed_types = ['residential', 'commercial', 'industrial', 'mixed']
    
    if not isinstance(zone_type, str):
        raise MLValidationError(
            'Zone type must be a string',
            'INVALID_ZONE_TYPE'
        )
    
    zone_type_lower = zone_type.lower().strip()
    
    if zone_type_lower not in allowed_types:
        raise MLValidationError(
            f'Invalid zone type: {zone_type}. Must be one of: {", ".join(allowed_types)}',
            'INVALID_ZONE_TYPE'
        )
    
    return zone_type_lower


def validate_prediction_output(prediction_dict):
    """
    Validate complete prediction output dictionary.
    
    Args:
        prediction_dict: Dict with prediction results
    
    Returns:
        Validated prediction dict
    
    Raises:
        MLValidationError: If validation fails
    """
    if not isinstance(prediction_dict, dict):
        raise MLValidationError(
            'Prediction output must be a dictionary',
            'INVALID_OUTPUT_TYPE'
        )
    
    # Check for required fields
    if 'attributes' in prediction_dict:
        attributes = prediction_dict['attributes']
        
        # Validate each attribute if present
        if 'far' in attributes:
            try:
                attributes['far'] = validate_far_value(attributes['far'])
            except MLValidationError:
                attributes['far'] = 2.0  # Default fallback
        
        if 'maxHeight' in attributes:
            try:
                attributes['maxHeight'] = validate_height_value(attributes['maxHeight'])
            except MLValidationError:
                attributes['maxHeight'] = 15.0  # Default fallback
        
        if 'groundCoverage' in attributes:
            try:
                attributes['groundCoverage'] = validate_coverage_value(attributes['groundCoverage'])
            except MLValidationError:
                attributes['groundCoverage'] = 50.0  # Default fallback
        
        if 'zoneType' in attributes:
            try:
                attributes['zoneType'] = validate_zone_type(attributes['zoneType'])
            except MLValidationError:
                attributes['zoneType'] = 'residential'  # Default fallback
    
    # Validate confidence score if present
    if 'confidence' in prediction_dict:
        confidence = prediction_dict['confidence']
        if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 100:
            prediction_dict['confidence'] = 50.0  # Default medium confidence
    
    return prediction_dict


def check_feature_range(features, feature_statistics=None):
    """
    Check if features are within expected range based on training data statistics.
    
    Args:
        features: Feature dict
        feature_statistics: Dict of {feature_name: {'min': x, 'max': y, 'mean': z}}
    
    Returns:
        List of warnings for out-of-range features
    """
    warnings = []
    
    if feature_statistics is None:
        return warnings
    
    for feature_name, value in features.items():
        if feature_name not in feature_statistics:
            continue
        
        stats = feature_statistics[feature_name]
        min_val = stats.get('min', float('-inf'))
        max_val = stats.get('max', float('inf'))
        mean_val = stats.get('mean', 0)
        
        # Check if significantly outside training range
        if value < min_val - abs(mean_val) * 0.5:
            warnings.append(
                f'{feature_name} value {value} is below training range (min: {min_val})'
            )
        elif value > max_val + abs(mean_val) * 0.5:
            warnings.append(
                f'{feature_name} value {value} is above training range (max: {max_val})'
            )
    
    return warnings


def get_default_prediction():
    """
    Get default/fallback prediction when model fails.
    
    Returns:
        Default prediction dict
    """
    return {
        'attributes': {
            'zoneType': 'residential',
            'far': 2.0,
            'maxHeight': 15.0,
            'groundCoverage': 50.0,
            'setback': 5.0,
            'parking': '1 per 100 sqm'
        },
        'confidence': 30.0,  # Low confidence for default
        'model_version': 'default',
        'fallback': True
    }
