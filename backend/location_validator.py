"""
Location validation utilities.
Prevents report generation for ocean locations and restricted areas.
"""

import requests
import logging
from typing import Dict, List, Tuple, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)


class LocationValidationError(Exception):
    """Raised when location validation fails."""
    pass


def is_location_over_ocean(lat: float, lon: float, timeout: int = 10) -> bool:
    """
    Check if coordinates are over ocean using reverse geocoding.
    
    Args:
        lat: Latitude
        lon: Longitude
        timeout: Request timeout in seconds
        
    Returns:
        True if location is over ocean, False if on land
        
    Raises:
        LocationValidationError: If validation fails
    """
    try:
        # Validate coordinates
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            raise LocationValidationError(f"Invalid coordinates: ({lat}, {lon})")
        
        # Use Nominatim reverse geocoding
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            'lat': lat,
            'lon': lon,
            'format': 'json',
            'zoom': 10  # City level
        }
        headers = {
            'User-Agent': 'UrbanFormPro/1.0'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=timeout)
        
        # If no address found, likely ocean
        if response.status_code == 404:
            logger.info(f"Location ({lat}, {lon}) appears to be over ocean (404 from Nominatim)")
            return True
        
        if response.status_code != 200:
            logger.warning(f"Nominatim returned status {response.status_code}")
            # Don't block on API errors - allow the request
            return False
        
        data = response.json()
        
        # Check if response indicates water body
        if not data or 'error' in data:
            logger.info(f"Location ({lat}, {lon}) appears to be over ocean (no address)")
            return True
        
        # Check address type
        address_type = data.get('type', '').lower()
        water_types = ['sea', 'ocean', 'water', 'bay', 'strait', 'channel']
        
        if address_type in water_types:
            logger.info(f"Location ({lat}, {lon}) is over water (type: {address_type})")
            return True
        
        # Check if address exists
        address = data.get('address', {})
        
        # If no significant address components, likely ocean
        significant_keys = ['city', 'town', 'village', 'hamlet', 'suburb', 'country']
        has_significant_address = any(key in address for key in significant_keys)
        
        if not has_significant_address:
            logger.info(f"Location ({lat}, {lon}) has no significant address, likely ocean")
            return True
        
        logger.info(f"Location ({lat}, {lon}) validated as land")
        return False
        
    except requests.exceptions.Timeout:
        logger.warning(f"Timeout checking location ({lat}, {lon}), allowing request")
        return False  # Don't block on timeout
    except requests.exceptions.RequestException as e:
        logger.warning(f"Network error checking location: {e}, allowing request")
        return False  # Don't block on network errors
    except Exception as e:
        logger.error(f"Error validating location: {e}")
        return False  # Don't block on unexpected errors


def is_polygon_over_ocean(polygon: List[List[float]], sample_points: int = 5) -> Dict[str, any]:
    """
    Check if polygon is over ocean by sampling multiple points.
    
    Args:
        polygon: List of [lon, lat] coordinates
        sample_points: Number of points to sample from polygon
        
    Returns:
        Dict with validation result:
        {
            'is_ocean': bool,
            'ocean_points': int,
            'total_points': int,
            'percentage_ocean': float
        }
    """
    if not polygon or len(polygon) < 3:
        raise LocationValidationError("Invalid polygon: must have at least 3 points")
    
    # Calculate centroid
    centroid = calculate_polygon_centroid(polygon)
    
    # Sample points: centroid + vertices + midpoints
    points_to_check = []
    
    # Add centroid
    points_to_check.append(centroid)
    
    # Add every nth vertex
    step = max(1, len(polygon) // sample_points)
    for i in range(0, len(polygon) - 1, step):
        points_to_check.append([polygon[i][1], polygon[i][0]])  # lat, lon
    
    # Add some midpoints
    for i in range(0, min(3, len(polygon) - 1)):
        midpoint = [
            (polygon[i][1] + polygon[i + 1][1]) / 2,  # lat
            (polygon[i][0] + polygon[i + 1][0]) / 2   # lon
        ]
        points_to_check.append(midpoint)
    
    # Check each point
    ocean_count = 0
    total_points = len(points_to_check)
    
    for lat, lon in points_to_check:
        try:
            if is_location_over_ocean(lat, lon):
                ocean_count += 1
            # Add small delay to respect Nominatim rate limits
            import time
            time.sleep(0.5)
        except Exception as e:
            logger.warning(f"Error checking point ({lat}, {lon}): {e}")
    
    percentage_ocean = (ocean_count / total_points * 100) if total_points > 0 else 0
    is_ocean = percentage_ocean > 50  # If more than 50% is ocean, reject
    
    return {
        'is_ocean': is_ocean,
        'ocean_points': ocean_count,
        'total_points': total_points,
        'percentage_ocean': percentage_ocean
    }


def calculate_polygon_centroid(polygon: List[List[float]]) -> Tuple[float, float]:
    """
    Calculate centroid of polygon.
    
    Args:
        polygon: List of [lon, lat] coordinates
        
    Returns:
        Tuple of (lat, lon)
    """
    if not polygon:
        raise LocationValidationError("Empty polygon")
    
    # Remove last point if polygon is closed (first == last)
    coords = polygon[:-1] if polygon[0] == polygon[-1] else polygon
    
    if len(coords) == 0:
        raise LocationValidationError("Invalid polygon")
    
    # Simple centroid calculation (average of vertices)
    avg_lon = sum(coord[0] for coord in coords) / len(coords)
    avg_lat = sum(coord[1] for coord in coords) / len(coords)
    
    return (avg_lat, avg_lon)


def check_protected_areas(lat: float, lon: float, radius: int = 1000, timeout: int = 15) -> Dict[str, any]:
    """
    Check if location is in a protected area using Overpass API.
    
    Args:
        lat: Latitude
        lon: Longitude
        radius: Search radius in meters
        timeout: Request timeout in seconds
        
    Returns:
        Dict with:
        {
            'is_protected': bool,
            'areas': List[Dict],  # List of protected areas found
            'count': int
        }
    """
    try:
        # Overpass API query for protected areas
        overpass_url = "https://overpass-api.de/api/interpreter"
        
        # Query for various protected area types
        query = f"""
        [out:json][timeout:{timeout}];
        (
          node["boundary"="protected_area"](around:{radius},{lat},{lon});
          way["boundary"="protected_area"](around:{radius},{lat},{lon});
          relation["boundary"="protected_area"](around:{radius},{lat},{lon});
          
          node["boundary"="national_park"](around:{radius},{lat},{lon});
          way["boundary"="national_park"](around:{radius},{lat},{lon});
          relation["boundary"="national_park"](around:{radius},{lat},{lon});
          
          node["leisure"="nature_reserve"](around:{radius},{lat},{lon});
          way["leisure"="nature_reserve"](around:{radius},{lat},{lon});
          relation["leisure"="nature_reserve"](around:{radius},{lat},{lon});
          
          node["protect_class"](around:{radius},{lat},{lon});
          way["protect_class"](around:{radius},{lat},{lon});
          relation["protect_class"](around:{radius},{lat},{lon});
        );
        out tags;
        """
        
        response = requests.post(overpass_url, data={'data': query}, timeout=timeout)
        
        if response.status_code != 200:
            logger.warning(f"Overpass API returned status {response.status_code}")
            return {
                'is_protected': False,
                'areas': [],
                'count': 0,
                'error': f'API error: {response.status_code}'
            }
        
        data = response.json()
        elements = data.get('elements', [])
        
        # Extract protected area information
        protected_areas = []
        for element in elements:
            tags = element.get('tags', {})
            area_info = {
                'name': tags.get('name', 'Unnamed Protected Area'),
                'type': tags.get('boundary') or tags.get('leisure') or 'protected_area',
                'protect_class': tags.get('protect_class', 'unknown'),
                'designation': tags.get('designation', 'unknown')
            }
            protected_areas.append(area_info)
        
        is_protected = len(protected_areas) > 0
        
        if is_protected:
            logger.info(f"Location ({lat}, {lon}) is in {len(protected_areas)} protected area(s)")
        
        return {
            'is_protected': is_protected,
            'areas': protected_areas,
            'count': len(protected_areas)
        }
        
    except requests.exceptions.Timeout:
        logger.warning(f"Timeout checking protected areas for ({lat}, {lon})")
        return {
            'is_protected': False,
            'areas': [],
            'count': 0,
            'error': 'Timeout'
        }
    except Exception as e:
        logger.error(f"Error checking protected areas: {e}")
        return {
            'is_protected': False,
            'areas': [],
            'count': 0,
            'error': str(e)
        }


def validate_location_for_development(
    polygon: List[List[float]],
    check_ocean: bool = True,
    check_protected: bool = False,
    allow_protected: bool = False
) -> Dict[str, any]:
    """
    Comprehensive location validation for urban development.
    
    Args:
        polygon: List of [lon, lat] coordinates
        check_ocean: Whether to check for ocean
        check_protected: Whether to check for protected areas
        allow_protected: Whether to allow development in protected areas
        
    Returns:
        Dict with validation result:
        {
            'is_valid': bool,
            'errors': List[str],
            'warnings': List[str],
            'ocean_check': Dict or None,
            'protected_check': Dict or None
        }
    """
    errors = []
    warnings = []
    ocean_check = None
    protected_check = None
    
    try:
        # Validate polygon
        if not polygon or len(polygon) < 3:
            errors.append("Invalid polygon: must have at least 3 points")
            return {
                'is_valid': False,
                'errors': errors,
                'warnings': warnings,
                'ocean_check': None,
                'protected_check': None
            }
        
        # Calculate centroid for protected area check
        centroid_lat, centroid_lon = calculate_polygon_centroid(polygon)
        
        # Check ocean
        if check_ocean:
            logger.info("Checking if location is over ocean...")
            ocean_check = is_polygon_over_ocean(polygon, sample_points=5)
            
            if ocean_check['is_ocean']:
                errors.append(
                    f"Location is over ocean ({ocean_check['percentage_ocean']:.1f}% water). "
                    f"Urban development reports can only be generated for land areas."
                )
        
        # Check protected areas
        if check_protected:
            logger.info("Checking for protected areas...")
            protected_check = check_protected_areas(centroid_lat, centroid_lon, radius=2000)
            
            if protected_check['is_protected']:
                message = f"Location overlaps with {protected_check['count']} protected area(s): "
                area_names = [area['name'] for area in protected_check['areas'][:3]]
                message += ', '.join(area_names)
                
                if not allow_protected:
                    errors.append(message)
                else:
                    warnings.append(message + " (Development report will include preservation considerations)")
        
        is_valid = len(errors) == 0
        
        return {
            'is_valid': is_valid,
            'errors': errors,
            'warnings': warnings,
            'ocean_check': ocean_check,
            'protected_check': protected_check
        }
        
    except Exception as e:
        logger.error(f"Error in location validation: {e}")
        errors.append(f"Location validation failed: {str(e)}")
        return {
            'is_valid': False,
            'errors': errors,
            'warnings': warnings,
            'ocean_check': ocean_check,
            'protected_check': protected_check
        }


# Example usage
if __name__ == "__main__":
    # Test ocean detection
    print("Testing ocean detection:")
    
    # Ocean location (middle of Pacific)
    ocean_lat, ocean_lon = 0.0, -140.0
    print(f"Ocean test ({ocean_lat}, {ocean_lon}):", is_location_over_ocean(ocean_lat, ocean_lon))
    
    # Land location (New York)
    land_lat, land_lon = 40.7128, -74.0060
    print(f"Land test ({land_lat}, {land_lon}):", is_location_over_ocean(land_lat, land_lon))
    
    # Test polygon
    print("\nTesting polygon validation:")
    test_polygon = [
        [-74.0060, 40.7128],
        [-74.0050, 40.7128],
        [-74.0050, 40.7138],
        [-74.0060, 40.7138],
        [-74.0060, 40.7128]
    ]
    
    result = validate_location_for_development(
        test_polygon,
        check_ocean=True,
        check_protected=True,
        allow_protected=False
    )
    
    print("Validation result:", result)
