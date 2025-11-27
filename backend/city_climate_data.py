"""
City-specific climate and historical flood data for accurate flood risk prediction
Based on historical averages and real-world data
"""
from datetime import datetime

# Historical climate data for major cities
CITY_CLIMATE_DATA = {
    'bangalore': {
        'name': 'Bangalore',
        'avg_annual_rainfall': 970,  # mm
        'monsoon_rainfall': 180,  # mm per month during monsoon
        'avg_temperature': 24,  # Celsius
        'avg_humidity': 60,  # %
        'avg_pressure': 916,  # hPa (high altitude)
        'avg_elevation': 920,  # meters above sea level
        'flood_prone_areas': ['low-lying areas', 'lake beds', 'valley areas'],
        'historical_flood_years': [2015, 2016, 2017, 2022],
        'max_recorded_flood_depth': 36,  # inches
        'drainage_quality': 'moderate',
        'risk_multiplier': 0.8  # Lower due to elevation
    },
    'mumbai': {
        'name': 'Mumbai',
        'avg_annual_rainfall': 2400,  # mm (very high)
        'monsoon_rainfall': 650,  # mm per month during monsoon
        'avg_temperature': 27,  # Celsius
        'avg_humidity': 75,  # %
        'avg_pressure': 1013,  # hPa (sea level)
        'avg_elevation': 14,  # meters (coastal, low)
        'flood_prone_areas': ['entire city', 'coastal areas', 'low-lying zones'],
        'historical_flood_years': [2005, 2017, 2019, 2020, 2021],
        'max_recorded_flood_depth': 72,  # inches (severe flooding)
        'drainage_quality': 'poor',
        'risk_multiplier': 1.8  # Very high due to coastal location and drainage
    },
    'delhi': {
        'name': 'Delhi',
        'avg_annual_rainfall': 790,  # mm
        'monsoon_rainfall': 200,  # mm per month during monsoon
        'avg_temperature': 25,  # Celsius
        'avg_humidity': 65,  # %
        'avg_pressure': 1010,  # hPa
        'avg_elevation': 216,  # meters
        'flood_prone_areas': ['yamuna floodplain', 'low-lying colonies'],
        'historical_flood_years': [2010, 2013, 2019, 2023],
        'max_recorded_flood_depth': 48,  # inches
        'drainage_quality': 'moderate',
        'risk_multiplier': 1.2
    },
    'hyderabad': {
        'name': 'Hyderabad',
        'avg_annual_rainfall': 812,  # mm
        'monsoon_rainfall': 170,  # mm per month during monsoon
        'avg_temperature': 26,  # Celsius
        'avg_humidity': 58,  # %
        'avg_pressure': 960,  # hPa
        'avg_elevation': 505,  # meters
        'flood_prone_areas': ['musi river basin', 'low-lying areas'],
        'historical_flood_years': [2016, 2020, 2021],
        'max_recorded_flood_depth': 30,  # inches
        'drainage_quality': 'fair',
        'risk_multiplier': 1.0
    },
    'chennai': {
        'name': 'Chennai',
        'avg_annual_rainfall': 1400,  # mm
        'monsoon_rainfall': 350,  # mm per month during monsoon
        'avg_temperature': 29,  # Celsius
        'avg_humidity': 78,  # %
        'avg_pressure': 1013,  # hPa
        'avg_elevation': 7,  # meters (coastal, very low)
        'flood_prone_areas': ['entire city', 'river beds', 'coastal zones'],
        'historical_flood_years': [2015, 2016, 2017, 2021],
        'max_recorded_flood_depth': 60,  # inches
        'drainage_quality': 'poor',
        'risk_multiplier': 1.6  # High coastal risk
    },
    'newyork': {
        'name': 'New York',
        'avg_annual_rainfall': 1200,  # mm
        'monsoon_rainfall': 100,  # mm per month (no monsoon, but rainy season)
        'avg_temperature': 13,  # Celsius
        'avg_humidity': 65,  # %
        'avg_pressure': 1013,  # hPa
        'avg_elevation': 10,  # meters (coastal)
        'flood_prone_areas': ['lower manhattan', 'coastal areas', 'subway systems'],
        'historical_flood_years': [2012, 2021],  # Hurricane Sandy, Ida
        'max_recorded_flood_depth': 84,  # inches (Hurricane Sandy)
        'drainage_quality': 'fair',
        'risk_multiplier': 1.4  # Coastal + hurricane risk
    },
    'singapore': {
        'name': 'Singapore',
        'avg_annual_rainfall': 2400,  # mm (tropical)
        'monsoon_rainfall': 250,  # mm per month
        'avg_temperature': 27,  # Celsius
        'avg_humidity': 84,  # %
        'avg_pressure': 1011,  # hPa
        'avg_elevation': 15,  # meters
        'flood_prone_areas': ['low-lying areas', 'reclaimed land'],
        'historical_flood_years': [2010, 2011, 2018, 2021],
        'max_recorded_flood_depth': 24,  # inches
        'drainage_quality': 'excellent',  # Very good drainage system
        'risk_multiplier': 0.7  # Lower due to excellent infrastructure
    }
}

def get_city_climate(city):
    """Get climate data for a specific city"""
    city_lower = city.lower().replace(' ', '').replace('_', '')
    return CITY_CLIMATE_DATA.get(city_lower, CITY_CLIMATE_DATA['bangalore'])

def get_season_adjustment():
    """Get seasonal adjustment multiplier based on current month"""
    month = datetime.now().month
    
    # Monsoon months in India (June-September)
    if 6 <= month <= 9:
        return 1.5  # Higher rainfall during monsoon
    # Winter (November-February)
    elif month in [11, 12, 1, 2]:
        return 0.5  # Lower rainfall in winter
    # Summer and pre-monsoon (March-May)
    elif 3 <= month <= 5:
        return 0.7
    # Post-monsoon (October)
    else:
        return 1.0
