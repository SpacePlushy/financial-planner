/**
 * Logging middleware for React context reducers
 * Wraps reducers to log actions, state changes, and performance metrics
 */

import React from 'react';
import { logger } from '../../utils/logger';

export interface MiddlewareOptions {
  contextName: string;
  enabled?: boolean;
  logStateDiff?: boolean;
  sanitizeState?: (state: any) => any;
  sanitizeAction?: (action: any) => any;
}

/**
 * Creates a deep clone of an object while handling circular references
 */
function safeClone<T>(obj: T): T {
  const seen = new WeakSet();

  function clone(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (seen.has(value)) {
      return '[Circular Reference]';
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.map(clone);
    }

    if (value instanceof Date) {
      return new Date(value);
    }

    if (value instanceof Map) {
      return new Map(
        Array.from(value.entries()).map(([k, v]) => [k, clone(v)])
      );
    }

    if (value instanceof Set) {
      return new Set(Array.from(value).map(clone));
    }

    const cloned: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        cloned[key] = clone(value[key]);
      }
    }

    return cloned;
  }

  return clone(obj);
}

/**
 * Calculates the difference between two states
 */
function calculateStateDiff(before: any, after: any): any {
  const diff: any = {};

  // Check for added or modified properties
  for (const key in after) {
    if (!(key in before)) {
      diff[key] = { added: after[key] };
    } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = { before: before[key], after: after[key] };
    }
  }

  // Check for removed properties
  for (const key in before) {
    if (!(key in after)) {
      diff[key] = { removed: before[key] };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

/**
 * Creates a logging middleware for context reducers
 */
export function createLoggingMiddleware<S, A>(
  reducer: (state: S, action: A) => S,
  options: MiddlewareOptions
): (state: S, action: A) => S {
  const {
    contextName,
    enabled = true,
    logStateDiff = false,
    sanitizeState = state => state,
    sanitizeAction = action => action,
  } = options;

  // Return original reducer if logging is disabled
  if (
    !enabled ||
    process.env.REACT_APP_DISABLE_LOGGING === 'true' ||
    process.env.NODE_ENV === 'test' ||
    contextName === 'GeneticOptimizer'
  ) {
    return reducer;
  }

  return (state: S, action: A) => {
    const startTime = performance.now();

    // Safely clone and sanitize the state before action
    const stateBefore = sanitizeState(safeClone(state));
    const sanitizedAction = sanitizeAction(safeClone(action));

    let error: Error | undefined;
    let newState: S;

    try {
      // Execute the reducer
      newState = reducer(state, action);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      logger.error(
        contextName,
        `Reducer error for action ${(action as any).type || 'unknown'}`,
        error,
        { action: sanitizedAction }
      );
      throw e;
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Safely clone and sanitize the state after action
    const stateAfter = sanitizeState(safeClone(newState));

    // Log the action
    const actionType = (action as any).type || 'unknown';
    logger.logAction(
      contextName,
      actionType,
      stateBefore,
      stateAfter,
      executionTime
    );

    // Log state diff if enabled
    if (logStateDiff) {
      const diff = calculateStateDiff(stateBefore, stateAfter);
      if (diff) {
        logger.debug(contextName, `State diff for ${actionType}`, diff);
      }
    }

    // Log action details
    logger.debug(contextName, `Action dispatched: ${actionType}`, {
      action: sanitizedAction,
      executionTime: `${executionTime.toFixed(2)}ms`,
    });

    return newState;
  };
}

/**
 * Default state sanitizer that removes sensitive or large data
 */
export function defaultStateSanitizer(state: any): any {
  if (!state || typeof state !== 'object') {
    return state;
  }

  const sanitized: any = {};

  for (const key in state) {
    const value = state[key];

    // Skip functions
    if (typeof value === 'function') {
      sanitized[key] = '[Function]';
      continue;
    }

    // Truncate large arrays
    if (Array.isArray(value) && value.length > 10) {
      sanitized[key] = [
        ...value.slice(0, 10),
        `... and ${value.length - 10} more items`,
      ];
      continue;
    }

    // Truncate large strings
    if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '...';
      continue;
    }

    // Recursively sanitize objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = defaultStateSanitizer(value);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Default action sanitizer that removes sensitive payload data
 */
export function defaultActionSanitizer(action: any): any {
  if (!action || typeof action !== 'object') {
    return action;
  }

  const sanitized: any = { ...action };

  // Sanitize payload if it exists
  if (sanitized.payload && typeof sanitized.payload === 'object') {
    // Remove any potential sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized.payload) {
        sanitized.payload[field] = '[REDACTED]';
      }
    }

    // Apply default state sanitizer to payload
    sanitized.payload = defaultStateSanitizer(sanitized.payload);
  }

  return sanitized;
}

/**
 * HOC to wrap a context provider with logging
 */
export function withLogging<P extends object>(
  Component: React.ComponentType<P>,
  contextName: string
): React.ComponentType<P> {
  return (props: P) => {
    logger.debug(contextName, `${contextName} provider mounted`);

    React.useEffect(() => {
      return () => {
        logger.debug(contextName, `${contextName} provider unmounted`);
      };
    }, []);

    return React.createElement(Component, props);
  };
}
