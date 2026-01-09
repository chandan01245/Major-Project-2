"""
AQI (Air Quality Index) data validation.
Validates AQI values and forecasts for safety and reasonableness.
"""

import math


class AQIValidationError(Exception):
    """Custom exception for AQI validation errors."""
    pass


def validate_aqi_value(aqi_value, field_name='AQI'):
    """
    Validate AQI value.
    
    Args:
        aqi_value: AQI value to validate
        field_name: Field name for error messages
    
    Returns:
        Validated AQI value (clamped to valid range)
    
    Raises:
        AQIValidationError: If value is completely invalid
    """
    # Convert to number
    try:
        aqi_value = float(aqi_value)
    except (TypeError, ValueError):
        raise AQIValidationError(f'{field_name} must be numeric')
    
    # Check for NaN/Inf
    if math.isnan(aqi_value):
        raise AQIValidationError(f'{field_name} cannot be NaN')
    
    if math.isinf(aqi_value):
        raise AQIValidationError(f'{field_name} cannot be infinite')
    
    # AQI scale is 0-500 (though can go higher in extreme cases)
    # Negative values are invalid
    if aqi_value < 0:
        print(f'⚠️  Warning: Negative {field_name} value {aqi_value}, setting to 0')
        aqi_value = 0
    
    # Extremely high values are suspicious
    if aqi_value > 1000:
        print(f'⚠️  Warning: Extremely high {field_name} value {aqi_value}, capping at 500')
        aqi_value = 500
    
    return int(aqi_value)


def validate_aqi_forecast(forecast, days=30):
    """
    Validate AQI forecast array.
    
    Args:
        forecast: List of AQI forecast values
        days: Expected number of days
    
    Returns:
        Validated forecast list
    """
    if not isinstance(forecast, list):
        raise AQIValidationError('Forecast must be a list')
    
    if len(forecast) == 0:
        raise AQIValidationError('Forecast cannot be empty')
    
    if len(forecast) > days * 2:
        print(f'⚠️  Warning: Forecast has {len(forecast)} days, expected around {days}')
    
    validated_forecast = []
    for i, value in enumerate(forecast):
        try:
            validated_value = validate_aqi_value(value, f'Forecast day {i+1}')
            validated_forecast.append(validated_value)
        except AQIValidationError as e:
            print(f'⚠️  Warning: {e.message}, using interpolated value')
            # Use previous value or 100 as fallback
            fallback = validated_forecast[-1] if validated_forecast else 100
            validated_forecast.append(fallback)
    
    return validated_forecast


def validate_historical_aqi(historical_data):
    """
    Validate historical AQI data.
    
    Args:
        historical_data: List of dicts with 'aqi' and 'date' keys
    
    Returns:
        Validated historical data list
    """
    if not isinstance(historical_data, list):
        raise AQIValidationError('Historical data must be a list')
    
    validated = []
    for i, entry in enumerate(historical_data):
        if not isinstance(entry, dict):
            print(f'⚠️  Warning: Historical data entry {i} is not a dict, skipping')
            continue
        
        if 'aqi' not in entry:
            print(f'⚠️  Warning: Historical data entry {i} missing AQI value, skipping')
            continue
        
        try:
            validated_aqi = validate_aqi_value(entry['aqi'], f'Historical AQI[{i}]')
            validated_entry = {
                'aqi': validated_aqi,
                'date': entry.get('date', ''),
                'synthetic': entry.get('synthetic', False)
            }
            validated.append(validated_entry)
        except AQIValidationError:
            print(f'⚠️  Warning: Invalid historical AQI at index {i}, skipping')
            continue
    
    return validated


def get_aqi_category(aqi_value):
    """
    Get AQI category from value.
    
    Args:
        aqi_value: AQI value
    
    Returns:
        Category dict with level, color, description
    """
    aqi_value = validate_aqi_value(aqi_value)
    
    if aqi_value <= 50:
        return {
            'level': 'Good',
            'color': '#00E400',
            'description': 'Air quality is satisfactory'
        }
    elif aqi_value <= 100:
        return {
            'level': 'Moderate',
            'color': '#FFFF00',
            'description': 'Air quality is acceptable'
        }
    elif aqi_value <= 150:
        return {
            'level': 'Unhealthy for Sensitive Groups',
            'color': '#FF7E00',
            'description': 'Members of sensitive groups may experience health effects'
        }
    elif aqi_value <= 200:
        return {
            'level': 'Unhealthy',
            'color': '#FF0000',
            'description': 'Everyone may begin to experience health effects'
        }
    elif aqi_value <= 300:
        return {
            'level': 'Very Unhealthy',
            'color': '#8F3F97',
            'description': 'Health alert: everyone may experience serious health effects'
        }
    else:
        return {
            'level': 'Hazardous',
            'color': '#7E0023',
            'description': 'Health warning of emergency conditions'
        }


def sanitize_aqi_data(aqi_data):
    """
    Sanitize complete AQI data response.
    
    Args:
        aqi_data: Dict with AQI data from WAQI
    
    Returns:
        Sanitized AQI data dict
    """
    if not isinstance(aqi_data, dict):
        return None
    
    sanitized = {}
    
    # Validate main AQI value
    if 'aqi' in aqi_data:
        try:
            sanitized['aqi'] = validate_aqi_value(aqi_data['aqi'])
        except AQIValidationError:
            return None
    else:
        return None
    
    # Copy safe string fields
    sanitized['city'] = str(aqi_data.get('city', 'Unknown'))[:100]
    sanitized['time'] = str(aqi_data.get('time', ''))[:50]
    sanitized['dominentpol'] = str(aqi_data.get('dominentpol', 'pm25'))[:20]
    
    # Validate pollutants
    if 'pollutants' in aqi_data and isinstance(aqi_data['pollutants'], dict):
        sanitized['pollutants'] = {}
        for pollutant, value in aqi_data['pollutants'].items():
            try:
                if isinstance(value, (int, float)) and not math.isnan(value) and not math.isinf(value):
                    sanitized['pollutants'][pollutant] = max(0, value)
            except:
                pass
    
    # Validate station info
    if 'station' in aqi_data and isinstance(aqi_data['station'], dict):
        sanitized['station'] = {
            'name': str(aqi_data['station'].get('name', ''))[:100],
            'geo': aqi_data['station'].get('geo', [0, 0])
        }
    
    return sanitized


def check_aqi_spike(historical_values, current_value, spike_threshold=2.0):
    """
    Check if current AQI value is a suspicious spike from historical values.
    
    Args:
        historical_values: List of recent AQI values
        current_value: Current AQI value
        spike_threshold: Multiplier to consider a spike (e.g., 2.0 = 200% increase)
    
    Returns:
        (is_spike, message)
    """
    if not historical_values or len(historical_values) < 3:
        return False, None
    
    try:
        # Calculate recent average
        recent_avg = sum(historical_values[-5:]) / min(len(historical_values), 5)
        
        # Check if current is much higher
        if current_value > recent_avg * spike_threshold:
            return True, f'Suspicious AQI spike: {current_value} vs recent average {recent_avg:.0f}'
        
        return False, None
    except:
        return False, None


def get_safe_aqi_fallback():
    """
    Get safe fallback AQI data.
    
    Returns:
        Default AQI dict
    """
    return {
        'aqi': 100,
        'city': 'Unknown',
        'time': '',
        'dominentpol': 'pm25',
        'pollutants': {},
        'category': get_aqi_category(100),
        'fallback': True
    }
