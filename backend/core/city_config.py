# City-specific configuration for currency and formatting

CITY_CONFIG = {
    'bangalore': {
        'name': 'Bangalore',
        'country': 'India',
        'currency': '₹',
        'currency_code': 'INR',
        'locale': 'en_IN',
        'price_multiplier': 1.0,  # Base price in INR
        'use_lakhs_crores': True  # Indian decimal system
    },
    'mumbai': {
        'name': 'Mumbai',
        'country': 'India',
        'currency': '₹',
        'currency_code': 'INR',
        'locale': 'en_IN',
        'price_multiplier': 1.2,  # Mumbai is 20% more expensive
        'use_lakhs_crores': True
    },
    'delhi': {
        'name': 'Delhi',
        'country': 'India',
        'currency': '₹',
        'currency_code': 'INR',
        'locale': 'en_IN',
        'price_multiplier': 1.1,  # Delhi is 10% more expensive
        'use_lakhs_crores': True
    },
    'hyderabad': {
        'name': 'Hyderabad',
        'country': 'India',
        'currency': '₹',
        'currency_code': 'INR',
        'locale': 'en_IN',
        'price_multiplier': 0.9,  # Hyderabad is 10% cheaper
        'use_lakhs_crores': True
    },
    'new_york': {
        'name': 'New York',
        'country': 'USA',
        'currency': '$',
        'currency_code': 'USD',
        'locale': 'en_US',
        'price_multiplier': 12.0,  # Convert from INR base price (approx 83 INR = 1 USD, then multiply for NYC prices)
        'use_lakhs_crores': False  # International decimal system
    },
    'singapore': {
        'name': 'Singapore',
        'country': 'Singapore',
        'currency': 'S$',
        'currency_code': 'SGD',
        'locale': 'en_SG',
        'price_multiplier': 10.0,  # Convert from INR base price
        'use_lakhs_crores': False  # International decimal system
    }
}

def get_city_config(city_id):
    """Get city configuration with fallback to Bangalore"""
    return CITY_CONFIG.get(city_id.lower(), CITY_CONFIG['bangalore'])

def format_currency(amount, city_id):
    """Format currency with appropriate decimal system"""
    config = get_city_config(city_id)
    
    if config.get('use_lakhs_crores', False):
        # Indian decimal system
        return format_indian_currency(amount, config['currency'])
    else:
        # International decimal system (commas every 3 digits)
        formatted = f"{amount:,.0f}"
        return f"{config['currency']}{formatted}"

def format_indian_currency(amount, currency_symbol):
    """Format currency using Indian decimal system (lakhs and crores)"""
    if amount < 0:
        return f"-{currency_symbol}{format_indian_number(abs(amount))}"
    return f"{currency_symbol}{format_indian_number(amount)}"

def format_indian_number(number):
    """Format number in Indian style (commas after 3, then every 2 digits)"""
    s = str(int(number))
    if len(s) <= 3:
        return s
    
    # Last 3 digits
    result = s[-3:]
    s = s[:-3]
    
    # Add commas every 2 digits from right
    while s:
        if len(s) <= 2:
            result = s + ',' + result
            break
        else:
            result = s[-2:] + ',' + result
            s = s[:-2]
    
    return result

def format_number(number, city_id):
    """Format number with appropriate decimal system"""
    config = get_city_config(city_id)
    
    if config.get('use_lakhs_crores', False):
        return format_indian_number(int(number))
    else:
        # International decimal system
        return f"{int(number):,}"
