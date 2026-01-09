/**
 * Safe ref management hook.
 * Prevents accessing refs on unmounted components.
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Safe useRef that checks if component is mounted.
 * 
 * @param {*} initialValue - Initial ref value
 * @returns {Object} Ref object with safe getter/setter
 */
export function useSafeRef(initialValue = null) {
  const ref = useRef(initialValue);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Clean up ref on unmount
      ref.current = null;
    };
  }, []);

  const getValue = useCallback(() => {
    if (isMountedRef.current) {
      return ref.current;
    } else {
      console.warn('Attempted to access ref on unmounted component');
      return null;
    }
  }, []);

  const setValue = useCallback((value) => {
    if (isMountedRef.current) {
      ref.current = value;
    } else {
      console.warn('Attempted to set ref on unmounted component');
    }
  }, []);

  return {
    ref,
    getValue,
    setValue,
    isMounted: () => isMountedRef.current
  };
}

/**
 * Callback ref that handles cleanup.
 * 
 * @param {Function} onMount - Callback when ref is mounted
 * @param {Function} onUnmount - Callback when ref is unmounted
 * @returns {Function} Callback ref
 */
export function useCallbackRef(onMount, onUnmount) {
  const nodeRef = useRef(null);

  const setRef = useCallback((node) => {
    // Cleanup previous node
    if (nodeRef.current && onUnmount) {
      onUnmount(nodeRef.current);
    }

    nodeRef.current = node;

    // Setup new node
    if (node && onMount) {
      onMount(node);
    }
  }, [onMount, onUnmount]);

  return setRef;
}

/**
 * Ref that observes element size changes.
 * 
 * @param {Function} onResize - Callback with { width, height }
 * @returns {Function} Callback ref
 */
export function useResizeObserverRef(onResize) {
  const observerRef = useRef(null);

  const setRef = useCallbackRef(
    (node) => {
      if (typeof ResizeObserver === 'undefined') {
        console.warn('ResizeObserver is not supported in this browser');
        return;
      }

      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (onResize) {
            onResize({ width, height });
          }
        }
      });

      observerRef.current.observe(node);
    },
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    }
  );

  return setRef;
}

/**
 * Ref that observes element intersection with viewport.
 * 
 * @param {Function} onIntersect - Callback with isIntersecting boolean
 * @param {Object} options - IntersectionObserver options
 * @returns {Function} Callback ref
 */
export function useIntersectionObserverRef(onIntersect, options = {}) {
  const observerRef = useRef(null);

  const setRef = useCallbackRef(
    (node) => {
      if (typeof IntersectionObserver === 'undefined') {
        console.warn('IntersectionObserver is not supported in this browser');
        return;
      }

      observerRef.current = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (onIntersect) {
            onIntersect(entry.isIntersecting, entry);
          }
        }
      }, options);

      observerRef.current.observe(node);
    },
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    }
  );

  return setRef;
}

/**
 * Ref that measures element dimensions.
 * 
 * @returns {Object} { ref, dimensions: { width, height, top, left } }
 */
export function useMeasureRef() {
  const ref = useRef(null);
  const dimensionsRef = useRef({ width: 0, height: 0, top: 0, left: 0 });

  const measure = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      dimensionsRef.current = {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left
      };
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return {
    ref,
    dimensions: dimensionsRef.current,
    measure
  };
}

/**
 * Ref for focus management.
 * 
 * @returns {Object} { ref, focus, blur, isFocused }
 */
export function useFocusRef() {
  const ref = useRef(null);
  const isFocusedRef = useRef(false);

  const focus = useCallback(() => {
    if (ref.current && ref.current.focus) {
      ref.current.focus();
      isFocusedRef.current = true;
    }
  }, []);

  const blur = useCallback(() => {
    if (ref.current && ref.current.blur) {
      ref.current.blur();
      isFocusedRef.current = false;
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => {
      isFocusedRef.current = true;
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
    };

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);

  return {
    ref,
    focus,
    blur,
    isFocused: () => isFocusedRef.current
  };
}

/**
 * Ref for DOM element with null safety.
 * 
 * @param {*} initialValue - Initial value
 * @returns {Object} { ref, current }
 */
export function useNullSafeRef(initialValue = null) {
  const ref = useRef(initialValue);

  const safeAccess = useCallback((callback) => {
    if (ref.current) {
      return callback(ref.current);
    }
    return null;
  }, []);

  return {
    ref,
    get current() {
      return ref.current;
    },
    safeAccess
  };
}

/**
 * Previous ref value.
 * 
 * @param {*} value - Current value to track
 * @returns {*} Previous value
 */
export function usePreviousRef(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export default {
  useSafeRef,
  useCallbackRef,
  useResizeObserverRef,
  useIntersectionObserverRef,
  useMeasureRef,
  useFocusRef,
  useNullSafeRef,
  usePreviousRef
};
