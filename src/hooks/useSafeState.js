/**
 * Safe state management hook.
 * Prevents state updates on unmounted components.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Safe useState that prevents updates after unmount.
 * 
 * @param {*} initialValue - Initial state value
 * @returns {Array} [state, setState, isMounted]
 */
export function useSafeState(initialValue) {
  const [state, setState] = useState(initialValue);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setSafeState = useCallback((value) => {
    if (isMountedRef.current) {
      setState(value);
    } else {
      console.warn('Attempted to set state on unmounted component');
    }
  }, []);

  return [state, setSafeState, isMountedRef.current];
}

/**
 * Safe async state hook with loading and error states.
 * 
 * @param {Function} asyncFunction - Async function to execute
 * @param {*} initialValue - Initial value
 * @returns {Object} State object
 */
export function useAsyncState(asyncFunction, initialValue = null) {
  const [data, setData, isMounted] = useSafeState(initialValue);
  const [loading, setLoading] = useSafeState(false);
  const [error, setError] = useSafeState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);

      const result = await asyncFunction(...args);

      if (isMounted) {
        setData(result);
        return result;
      }
    } catch (err) {
      if (isMounted) {
        setError(err);
        console.error('Async state error:', err);
      }
      throw err;
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [asyncFunction, isMounted, setData, setError, setLoading]);

  const reset = useCallback(() => {
    setData(initialValue);
    setError(null);
    setLoading(false);
  }, [initialValue, setData, setError, setLoading]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    isMounted
  };
}

/**
 * Debounced state hook.
 * Updates state only after delay period.
 * 
 * @param {*} initialValue - Initial value
 * @param {number} delay - Delay in milliseconds
 * @returns {Array} [debouncedValue, setValue, immediateValue]
 */
export function useDebouncedState(initialValue, delay = 500) {
  const [immediateValue, setImmediateValue] = useSafeState(initialValue);
  const [debouncedValue, setDebouncedValue] = useSafeState(initialValue);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(immediateValue);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [immediateValue, delay, setDebouncedValue]);

  return [debouncedValue, setImmediateValue, immediateValue];
}

/**
 * Previous value hook.
 * Returns the previous value of a state.
 * 
 * @param {*} value - Current value
 * @returns {*} Previous value
 */
export function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Toggle state hook.
 * 
 * @param {boolean} initialValue - Initial boolean value
 * @returns {Array} [value, toggle, setTrue, setFalse]
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useSafeState(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, [setValue]);

  const setTrue = useCallback(() => {
    setValue(true);
  }, [setValue]);

  const setFalse = useCallback(() => {
    setValue(false);
  }, [setValue]);

  return [value, toggle, setTrue, setFalse];
}

/**
 * Array state hook with utility methods.
 * 
 * @param {Array} initialValue - Initial array
 * @returns {Object} Array state with utility methods
 */
export function useArrayState(initialValue = []) {
  const [array, setArray] = useSafeState(initialValue);

  const push = useCallback((item) => {
    setArray(arr => [...arr, item]);
  }, [setArray]);

  const remove = useCallback((index) => {
    setArray(arr => arr.filter((_, i) => i !== index));
  }, [setArray]);

  const update = useCallback((index, newValue) => {
    setArray(arr => arr.map((item, i) => i === index ? newValue : item));
  }, [setArray]);

  const clear = useCallback(() => {
    setArray([]);
  }, [setArray]);

  const filter = useCallback((predicate) => {
    setArray(arr => arr.filter(predicate));
  }, [setArray]);

  return {
    array,
    setArray,
    push,
    remove,
    update,
    clear,
    filter
  };
}

/**
 * Object state hook with utility methods.
 * 
 * @param {Object} initialValue - Initial object
 * @returns {Object} Object state with utility methods
 */
export function useObjectState(initialValue = {}) {
  const [obj, setObj] = useSafeState(initialValue);

  const updateField = useCallback((field, value) => {
    setObj(o => ({ ...o, [field]: value }));
  }, [setObj]);

  const updateFields = useCallback((updates) => {
    setObj(o => ({ ...o, ...updates }));
  }, [setObj]);

  const removeField = useCallback((field) => {
    setObj(o => {
      const newObj = { ...o };
      delete newObj[field];
      return newObj;
    });
  }, [setObj]);

  const reset = useCallback(() => {
    setObj(initialValue);
  }, [initialValue, setObj]);

  return {
    obj,
    setObj,
    updateField,
    updateFields,
    removeField,
    reset
  };
}

/**
 * Local storage state hook.
 * Persists state to localStorage.
 * 
 * @param {string} key - LocalStorage key
 * @param {*} initialValue - Initial value
 * @returns {Array} [value, setValue]
 */
export function useLocalStorage(key, initialValue) {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useSafeState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Wrap setValue to also update localStorage
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function like useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  }, [key, storedValue, setStoredValue]);

  return [storedValue, setValue];
}

export default {
  useSafeState,
  useAsyncState,
  useDebouncedState,
  usePrevious,
  useToggle,
  useArrayState,
  useObjectState,
  useLocalStorage
};
