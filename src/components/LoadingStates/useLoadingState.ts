import { useState, useCallback, useRef, useEffect } from 'react';

interface UseLoadingStateOptions {
  delay?: number;
  minDuration?: number;
  onStart?: () => void;
  onComplete?: () => void;
}

interface UseLoadingStateReturn {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
}

/**
 * Custom hook for managing loading states with optional delay and minimum duration
 */
export function useLoadingState(
  options: UseLoadingStateOptions = {}
): UseLoadingStateReturn {
  const { delay = 0, minDuration = 0, onStart, onComplete } = options;

  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsLoading(true);
        startTimeRef.current = Date.now();
        onStart?.();
      }, delay);
    } else {
      setIsLoading(true);
      startTimeRef.current = Date.now();
      onStart?.();
    }
  }, [delay, onStart]);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, minDuration - elapsed);

    if (remainingTime > 0 && isLoading) {
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        onComplete?.();
      }, remainingTime);
    } else {
      setIsLoading(false);
      onComplete?.();
    }
  }, [minDuration, isLoading, onComplete]);

  const withLoading = useCallback(
    async <T>(promise: Promise<T>): Promise<T> => {
      startLoading();
      try {
        const result = await promise;
        return result;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}
