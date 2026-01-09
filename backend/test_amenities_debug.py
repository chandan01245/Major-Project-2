from amenities_service import AmenitiesFinder

finder = AmenitiesFinder()
# Test location: 13.020224, 77.716251
result = finder.find_amenities(13.020224, 77.716251)

print('\n=== FINAL RESULTS ===')
for category, items in result.items():
    print(f'\n{category.upper()}:')
    for item in items:
        print(f'  - {item["name"]} ({item["distance"]}km)')
