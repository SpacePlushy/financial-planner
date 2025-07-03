import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';
import {
  OptimizationProgress,
  OptimizationResult,
  GenerationStatistics,
} from '../types';
import { createLoggingMiddleware } from './middleware/loggingMiddleware';
import { logger } from '../utils/logger';
import { useConfiguration } from './ConfigurationContext';

/**
 * Progress state interface
 */
interface ProgressState {
  isOptimizing: boolean;
  currentProgress: OptimizationProgress | null;
  lastResult: OptimizationResult | null;
  generationHistory: GenerationStatistics[];
  startTime: number | null;
  endTime: number | null;
  isPaused: boolean;
  error: Error | null;
}

/**
 * Progress actions interface
 */
interface ProgressActions {
  startOptimization: () => void;
  updateProgress: (progress: OptimizationProgress) => void;
  completeOptimization: (result: OptimizationResult) => void;
  cancelOptimization: () => void;
  pauseOptimization: () => void;
  resumeOptimization: () => void;
  setError: (error: Error | null) => void;
  clearHistory: () => void;
  addGenerationStats: (stats: GenerationStatistics) => void;
}

/**
 * Progress context value type
 */
type ProgressContextValue = ProgressState & ProgressActions;

/**
 * Action types for the progress reducer
 */
type ProgressActionType =
  | { type: 'START_OPTIMIZATION' }
  | { type: 'UPDATE_PROGRESS'; payload: OptimizationProgress }
  | { type: 'COMPLETE_OPTIMIZATION'; payload: OptimizationResult }
  | { type: 'CANCEL_OPTIMIZATION' }
  | { type: 'PAUSE_OPTIMIZATION' }
  | { type: 'RESUME_OPTIMIZATION' }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'ADD_GENERATION_STATS'; payload: GenerationStatistics };

/**
 * Initial state for the progress context
 */
const initialState: ProgressState = {
  isOptimizing: false,
  currentProgress: null,
  lastResult: null,
  generationHistory: [],
  startTime: null,
  endTime: null,
  isPaused: false,
  error: null,
};

/**
 * Progress reducer to handle state updates
 */
function progressReducer(
  state: ProgressState,
  action: ProgressActionType
): ProgressState {
  switch (action.type) {
    case 'START_OPTIMIZATION':
      return {
        ...state,
        isOptimizing: true,
        currentProgress: null,
        startTime: Date.now(),
        endTime: null,
        isPaused: false,
        error: null,
        generationHistory: [],
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        currentProgress: action.payload,
        error: null,
      };

    case 'COMPLETE_OPTIMIZATION':
      return {
        ...state,
        isOptimizing: false,
        lastResult: action.payload,
        endTime: Date.now(),
        isPaused: false,
        error: null,
      };

    case 'CANCEL_OPTIMIZATION':
      return {
        ...state,
        isOptimizing: false,
        isPaused: false,
        endTime: Date.now(),
      };

    case 'PAUSE_OPTIMIZATION':
      return {
        ...state,
        isPaused: true,
      };

    case 'RESUME_OPTIMIZATION':
      return {
        ...state,
        isPaused: false,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isOptimizing: false,
        isPaused: false,
        endTime: action.payload ? Date.now() : state.endTime,
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        generationHistory: [],
      };

    case 'ADD_GENERATION_STATS':
      return {
        ...state,
        generationHistory: [...state.generationHistory, action.payload],
      };

    default:
      return state;
  }
}

/**
 * Progress context
 */
const ProgressContext = createContext<ProgressContextValue | undefined>(
  undefined
);

/**
 * Progress context provider props
 */
interface ProgressProviderProps {
  children: ReactNode;
  maxHistorySize?: number;
}

/**
 * Progress context provider component
 */
export function ProgressProvider({
  children,
  maxHistorySize = 100,
}: ProgressProviderProps) {
  // Create wrapped reducer with logging middleware
  const wrappedReducer = React.useMemo(
    () =>
      createLoggingMiddleware(progressReducer, {
        contextName: 'ProgressContext',
        enabled:
          process.env.NODE_ENV !== 'test' &&
          (process.env.NODE_ENV !== 'production' ||
            process.env.REACT_APP_ENABLE_LOGGING === 'true'),
        logStateDiff: process.env.REACT_APP_LOG_STATE_DIFF === 'true',
      }),
    []
  );

  const [state, dispatch] = useReducer(wrappedReducer, initialState);

  // Log provider mount/unmount
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'test') {
      logger.info('ProgressContext', 'ProgressProvider mounted', {
        maxHistorySize,
      });
    }

    return () => {
      if (process.env.NODE_ENV !== 'test') {
        logger.info('ProgressContext', 'ProgressProvider unmounted');
      }
    };
  }, []);

  // Optimization control actions
  const startOptimization = useCallback(() => {
    dispatch({ type: 'START_OPTIMIZATION' });
  }, []);

  const updateProgress = useCallback((progress: OptimizationProgress) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
  }, []);

  const completeOptimization = useCallback((result: OptimizationResult) => {
    dispatch({ type: 'COMPLETE_OPTIMIZATION', payload: result });
  }, []);

  const cancelOptimization = useCallback(() => {
    dispatch({ type: 'CANCEL_OPTIMIZATION' });
  }, []);

  const pauseOptimization = useCallback(() => {
    dispatch({ type: 'PAUSE_OPTIMIZATION' });
  }, []);

  const resumeOptimization = useCallback(() => {
    dispatch({ type: 'RESUME_OPTIMIZATION' });
  }, []);

  // Error handling
  const setError = useCallback((error: Error | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  // History management
  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const addGenerationStats = useCallback(
    (stats: GenerationStatistics) => {
      // Limit history size to prevent memory issues
      if (state.generationHistory.length >= maxHistorySize) {
        dispatch({ type: 'CLEAR_HISTORY' });
      }
      dispatch({ type: 'ADD_GENERATION_STATS', payload: stats });
    },
    [state.generationHistory.length, maxHistorySize]
  );

  const actions: ProgressActions = {
    startOptimization,
    updateProgress,
    completeOptimization,
    cancelOptimization,
    pauseOptimization,
    resumeOptimization,
    setError,
    clearHistory,
    addGenerationStats,
  };

  const value: ProgressContextValue = {
    ...state,
    ...actions,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

/**
 * Custom hook to use the progress context
 */
export function useProgressContext(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error(
      'useProgressContext must be used within a ProgressProvider'
    );
  }
  return context;
}

/**
 * Custom hook for progress management with utilities
 */
export function useProgress() {
  const context = useProgressContext();
  const config = useConfiguration();

  // Utility functions
  const getElapsedTime = useCallback(() => {
    if (!context.startTime) return 0;
    const endTime = context.endTime || Date.now();
    return endTime - context.startTime;
  }, [context.startTime, context.endTime]);

  const getProgressPercentage = useCallback(() => {
    if (!context.currentProgress) return 0;
    return Math.round(
      (context.currentProgress.generation / config.config.generations) * 100
    );
  }, [context.currentProgress, config.config.generations]);

  const getEstimatedTimeRemaining = useCallback(() => {
    if (!context.currentProgress || !context.startTime) return null;

    const elapsed = Date.now() - context.startTime;
    const progressRatio =
      context.currentProgress.generation / config.config.generations;

    if (progressRatio === 0) return null;

    const totalEstimated = elapsed / progressRatio;
    const remaining = totalEstimated - elapsed;

    return Math.max(0, Math.round(remaining));
  }, [context.currentProgress, context.startTime, config.config.generations]);

  const getAverageFitness = useCallback(() => {
    if (context.generationHistory.length === 0) return 0;

    const sum = context.generationHistory.reduce(
      (acc, gen) => acc + gen.fitness,
      0
    );
    return sum / context.generationHistory.length;
  }, [context.generationHistory]);

  const getImprovementRate = useCallback(() => {
    if (context.generationHistory.length < 2) return 0;

    const recent = context.generationHistory.slice(-10);
    if (recent.length < 2) return 0;

    const firstFitness = recent[0].fitness;
    const lastFitness = recent[recent.length - 1].fitness;

    return ((lastFitness - firstFitness) / firstFitness) * 100;
  }, [context.generationHistory]);

  const formatTime = useCallback((milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  return {
    ...context,
    // Utility functions
    getElapsedTime,
    getProgressPercentage,
    getEstimatedTimeRemaining,
    getAverageFitness,
    getImprovementRate,
    formatTime,
  };
}
