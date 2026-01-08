# Currency and Decimal System Implementation Guide

## Overview
This document describes the implementation of city-specific currency systems and decimal formatting for the Urban Development Analyzer application.

## Currency Systems

### Supported Cities

| City | Currency | Symbol | Decimal System | Price Multiplier |
|------|----------|--------|----------------|------------------|
| Bangalore | Indian Rupee | ₹ | Indian (x,xx,xxx) | 1.0x (base) |
| Mumbai | Indian Rupee | ₹ | Indian (x,xx,xxx) | 1.2x |
| Delhi | Indian Rupee | ₹ | Indian (x,xx,xxx) | 1.1x |
| Hyderabad | Indian Rupee | ₹ | Indian (x,xx,xxx) | 0.9x |
| New York | US Dollar | $ | International (x,xxx,xxx) | 12.0x |
| Singapore | Singapore Dollar | S$ | International (x,xxx,xxx) | 10.0x |

## Decimal Number Formatting

### Indian System (Lakhs and Crores)
- Groups: Last 3 digits, then every 2 digits
- Example: 12,34,567 (12 lakhs 34 thousand)
- Used for: Indian cities (Bangalore, Mumbai, Delhi, Hyderabad)

### International System
- Groups: Every 3 digits
- Example: 1,234,567 (1.2 million)
- Used for: International cities (New York, Singapore)

## Implementation Details

### Backend (`city_config.py`)

```python
CITY_CONFIG = {
    'new_york': {
        'currency': '$',
        'currency_code': 'USD',
        'price_multiplier': 12.0,  # Convert from INR base
        'use_lakhs_crores': False  # International system
    },
    'singapore': {
        'currency': 'S$',
        'currency_code': 'SGD',
        'price_multiplier': 10.0,
        'use_lakhs_crores': False
    },
    'bangalore': {
        'currency': '₹',
        'currency_code': 'INR',
        'price_multiplier': 1.0,  # Base price
        'use_lakhs_crores': True  # Indian system
    }
}
```

### Price Calculation Flow

1. **Base Price**: All prices start in INR (Indian Rupees)
2. **City Adjustment**: Multiplied by city-specific factor
3. **Formatting**: Applied based on city's decimal system

Example for New York:
```
Base: ₹8,500/sqft (INR)
→ Converted: $102,000/sqft (8,500 × 12)
→ Formatted: $102,000 (international system)
```

Example for Bangalore:
```
Base: ₹8,500/sqft (INR)
→ Same: ₹8,500/sqft (8,500 × 1.0)
→ Formatted: ₹8,500 (Indian system)
```

### Frontend Formatting (`ReportPreview.jsx`)

```javascript
const formatNumber = (num) => {
  const indianCities = ["bangalore", "mumbai", "delhi", "hyderabad"];
  const isIndianCity = indianCities.includes(cityId);
  
  if (isIndianCity) {
    return formatIndianNumber(num);  // x,xx,xxx
  } else {
    return num.toLocaleString("en-US");  // x,xxx,xxx
  }
};
```

### PDF Service (`pdfService.js`)

Same formatting logic applied to ensure consistency between:
- On-screen reports
- Downloaded PDF reports

## Modified Files

### Backend
1. `backend/city_config.py` - City configurations and formatting functions
2. `backend/zoning_ml_model.py` - Price calculation with city multipliers
3. `backend/app.py` - Passes city info to report generation

### Frontend
4. `src/components/ReportPreview.jsx` - Display formatting
5. `src/services/pdfService.js` - PDF formatting

## Examples

### Property Value Display

**New York (International)**
```
Price: $150/sqft
Total Value: $1,500,000
Construction Cost: $12,000,000
```

**Singapore (International)**
```
Price: S$125/sqft
Total Value: S$1,250,000
Construction Cost: S$10,000,000
```

**Bangalore (Indian)**
```
Price: ₹8,500/sqft
Total Value: ₹85,00,000 (85 lakhs)
Construction Cost: ₹7,00,00,000 (7 crores)
```

## Testing

Test currency formatting:
```python
from backend.city_config import format_currency

# International
print(format_currency(1234567, 'new_york'))    # $1,234,567
print(format_currency(1234567, 'singapore'))   # S$1,234,567

# Indian
print(format_currency(1234567, 'bangalore'))   # ₹12,34,567
print(format_currency(10000000, 'mumbai'))     # ₹1,00,00,000
```

## Notes

1. **Price Multipliers**: Based on approximate real estate price differences and currency conversion rates
2. **Consistency**: Same formatting applied across UI, PDF, and all numeric displays
3. **Extensibility**: Easy to add new cities by updating `CITY_CONFIG`
4. **Backward Compatibility**: Existing data continues to work with fallback to Bangalore defaults

## Future Enhancements

Potential improvements:
- Dynamic currency exchange rates via API
- User preference for decimal system override
- Support for more currencies (EUR, GBP, etc.)
- Localized date formats per city
