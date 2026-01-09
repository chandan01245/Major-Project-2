"""
Persistent cache for geocoding (reverse geocoding) results.
Reduces API calls to Nominatim and respects rate limits.
"""

import json
import os
import time
from threading import Lock


class GeocodingCache:
    """
    Persistent disk-based cache for geocoding results.
    Thread-safe with automatic expiration.
    """
    
    def __init__(self, cache_dir='data/cache', default_ttl=86400):
        """
        Initialize geocoding cache.
        
        Args:
            cache_dir: Directory to store cache files
            default_ttl: Default time-to-live in seconds (default: 24 hours)
        """
        self.cache_dir = cache_dir
        self.default_ttl = default_ttl
        self.lock = Lock()
        
        # Create cache directory
        os.makedirs(cache_dir, exist_ok=True)
        
        # In-memory cache for faster access
        self.memory_cache = {}
        
        # Load existing cache from disk
        self._load_from_disk()
    
    def _get_cache_key(self, lat, lng, precision=4):
        """
        Generate cache key from coordinates.
        
        Args:
            lat: Latitude
            lng: Longitude
            precision: Decimal places for rounding (4 = ~11m precision)
        
        Returns:
            Cache key string
        """
        lat_rounded = round(lat, precision)
        lng_rounded = round(lng, precision)
        return f"geocode_{lat_rounded}_{lng_rounded}"
    
    def _get_cache_filepath(self, cache_key):
        """Get filepath for cache entry."""
        return os.path.join(self.cache_dir, f"{cache_key}.json")
    
    def get(self, lat, lng):
        """
        Get geocoded address from cache.
        
        Args:
            lat: Latitude
            lng: Longitude
        
        Returns:
            Cached address string or None if not found/expired
        """
        cache_key = self._get_cache_key(lat, lng)
        
        with self.lock:
            # Check memory cache first
            if cache_key in self.memory_cache:
                entry = self.memory_cache[cache_key]
                if not self._is_expired(entry):
                    print(f"[GEOCACHE HIT] Memory cache for {lat}, {lng}")
                    return entry['address']
                else:
                    # Expired, remove from memory
                    del self.memory_cache[cache_key]
            
            # Check disk cache
            filepath = self._get_cache_filepath(cache_key)
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        entry = json.load(f)
                    
                    if not self._is_expired(entry):
                        # Load into memory cache
                        self.memory_cache[cache_key] = entry
                        print(f"[GEOCACHE HIT] Disk cache for {lat}, {lng}")
                        return entry['address']
                    else:
                        # Expired, remove file
                        os.remove(filepath)
                        print(f"[GEOCACHE EXPIRED] Removed expired cache for {lat}, {lng}")
                except Exception as e:
                    print(f"[GEOCACHE ERROR] Failed to read cache: {e}")
        
        print(f"[GEOCACHE MISS] No valid cache for {lat}, {lng}")
        return None
    
    def set(self, lat, lng, address, ttl=None):
        """
        Store geocoded address in cache.
        
        Args:
            lat: Latitude
            lng: Longitude
            address: Geocoded address string
            ttl: Time-to-live in seconds (None = use default)
        """
        if ttl is None:
            ttl = self.default_ttl
        
        cache_key = self._get_cache_key(lat, lng)
        
        entry = {
            'address': address,
            'timestamp': time.time(),
            'ttl': ttl,
            'lat': lat,
            'lng': lng
        }
        
        with self.lock:
            # Store in memory
            self.memory_cache[cache_key] = entry
            
            # Store on disk
            filepath = self._get_cache_filepath(cache_key)
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(entry, f, indent=2, ensure_ascii=False)
                print(f"[GEOCACHE SET] Cached address for {lat}, {lng}")
            except Exception as e:
                print(f"[GEOCACHE ERROR] Failed to write cache: {e}")
    
    def _is_expired(self, entry):
        """Check if cache entry is expired."""
        if 'timestamp' not in entry or 'ttl' not in entry:
            return True
        
        age = time.time() - entry['timestamp']
        return age > entry['ttl']
    
    def _load_from_disk(self):
        """Load all valid cache entries from disk into memory."""
        if not os.path.exists(self.cache_dir):
            return
        
        loaded = 0
        expired = 0
        
        for filename in os.listdir(self.cache_dir):
            if not filename.startswith('geocode_') or not filename.endswith('.json'):
                continue
            
            filepath = os.path.join(self.cache_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    entry = json.load(f)
                
                if not self._is_expired(entry):
                    # Extract cache key from filename
                    cache_key = filename.replace('.json', '')
                    self.memory_cache[cache_key] = entry
                    loaded += 1
                else:
                    # Remove expired cache file
                    os.remove(filepath)
                    expired += 1
            except Exception as e:
                print(f"[GEOCACHE ERROR] Failed to load {filename}: {e}")
        
        if loaded > 0:
            print(f"[GEOCACHE] Loaded {loaded} entries from disk ({expired} expired)")
    
    def clear_expired(self):
        """Clear all expired cache entries."""
        with self.lock:
            # Clear from memory
            expired_keys = [key for key, entry in self.memory_cache.items() 
                          if self._is_expired(entry)]
            for key in expired_keys:
                del self.memory_cache[key]
            
            # Clear from disk
            for filename in os.listdir(self.cache_dir):
                if not filename.startswith('geocode_') or not filename.endswith('.json'):
                    continue
                
                filepath = os.path.join(self.cache_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        entry = json.load(f)
                    
                    if self._is_expired(entry):
                        os.remove(filepath)
                except Exception:
                    pass
            
            print(f"[GEOCACHE] Cleared {len(expired_keys)} expired entries")
    
    def clear_all(self):
        """Clear all cache entries."""
        with self.lock:
            # Clear memory
            self.memory_cache.clear()
            
            # Clear disk
            for filename in os.listdir(self.cache_dir):
                if filename.startswith('geocode_') and filename.endswith('.json'):
                    filepath = os.path.join(self.cache_dir, filename)
                    try:
                        os.remove(filepath)
                    except Exception:
                        pass
            
            print("[GEOCACHE] Cleared all cache entries")
    
    def get_stats(self):
        """Get cache statistics."""
        total_entries = len(self.memory_cache)
        total_size = 0
        
        for filename in os.listdir(self.cache_dir):
            if filename.startswith('geocode_') and filename.endswith('.json'):
                filepath = os.path.join(self.cache_dir, filename)
                try:
                    total_size += os.path.getsize(filepath)
                except Exception:
                    pass
        
        return {
            'entries': total_entries,
            'size_bytes': total_size,
            'size_kb': round(total_size / 1024, 2)
        }


# Global cache instance
_geocoding_cache = None


def get_geocoding_cache():
    """Get global geocoding cache instance."""
    global _geocoding_cache
    if _geocoding_cache is None:
        _geocoding_cache = GeocodingCache()
    return _geocoding_cache
