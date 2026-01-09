"""
Flood model safeguards and validation.
Ensures flood predictions are safe and reasonable.
"""

import math


class FloodValidationError(Exception):
    """Custom exception for flood validation errors."""
    pass


def validate_weather_data(weather_data):
    """
    Validate weather data input for flood prediction.
    
    Args:
        weather_data: Dict with rainfall, temperature, humidity, pressure, elevation
    
    Returns:
        Validated weather data dict
    
    Raises:
        FloodValidationError: If validation fails
    """
    required_fields = ['rainfall', 'temperature', 'humidity', 'pressure', 'elevation']
    validated = {}
    
    for field in required_fields:
        if field not in weather_data:
            raise FloodValidationError(f'Missing required field: {field}')
        
        value = weather_data[field]
        
        # Convert to float
        try:
            value = float(value)
        except (TypeError, ValueError):
            raise FloodValidationError(f'{field} must be numeric')
        
        # Check for NaN/Inf
        if math.isnan(value) or math.isinf(value):
            raise FloodValidationError(f'{field} cannot be NaN or infinite')
        
        # Field-specific validation
        if field == 'rainfall' and (value < 0 or value > 2000):
            raise FloodValidationError(f'Rainfall must be between 0-2000mm (got {value})')
        
        if field == 'temperature' and (value < -50 or value > 60):
            raise FloodValidationError(f'Temperature must be between -50 and 60°C (got {value})')
        
        if field == 'humidity' and (value < 0 or value > 100):
            raise FloodValidationError(f'Humidity must be between 0-100% (got {value})')
        
        if field == 'pressure' and (value < 900 or value > 1100):
            raise FloodValidationError(f'Pressure must be between 900-1100 hPa (got {value})')
        
        if field == 'elevation' and (value < -500 or value > 9000):
            raise FloodValidationError(f'Elevation must be between -500 and 9000m (got {value})')
        
        validated[field] = value
    
    return validated


def validate_flood_prediction(prediction):
    """
    Validate flood prediction output.
    
    Args:
        prediction: Dict with riskScore, riskLevel, description, depthInches
    
    Returns:
        Validated prediction dict
    """
    if not isinstance(prediction, dict):
        prediction = {}
    
    # Validate risk score (0-100)
    risk_score = prediction.get('riskScore', 0)
    if not isinstance(risk_score, (int, float)) or math.isnan(risk_score) or math.isinf(risk_score):
        risk_score = 0
    risk_score = max(0, min(100, risk_score))
    prediction['riskScore'] = round(risk_score, 2)
    
    # Validate risk level
    risk_level = prediction.get('riskLevel', 'Low')
    if risk_level not in ['Low', 'Medium', 'High', 'Very High']:
        risk_level = _calculate_risk_level(risk_score)
    prediction['riskLevel'] = risk_level
    
    # Validate depth
    depth = prediction.get('depthInches', 0)
    if not isinstance(depth, (int, float)) or math.isnan(depth) or math.isinf(depth):
        depth = 0
    depth = max(0, depth)
    prediction['depthInches'] = round(depth, 1)
    
    # Ensure description exists
    if 'description' not in prediction or not prediction['description']:
        prediction['description'] = f'{risk_level} flood risk'
    
    return prediction


def _calculate_risk_level(risk_score):
    """Calculate risk level from score."""
    if risk_score < 25:
        return 'Low'
    elif risk_score < 50:
        return 'Medium'
    elif risk_score < 75:
        return 'High'
    else:
        return 'Very High'


def validate_future_predictions(future_predictions):
    """
    Validate future flood prediction scenarios.
    
    Args:
        future_predictions: List of future scenario predictions
    
    Returns:
        Validated future predictions list
    """
    if not isinstance(future_predictions, list):
        return []
    
    validated = []
    for pred in future_predictions:
        if isinstance(pred, dict):
            validated.append(validate_flood_prediction(pred))
    
    return validated


def get_safe_flood_fallback():
    """
    Get safe fallback flood prediction.
    
    Returns:
        Default flood prediction dict
    """
    return {
        'riskScore': 25.0,
        'riskLevel': 'Low',
        'description': 'Flood risk assessment unavailable, showing conservative estimate',
        'depthInches': 0,
        'elevation': 10,
        'fallback': True
    }
