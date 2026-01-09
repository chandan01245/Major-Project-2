"""
Geographic coordinate validation utilities.
Validates latitude, longitude, polygons, and geographic data.
"""

import math
from typing import List, Tuple, Union


class GeoValidationError(Exception):
    """Custom exception for geographic validation errors."""
    def __init__(self, message, code='GEO_VALIDATION_ERROR'):
        self.message = message
        self.code = code
        super().__init__(self.message)


def validate_latitude(lat, field_name='latitude'):
    """
    Validate latitude value.
    
    Args:
        lat: Latitude value
        field_name: Field name for error messages
    
    Returns:
        Validated latitude (float)
    
    Raises:
        GeoValidationError: If validation fails
    """
    try:
        lat = float(lat)
    except (TypeError, ValueError):
        raise GeoValidationError(
            f'{field_name} must be a number',
            'INVALID_TYPE'
        )
    
    # Check for special values
    if math.isnan(lat):
        raise GeoValidationError(f'{field_name} cannot be NaN', 'INVALID_VALUE')
    
    if math.isinf(lat):
        raise GeoValidationError(f'{field_name} cannot be infinite', 'INVALID_VALUE')
    
    # Validate range
    if lat < -90 or lat > 90:
        raise GeoValidationError(
            f'{field_name} must be between -90 and 90 (got {lat})',
            'OUT_OF_RANGE'
        )
    
    return lat


def validate_longitude(lng, field_name='longitude'):
    """
    Validate longitude value.
    
    Args:
        lng: Longitude value
        field_name: Field name for error messages
    
    Returns:
        Validated longitude (float)
    
    Raises:
        GeoValidationError: If validation fails
    """
    try:
        lng = float(lng)
    except (TypeError, ValueError):
        raise GeoValidationError(
            f'{field_name} must be a number',
            'INVALID_TYPE'
        )
    
    # Check for special values
    if math.isnan(lng):
        raise GeoValidationError(f'{field_name} cannot be NaN', 'INVALID_VALUE')
    
    if math.isinf(lng):
        raise GeoValidationError(f'{field_name} cannot be infinite', 'INVALID_VALUE')
    
    # Validate range
    if lng < -180 or lng > 180:
        raise GeoValidationError(
            f'{field_name} must be between -180 and 180 (got {lng})',
            'OUT_OF_RANGE'
        )
    
    return lng


def validate_coordinates(lat, lng):
    """
    Validate latitude and longitude pair.
    
    Args:
        lat: Latitude
        lng: Longitude
    
    Returns:
        Tuple of (validated_lat, validated_lng)
    
    Raises:
        GeoValidationError: If validation fails
    """
    lat = validate_latitude(lat)
    lng = validate_longitude(lng)
    
    return lat, lng


def validate_coordinate_pair(coord, field_name='coordinate'):
    """
    Validate a coordinate pair [lng, lat] (GeoJSON format).
    
    Args:
        coord: List/tuple of [longitude, latitude]
        field_name: Field name for error messages
    
    Returns:
        Validated coordinate pair [lng, lat]
    
    Raises:
        GeoValidationError: If validation fails
    """
    if not isinstance(coord, (list, tuple)):
        raise GeoValidationError(
            f'{field_name} must be a list or tuple',
            'INVALID_TYPE'
        )
    
    if len(coord) != 2:
        raise GeoValidationError(
            f'{field_name} must have exactly 2 values [lng, lat]',
            'INVALID_LENGTH'
        )
    
    lng, lat = coord
    lng = validate_longitude(lng, f'{field_name}[0] (longitude)')
    lat = validate_latitude(lat, f'{field_name}[1] (latitude)')
    
    return [lng, lat]


def validate_polygon(polygon, min_points=3, max_points=10000, field_name='polygon'):
    """
    Validate polygon coordinates.
    
    Args:
        polygon: List of coordinate pairs [[lng, lat], ...]
        min_points: Minimum number of points
        max_points: Maximum number of points (performance limit)
        field_name: Field name for error messages
    
    Returns:
        Validated polygon
    
    Raises:
        GeoValidationError: If validation fails
    """
    if not isinstance(polygon, list):
        raise GeoValidationError(
            f'{field_name} must be a list',
            'INVALID_TYPE'
        )
    
    if len(polygon) < min_points:
        raise GeoValidationError(
            f'{field_name} must have at least {min_points} points (got {len(polygon)})',
            'TOO_FEW_POINTS'
        )
    
    if len(polygon) > max_points:
        raise GeoValidationError(
            f'{field_name} has too many points ({len(polygon)}). Maximum is {max_points}',
            'TOO_MANY_POINTS'
        )
    
    # Validate each coordinate
    validated_polygon = []
    for i, coord in enumerate(polygon):
        validated_coord = validate_coordinate_pair(coord, f'{field_name}[{i}]')
        validated_polygon.append(validated_coord)
    
    # Check if polygon is closed (first and last point should be the same for GeoJSON)
    # If not closed, we can auto-close it
    if validated_polygon[0] != validated_polygon[-1]:
        # Auto-close the polygon
        validated_polygon.append(validated_polygon[0])
    
    # Check for duplicate consecutive points
    for i in range(len(validated_polygon) - 1):
        if validated_polygon[i] == validated_polygon[i + 1]:
            raise GeoValidationError(
                f'{field_name} has duplicate consecutive points at index {i}',
                'DUPLICATE_POINTS'
            )
    
    return validated_polygon


def check_self_intersection(polygon):
    """
    Check if polygon is self-intersecting.
    Uses simple line segment intersection algorithm.
    
    Args:
        polygon: List of coordinate pairs
    
    Returns:
        (is_self_intersecting, intersection_info)
    """
    def ccw(A, B, C):
        """Check if three points are in counter-clockwise order."""
        return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])
    
    def segments_intersect(A, B, C, D):
        """Check if line segment AB intersects with CD."""
        return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)
    
    n = len(polygon)
    for i in range(n - 1):
        for j in range(i + 2, n - 1):
            # Don't check adjacent segments
            if j == i + 1 or (i == 0 and j == n - 2):
                continue
            
            if segments_intersect(polygon[i], polygon[i + 1], polygon[j], polygon[j + 1]):
                return True, f'Segments {i}-{i+1} and {j}-{j+1} intersect'
    
    return False, None


def validate_bbox(bbox, field_name='bbox'):
    """
    Validate bounding box [min_lng, min_lat, max_lng, max_lat].
    
    Args:
        bbox: Bounding box array
        field_name: Field name for error messages
    
    Returns:
        Validated bounding box
    
    Raises:
        GeoValidationError: If validation fails
    """
    if not isinstance(bbox, (list, tuple)):
        raise GeoValidationError(
            f'{field_name} must be a list or tuple',
            'INVALID_TYPE'
        )
    
    if len(bbox) != 4:
        raise GeoValidationError(
            f'{field_name} must have 4 values [min_lng, min_lat, max_lng, max_lat]',
            'INVALID_LENGTH'
        )
    
    min_lng, min_lat, max_lng, max_lat = bbox
    
    # Validate each coordinate
    min_lng = validate_longitude(min_lng, f'{field_name}[0] (min_lng)')
    min_lat = validate_latitude(min_lat, f'{field_name}[1] (min_lat)')
    max_lng = validate_longitude(max_lng, f'{field_name}[2] (max_lng)')
    max_lat = validate_latitude(max_lat, f'{field_name}[3] (max_lat)')
    
    # Check that min < max
    if min_lng >= max_lng:
        raise GeoValidationError(
            f'{field_name}: min_lng must be less than max_lng',
            'INVALID_BBOX'
        )
    
    if min_lat >= max_lat:
        raise GeoValidationError(
            f'{field_name}: min_lat must be less than max_lat',
            'INVALID_BBOX'
        )
    
    return [min_lng, min_lat, max_lng, max_lat]


def calculate_polygon_area(polygon):
    """
    Calculate area of polygon using Shoelace formula.
    Returns area in square degrees (approximate).
    
    Args:
        polygon: List of [lng, lat] coordinates
    
    Returns:
        Area in square degrees
    """
    if len(polygon) < 3:
        return 0
    
    area = 0
    n = len(polygon)
    
    for i in range(n - 1):
        area += polygon[i][0] * polygon[i + 1][1]
        area -= polygon[i + 1][0] * polygon[i][1]
    
    return abs(area) / 2


def validate_distance(distance, min_distance=0, max_distance=None, field_name='distance'):
    """
    Validate distance value (in kilometers).
    
    Args:
        distance: Distance value
        min_distance: Minimum allowed distance
        max_distance: Maximum allowed distance
        field_name: Field name for error messages
    
    Returns:
        Validated distance
    
    Raises:
        GeoValidationError: If validation fails
    """
    try:
        distance = float(distance)
    except (TypeError, ValueError):
        raise GeoValidationError(
            f'{field_name} must be a number',
            'INVALID_TYPE'
        )
    
    if math.isnan(distance) or math.isinf(distance):
        raise GeoValidationError(
            f'{field_name} must be a finite number',
            'INVALID_VALUE'
        )
    
    if distance < min_distance:
        raise GeoValidationError(
            f'{field_name} must be at least {min_distance}',
            'OUT_OF_RANGE'
        )
    
    if max_distance is not None and distance > max_distance:
        raise GeoValidationError(
            f'{field_name} must be at most {max_distance}',
            'OUT_OF_RANGE'
        )
    
    return distance


def is_point_in_ocean(lat, lng):
    """
    Simple heuristic to check if coordinates are likely in ocean.
    This is a basic check and not 100% accurate.
    
    Args:
        lat: Latitude
        lng: Longitude
    
    Returns:
        (possibly_in_ocean, reason)
    """
    # This is a very simplified check
    # A proper implementation would use a land/ocean dataset
    
    # Check if coordinates are in known ocean areas
    # (This is just a placeholder - would need proper ocean data)
    
    # For now, just check if it's far from major land masses
    # This is NOT accurate and should be replaced with proper ocean data
    
    return False, "Land/ocean check not implemented"


def normalize_longitude(lng):
    """
    Normalize longitude to -180 to 180 range.
    
    Args:
        lng: Longitude value
    
    Returns:
        Normalized longitude
    """
    while lng > 180:
        lng -= 360
    while lng < -180:
        lng += 360
    return lng


def haversine_distance(lat1, lng1, lat2, lng2):
    """
    Calculate distance between two points using Haversine formula.
    
    Args:
        lat1, lng1: First point coordinates
        lat2, lng2: Second point coordinates
    
    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(dlng / 2) ** 2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance
