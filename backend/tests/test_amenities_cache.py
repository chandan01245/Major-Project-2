import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.amenities_service import AmenitiesFinder
import time

finder = AmenitiesFinder()

# Clear cache first
finder.cache = {}
print("Cache cleared\n")

# Test location: 13.020224, 77.716251
print("=" * 60)
print("TEST 1: Fresh call (no cache)")
print("=" * 60)
result1 = finder.find_amenities(13.020224, 77.716251)

print('\n=== SCHOOLS FROM TEST 1 ===')
for item in result1['schools']:
    print(f'  - {item["name"]} ({item["distance"]}km)')

# Wait and test again (should use cache)
time.sleep(1)
print("\n" + "=" * 60)
print("TEST 2: Cached call (should be instant)")
print("=" * 60)
result2 = finder.find_amenities(13.020224, 77.716251)

print('\n=== SCHOOLS FROM TEST 2 ===')
for item in result2['schools']:
    print(f'  - {item["name"]} ({item["distance"]}km)')

# Test with slightly different coordinates
print("\n" + "=" * 60)
print("TEST 3: Different coordinates (13.0202, 77.7163)")
print("=" * 60)
result3 = finder.find_amenities(13.0202, 77.7163)

print('\n=== SCHOOLS FROM TEST 3 ===')
for item in result3['schools']:
    print(f'  - {item["name"]} ({item["distance"]}km)')
