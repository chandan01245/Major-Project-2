# Changes Log - Address & Currency Formatting

## Summary
Added address display for parcels and implemented proper currency formatting with international decimal system for different cities, along with units for flood depth measurements.

## Changes Made

### 1. Backend Changes

#### New Files Created:
- **`backend/city_config.py`**
  - City-specific configuration for currencies (USD for New York, SGD for Singapore, INR for Indian cities)
  - Currency formatting with international decimal system (commas)
  - Support for 6 cities: Bangalore, Mumbai, Delhi, Hyderabad, New York, Singapore

- **`backend/geocoding_service.py`**
  - Reverse geocoding service using OpenStreetMap Nominatim API
  - Fetches human-readable addresses from coordinates
  - Respects API rate limits (1 request per second)

#### Modified Files:
- **`backend/app.py`**
  - Fixed Unicode encoding issue for Windows console (emojis now work)
  - Added geocoding service integration
  - Added address fetching in `/api/generate-report` endpoint
  - Added city info (name, currency symbol, currency code) to report response
  - Currency information now included in pricing data

### 2. Frontend Changes

#### Modified Files:
- **`src/components/ReportPreview.jsx`**
  - Added address display in Parcel Information section
  - Added proper units for flood depth: "inches" with meters conversion
  - Shows flood depth as "X inches (Y meters)" throughout the report
  - Currency symbol properly displayed from city config
  - Future flood projections show units clearly

- **`src/services/pdfService.js`**
  - Added address to PDF parcel information section
  - Added complete Flood Risk Assessment section to PDF
  - Shows flood depth with both inches and meters
  - Future climate projections included in PDF
  - Currency formatting uses proper symbols ($ for USD, S$ for SGD, ₹ for INR)
  - All prices displayed with international decimal system (commas)
  - City name displayed on cover page

### 3. Features Added

#### Address Display:
- ✅ Address fetched automatically from coordinates
- ✅ Displayed prominently in report preview
- ✅ Included in downloaded PDF report
- ✅ Format: Street, Neighborhood, City, State, Postal Code, Country

#### Currency Formatting:
- ✅ New York: Uses $ (USD) with international decimal format (1,234,567)
- ✅ Singapore: Uses S$ (SGD) with international decimal format (1,234,567)
- ✅ Indian cities: Uses ₹ (INR) with international decimal format (1,234,567)
- ✅ Applied to all pricing displays in both UI and PDF

#### Flood Depth Units:
- ✅ Current depth: "X inches (Y meters)"
- ✅ Future projections: "X inches (Y meters)"
- ✅ Tooltips show full units
- ✅ PDF report includes both units

## Testing

### Currency Formatting Test:
```python
from city_config import format_currency
format_currency(1234567, 'new_york')   # Returns: $1,234,567
format_currency(1234567, 'singapore')  # Returns: S$1,234,567
format_currency(1234567, 'bangalore')  # Returns: ₹1,234,567
```

### Address Fetching Test:
```python
from geocoding_service import GeocodingService
geo = GeocodingService()
address = geo.get_address(40.7128, -74.0060)  # Returns NYC address
```

## Files Modified
1. `backend/app.py` - Added address and city info
2. `backend/city_config.py` - NEW: Currency configuration
3. `backend/geocoding_service.py` - NEW: Address fetching
4. `src/components/ReportPreview.jsx` - Address display & units
5. `src/services/pdfService.js` - PDF address & units

## Breaking Changes
None - All changes are additive

## Dependencies
No new dependencies required (uses existing `requests` library)

## Notes
- Address fetching respects Nominatim API rate limits (1 req/sec)
- Fallback to "Address not available" if geocoding fails
- All existing functionality remains unchanged
- International decimal system used consistently across all currencies
