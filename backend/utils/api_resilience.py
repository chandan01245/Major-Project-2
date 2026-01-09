"""
API Resilience utilities.
Provides retry logic, circuit breaker, and fallback mechanisms for external APIs.
"""

import time
import functools
from datetime import datetime, timedelta
from enum import Enum


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker pattern implementation.
    Prevents repeated calls to failing services.
    """
    
    def __init__(self, failure_threshold=5, timeout_duration=60, success_threshold=2):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            timeout_duration: Seconds to wait before attempting recovery
            success_threshold: Consecutive successes needed to close circuit
        """
        self.failure_threshold = failure_threshold
        self.timeout_duration = timeout_duration
        self.success_threshold = success_threshold
        
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    def call(self, func, *args, **kwargs):
        """
        Execute function with circuit breaker protection.
        
        Args:
            func: Function to execute
            *args, **kwargs: Arguments to pass to function
        
        Returns:
            Function result
        
        Raises:
            CircuitBreakerError: If circuit is open
        """
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                print(f"🔄 Circuit breaker HALF_OPEN, attempting recovery...")
            else:
                raise CircuitBreakerError(
                    f"Circuit breaker is OPEN. Service unavailable. "
                    f"Will retry after {self._time_until_retry():.0f}s"
                )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self):
        """Check if enough time has passed to attempt reset."""
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time >= self.timeout_duration
    
    def _time_until_retry(self):
        """Calculate seconds until next retry attempt."""
        if self.last_failure_time is None:
            return 0
        elapsed = time.time() - self.last_failure_time
        return max(0, self.timeout_duration - elapsed)
    
    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0
        
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0
                print(f"✅ Circuit breaker CLOSED, service recovered")
    
    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        self.success_count = 0
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            print(f"❌ Circuit breaker OPEN after {self.failure_count} failures")
    
    def reset(self):
        """Manually reset circuit breaker."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        print(f"🔄 Circuit breaker manually reset")


class CircuitBreakerError(Exception):
    """Exception raised when circuit breaker is open."""
    pass


def retry_with_backoff(
    max_retries=3,
    base_delay=1.0,
    max_delay=60.0,
    exponential_base=2,
    exceptions=(Exception,),
    on_retry=None
):
    """
    Decorator for retrying function with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay between retries (seconds)
        max_delay: Maximum delay between retries (seconds)
        exponential_base: Base for exponential backoff
        exceptions: Tuple of exceptions to catch and retry
        on_retry: Callback function called on each retry (retry_count, exception, delay)
    
    Usage:
        @retry_with_backoff(max_retries=3, base_delay=1.0)
        def fetch_data():
            return requests.get(url)
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt < max_retries:
                        # Calculate delay with exponential backoff
                        delay = min(base_delay * (exponential_base ** attempt), max_delay)
                        
                        # Call retry callback if provided
                        if on_retry:
                            on_retry(attempt + 1, e, delay)
                        else:
                            print(f"⚠️  Retry {attempt + 1}/{max_retries} after {delay:.1f}s: {str(e)}")
                        
                        time.sleep(delay)
                    else:
                        print(f"❌ All {max_retries} retries failed for {func.__name__}")
            
            # All retries exhausted, raise last exception
            raise last_exception
        
        return wrapper
    return decorator


def timeout(seconds):
    """
    Decorator to add timeout to function.
    Note: This uses a simple approach and may not work for all cases.
    
    Args:
        seconds: Timeout in seconds
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            import signal
            
            def timeout_handler(signum, frame):
                raise TimeoutError(f"Function {func.__name__} timed out after {seconds}s")
            
            # Set up signal handler (Unix only)
            try:
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(seconds)
                try:
                    result = func(*args, **kwargs)
                finally:
                    signal.alarm(0)  # Cancel alarm
                return result
            except AttributeError:
                # signal.SIGALRM not available (Windows)
                # Fall back to regular execution without timeout
                print(f"⚠️  Timeout not supported on this platform")
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


class RateLimiter:
    """
    Rate limiter to prevent exceeding API rate limits.
    Uses token bucket algorithm.
    """
    
    def __init__(self, max_calls, time_window):
        """
        Initialize rate limiter.
        
        Args:
            max_calls: Maximum number of calls allowed
            time_window: Time window in seconds
        """
        self.max_calls = max_calls
        self.time_window = time_window
        self.calls = []
    
    def __call__(self, func):
        """Use as decorator."""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            self.wait_if_needed()
            result = func(*args, **kwargs)
            self.calls.append(time.time())
            return result
        return wrapper
    
    def wait_if_needed(self):
        """Wait if rate limit would be exceeded."""
        now = time.time()
        
        # Remove old calls outside time window
        self.calls = [call_time for call_time in self.calls 
                      if now - call_time < self.time_window]
        
        # Check if at limit
        if len(self.calls) >= self.max_calls:
            # Calculate wait time
            oldest_call = self.calls[0]
            wait_time = self.time_window - (now - oldest_call)
            
            if wait_time > 0:
                print(f"⏳ Rate limit reached, waiting {wait_time:.1f}s...")
                time.sleep(wait_time)
                # Remove the oldest call after waiting
                self.calls.pop(0)


class FallbackHandler:
    """
    Provides fallback data when primary source fails.
    """
    
    def __init__(self, primary_func, fallback_func=None, fallback_data=None):
        """
        Initialize fallback handler.
        
        Args:
            primary_func: Primary function to try
            fallback_func: Fallback function to try if primary fails
            fallback_data: Static fallback data if both functions fail
        """
        self.primary_func = primary_func
        self.fallback_func = fallback_func
        self.fallback_data = fallback_data
    
    def execute(self, *args, **kwargs):
        """
        Execute with fallback logic.
        
        Returns:
            (result, source) where source is 'primary', 'fallback', or 'static'
        """
        # Try primary
        try:
            result = self.primary_func(*args, **kwargs)
            if result is not None:
                return result, 'primary'
        except Exception as e:
            print(f"⚠️  Primary source failed: {str(e)}")
        
        # Try fallback function
        if self.fallback_func:
            try:
                result = self.fallback_func(*args, **kwargs)
                if result is not None:
                    print(f"⚠️  Using fallback data source")
                    return result, 'fallback'
            except Exception as e:
                print(f"⚠️  Fallback source also failed: {str(e)}")
        
        # Use static fallback data
        if self.fallback_data is not None:
            print(f"⚠️  Using static fallback data")
            return self.fallback_data, 'static'
        
        # All sources failed
        raise Exception("All data sources failed and no static fallback available")


# Global circuit breakers for different services
waqi_circuit_breaker = CircuitBreaker(failure_threshold=5, timeout_duration=300)
overpass_circuit_breaker = CircuitBreaker(failure_threshold=3, timeout_duration=180)
nominatim_circuit_breaker = CircuitBreaker(failure_threshold=3, timeout_duration=120)


def get_circuit_breaker(service_name):
    """
    Get circuit breaker for a specific service.
    
    Args:
        service_name: Name of the service (waqi, overpass, nominatim)
    
    Returns:
        CircuitBreaker instance
    """
    breakers = {
        'waqi': waqi_circuit_breaker,
        'overpass': overpass_circuit_breaker,
        'nominatim': nominatim_circuit_breaker
    }
    
    return breakers.get(service_name, CircuitBreaker())
