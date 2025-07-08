import { logger } from '../../utils/logger';
import { Reducer } from 'react';

/**
 * Options for the logging middleware
 */
interface LoggingMiddlewareOptions {
  contextName: string;
  enabled?: boolean;
  logStateDiff?: boolean;
  sanitizeState?: <T>(state: T) => T;
  sanitizeAction?: <T>(action: T) => T;
}

/**
 * Creates a deep clone of an object while handling circular references
 */
function safeClone<T>(obj: T): T {
  const seen = new WeakSet();

  function clone(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (seen.has(value as object)) {
      return '[Circular Reference]';
    }

    seen.add(value as object);

    if (Array.isArray(value)) {
      return value.map(clone);
    }

    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    if (value instanceof Map) {
      const cloned = new Map();
      value.forEach((val, key) => {
        cloned.set(key, clone(val));
      });
      return cloned;
    }

    if (value instanceof Set) {
      const cloned = new Set();
      value.forEach(val => {
        cloned.add(clone(val));
      });
      return cloned;
    }

    // Handle plain objects
    const cloned = {} as Record<string, unknown>;
    for (const key in value as object) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = clone((value as Record<string, unknown>)[key]);
      }
    }

    return cloned;
  }

  return clone(obj) as T;
}

/**
 * Calculates the diff between two states
 */
function calculateDiff<T extends Record<string, unknown>>(
  prevState: T,
  nextState: T
): Record<string, { prev: unknown; next: unknown }> {
  const diff: Record<string, { prev: unknown; next: unknown }> = {};
  const allKeys = new Set([
    ...Object.keys(prevState),
    ...Object.keys(nextState),
  ]);

  allKeys.forEach(key => {
    const prevValue = prevState[key];
    const nextValue = nextState[key];

    if (prevValue !== nextValue) {
      diff[key] = {
        prev: safeClone(prevValue),
        next: safeClone(nextValue),
      };
    }
  });

  return diff;
}

/**
 * Default state sanitizer that removes sensitive data
 */
export function defaultStateSanitizer<T>(state: T): T {
  if (typeof state !== 'object' || state === null) {
    return state;
  }

  const stateObj = state as Record<string, unknown>;
  const sanitized = { ...stateObj };

  // Remove any potentially sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized as T;
}

/**
 * Default action sanitizer
 */
export function defaultActionSanitizer<T>(action: T): T {
  return action;
}

/**
 * Creates a logging middleware that wraps a reducer
 */
export function createLoggingMiddleware<S, A>(
  reducer: Reducer<S, A>,
  options: LoggingMiddlewareOptions
): Reducer<S, A> {
  const {
    contextName,
    enabled = true,
    logStateDiff = false,
    sanitizeState = defaultStateSanitizer,
    sanitizeAction = defaultActionSanitizer,
  } = options;

  return (state: S, action: A): S => {
    if (!enabled) {
      return reducer(state, action);
    }

    try {
      // Sanitize and clone the action for logging
      const sanitizedAction = sanitizeAction(
        action as unknown as Record<string, unknown>
      ) as A;
      const actionForLogging = safeClone(sanitizedAction);

      // Log the action
      logger.logAction(contextName, 'Dispatching', actionForLogging);

      // Execute the reducer
      const nextState = reducer(state, action);

      // Calculate and log the state diff if enabled
      if (logStateDiff && state !== nextState) {
        const sanitizedPrevState = sanitizeState(
          state as unknown as Record<string, unknown>
        ) as S;
        const sanitizedNextState = sanitizeState(
          nextState as unknown as Record<string, unknown>
        ) as S;
        const diff = calculateDiff(
          sanitizedPrevState as unknown as Record<string, unknown>,
          sanitizedNextState as unknown as Record<string, unknown>
        );

        if (Object.keys(diff).length > 0) {
          logger.debug(contextName, 'State diff', diff);
        }
      }

      return nextState;
    } catch (error) {
      // Log the error but don't break the reducer
      logger.error(contextName, 'Error in logging middleware', error as Error);
      // Fall back to executing the reducer without logging
      return reducer(state, action);
    }
  };
}

/**
 * Creates a simple logging wrapper without options
 */
export function withLogging<S, A>(
  reducer: Reducer<S, A>,
  contextName: string
): Reducer<S, A> {
  return createLoggingMiddleware(reducer, { contextName });
}
