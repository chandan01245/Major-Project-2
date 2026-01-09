"""
Persistent cache for amenities data.
Reduces API calls to Overpass API and improves performance.
"""

import json
import os
import time
from datetime import datetime, timedelta
from threading import Lock


class AmenitiesCache:
    """
    Persistent disk-based cache for amenities data.
    Thread-safe with automatic expiration.
    """
    
    def __init__(self, cache_dir='data/cache', default_ttl=3600):
        """
        Initialize amenities cache.
        
        Args:
            cache_dir: Directory to store cache files
            default_ttl: Default time-to-live in seconds (default: 1 hour)
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
    
    def _get_cache_key(self, lat, lng, radius=5.0):
        """Generate cache key from coordinates."""
        # Round to 4 decimal places (~11m precision)
        lat_rounded = round(lat, 4)
        lng_rounded = round(lng, 4)
        return f"amenities_{lat_rounded}_{lng_rounded}_{radius}"
    
    def _get_cache_filepath(self, cache_key):
        """Get filepath for cache entry."""
        return os.path.join(self.cache_dir, f"{cache_key}.json")
    
    def get(self, lat, lng, radius=5.0):
        """
        Get amenities from cache.
        
        Args:
            lat: Latitude
            lng: Longitude
            radius: Search radius in km
        
        Returns:
            Cached amenities data or None if not found/expired
        """
        cache_key = self._get_cache_key(lat, lng, radius)
        
        with self.lock:
            # Check memory cache first
            if cache_key in self.memory_cache:
                entry = self.memory_cache[cache_key]
                if not self._is_expired(entry):
                    print(f"[CACHE HIT] Memory cache for {lat}, {lng}")
                    return entry['data']
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
                        print(f"[CACHE HIT] Disk cache for {lat}, {lng}")
                        return entry['data']
                    else:
                        # Expired, remove file
                        os.remove(filepath)
                        print(f"[CACHE EXPIRED] Removed expired cache for {lat}, {lng}")
                except Exception as e:
                    print(f"[CACHE ERROR] Failed to read cache: {e}")
        
        print(f"[CACHE MISS] No valid cache for {lat}, {lng}")
        return None
    
    def set(self, lat, lng, amenities_data, radius=5.0, ttl=None):
        """
        Store amenities in cache.
        
        Args:
            lat: Latitude
            lng: Longitude
            amenities_data: Amenities data to cache
            radius: Search radius in km
            ttl: Time-to-live in seconds (None = use default)
        """
        if ttl is None:
            ttl = self.default_ttl
        
        cache_key = self._get_cache_key(lat, lng, radius)
        
        entry = {
            'data': amenities_data,
            'timestamp': time.time(),
            'ttl': ttl,
            'lat': lat,
            'lng': lng,
            'radius': radius
        }
        
        with self.lock:
            # Store in memory
            self.memory_cache[cache_key] = entry
            
            # Store on disk
            filepath = self._get_cache_filepath(cache_key)
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(entry, f, indent=2)
                print(f"[CACHE SET] Cached amenities for {lat}, {lng}")
            except Exception as e:
                print(f"[CACHE ERROR] Failed to write cache: {e}")
    
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
            if not filename.endswith('.json'):
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
                print(f"[CACHE ERROR] Failed to load {filename}: {e}")
        
        if loaded > 0:
            print(f"[CACHE] Loaded {loaded} entries from disk ({expired} expired)")
    
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
                if not filename.endswith('.json'):
                    continue
                
                filepath = os.path.join(self.cache_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        entry = json.load(f)
                    
                    if self._is_expired(entry):
                        os.remove(filepath)
                except Exception:
                    pass
            
            print(f"[CACHE] Cleared {len(expired_keys)} expired entries")
    
    def clear_all(self):
        """Clear all cache entries."""
        with self.lock:
            # Clear memory
            self.memory_cache.clear()
            
            # Clear disk
            for filename in os.listdir(self.cache_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.cache_dir, filename)
                    try:
                        os.remove(filepath)
                    except Exception:
                        pass
            
            print("[CACHE] Cleared all cache entries")
    
    def get_stats(self):
        """Get cache statistics."""
        total_entries = len(self.memory_cache)
        total_size = 0
        
        for filename in os.listdir(self.cache_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(self.cache_dir, filename)
                try:
                    total_size += os.path.getsize(filepath)
                except Exception:
                    pass
        
        return {
            'entries': total_entries,
            'size_bytes': total_size,
            'size_mb': round(total_size / (1024 * 1024), 2)
        }


# Global cache instance
_amenities_cache = None


def get_amenities_cache():
    """Get global amenities cache instance."""
    global _amenities_cache
    if _amenities_cache is None:
        _amenities_cache = AmenitiesCache()
    return _amenities_cache
