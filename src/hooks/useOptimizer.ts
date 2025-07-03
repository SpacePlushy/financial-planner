import { useState, useCallback, useRef, useEffect } from 'react';
import {
  OptimizationConfig,
  OptimizationProgress,
  OptimizationResult,
} from '../types';
import { useScheduleContext } from '../context/ScheduleContext';
import { useProgress } from '../context/ProgressContext';
import { logger } from '../utils/logger';
import { createOptimizerWorker } from '../workers/workerFactory';

interface OptimizationHistory {
  id: string;
  startTime: Date;
  endTime?: Date;
  config: OptimizationConfig;
  result?: OptimizationResult;
  error?: string;
  status: 'running' | 'completed' | 'cancelled' | 'error';
  performance: {
    totalTime?: number;
    generationsRun?: number;
    averageTimePerGeneration?: number;
  };
}

interface UseOptimizerState {
  isOptimizing: boolean;
  isPaused: boolean;
  progress: OptimizationProgress | null;
  error: string | null;
  history: OptimizationHistory[];
  currentOptimization: OptimizationHistory | null;
}

interface UseOptimizerReturn extends UseOptimizerState {
  startOptimization: (config: OptimizationConfig) => Promise<void>;
  cancelOptimization: () => void;
  pauseOptimization: () => void;
  resumeOptimization: () => void;
  clearHistory: () => void;
  retryOptimization: (historyId: string) => Promise<void>;
}

const MAX_HISTORY_SIZE = 10;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

export function useOptimizer(): UseOptimizerReturn {
  const {
    setOptimizationResult,
    setCurrentSchedule,
    expenses,
    deposits,
    shiftTypes,
  } = useScheduleContext();

  const {
    startOptimization: startProgressOptimization,
    updateProgress,
    completeOptimization,
    cancelOptimization: cancelProgressOptimization,
    pauseOptimization: pauseProgressOptimization,
    resumeOptimization: resumeProgressOptimization,
    setError: setProgressError,
  } = useProgress();

  const [state, setState] = useState<UseOptimizerState>({
    isOptimizing: false,
    isPaused: false,
    progress: null,
    error: null,
    history: [],
    currentOptimization: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const retryCountRef = useRef(0);
  const optimizationStartTimeRef = useRef<number>(0);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const createWorker = useCallback(() => {
    // Create a new worker
    let worker: Worker;

    // In test environment, always use the factory (which should be mocked)
    if (process.env.NODE_ENV === 'test') {
      worker = createOptimizerWorker();
    } else {
      // In browser environment, use the worker factory which handles URL creation
      worker = createOptimizerWorker();
    }

    worker.onmessage = event => {
      const { type, data, error } = event.data;
      console.log('Worker message received:', { type, data, error });

      switch (type) {
        case 'progress':
          const progressData = data as OptimizationProgress;
          setState(prev => ({
            ...prev,
            progress: progressData,
          }));
          updateProgress(progressData);
          break;

        case 'complete':
          console.log('Worker completed optimization, result:', data);
          const endTime = Date.now();
          const totalTime = endTime - optimizationStartTimeRef.current;
          const result = data as OptimizationResult;

          // Update schedule context
          setOptimizationResult(result);
          if (result.formattedSchedule) {
            setCurrentSchedule(result.formattedSchedule);
          }

          // Update progress context
          completeOptimization(result);

          setState(prev => {
            const currentOpt = prev.currentOptimization;
            if (currentOpt) {
              currentOpt.endTime = new Date();
              currentOpt.status = 'completed';
              currentOpt.result = result;
              currentOpt.performance = {
                totalTime,
                generationsRun: prev.progress?.generation || 0,
                averageTimePerGeneration:
                  totalTime / (prev.progress?.generation || 1),
              };
            }

            return {
              ...prev,
              isOptimizing: false,
              isPaused: false,
              error: null,
              currentOptimization: null,
              history: [
                ...(currentOpt ? [currentOpt] : []),
                ...prev.history.slice(0, MAX_HISTORY_SIZE - 1),
              ],
            };
          });

          logger.info('useOptimizer', 'Optimization completed', {
            totalTime,
            workDays: result.workDays.length,
            finalBalance: result.finalBalance,
            violations: result.violations,
          });
          break;

        case 'error':
          setProgressError(new Error(error || 'Unknown error occurred'));
          setState(prev => {
            const currentOpt = prev.currentOptimization;
            if (currentOpt) {
              currentOpt.endTime = new Date();
              currentOpt.status = 'error';
              currentOpt.error = error;
            }

            return {
              ...prev,
              isOptimizing: false,
              isPaused: false,
              error: error || 'Unknown error occurred',
              currentOptimization: null,
              history: [
                ...(currentOpt ? [currentOpt] : []),
                ...prev.history.slice(0, MAX_HISTORY_SIZE - 1),
              ],
            };
          });

          logger.error('useOptimizer', 'Optimization error', error as Error);
          break;

        case 'cancelled':
          cancelProgressOptimization();
          setState(prev => {
            const currentOpt = prev.currentOptimization;
            if (currentOpt) {
              currentOpt.endTime = new Date();
              currentOpt.status = 'cancelled';
            }

            return {
              ...prev,
              isOptimizing: false,
              isPaused: false,
              error: null,
              currentOptimization: null,
              history: [
                ...(currentOpt ? [currentOpt] : []),
                ...prev.history.slice(0, MAX_HISTORY_SIZE - 1),
              ],
            };
          });

          logger.info('useOptimizer', 'Optimization cancelled');
          break;

        case 'paused':
          setState(prev => ({ ...prev, isPaused: true }));
          pauseProgressOptimization();
          logger.info('useOptimizer', 'Optimization paused');
          break;

        case 'resumed':
          setState(prev => ({ ...prev, isPaused: false }));
          resumeProgressOptimization();
          logger.info('useOptimizer', 'Optimization resumed');
          break;
      }
    };

    worker.onerror = error => {
      console.error('Worker error occurred:', error);
      logger.error('useOptimizer', 'Worker error', new Error(error.message));
      setState(prev => ({
        ...prev,
        isOptimizing: false,
        isPaused: false,
        error: 'Worker error: ' + error.message,
      }));
      setProgressError(new Error('Worker error: ' + error.message));
    };

    return worker;
  }, [setOptimizationResult, setCurrentSchedule]);

  const startOptimization = useCallback(
    async (config: OptimizationConfig): Promise<void> => {
      logger.info('useOptimizer', 'Starting optimization', { config });

      // Reset retry count
      retryCountRef.current = 0;
      optimizationStartTimeRef.current = Date.now();

      // Create optimization history entry
      const optimizationId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const optimization: OptimizationHistory = {
        id: optimizationId,
        startTime: new Date(),
        config,
        status: 'running',
        performance: {},
      };

      setState(prev => ({
        ...prev,
        isOptimizing: true,
        isPaused: false,
        progress: null,
        error: null,
        currentOptimization: optimization,
      }));

      console.log('Optimization started - isOptimizing set to true', {
        isOptimizing: true,
        state: state,
        config,
      });

      // Start progress tracking
      startProgressOptimization();

      try {
        // Terminate existing worker if any
        if (workerRef.current) {
          workerRef.current.terminate();
        }

        // Create new worker
        console.log('Creating new worker...');
        workerRef.current = createWorker();
        console.log('Worker created successfully:', workerRef.current);

        // Start optimization
        workerRef.current.postMessage({
          type: 'start',
          config,
          expenses,
          deposits,
          shiftTypes,
        });
      } catch (error) {
        console.error('Failed to create/start worker:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to start optimization';

        // Retry logic
        if (retryCountRef.current < RETRY_ATTEMPTS) {
          retryCountRef.current++;
          logger.warn(
            'useOptimizer',
            `Retrying optimization (attempt ${retryCountRef.current}/${RETRY_ATTEMPTS})`
          );

          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return startOptimization(config);
        }

        setState(prev => ({
          ...prev,
          isOptimizing: false,
          error: errorMessage,
          currentOptimization: null,
        }));

        // Loading state is managed by progress context

        setProgressError(new Error(errorMessage));
        console.error('Optimization failed after retries:', errorMessage);
        logger.error(
          'useOptimizer',
          'Failed to start optimization',
          new Error(errorMessage)
        );
      }
    },
    [createWorker, expenses, deposits, shiftTypes]
  );

  const cancelOptimization = useCallback(() => {
    if (workerRef.current && state.isOptimizing) {
      logger.info('useOptimizer', 'Cancelling optimization');
      workerRef.current.postMessage({ type: 'cancel' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, [state.isOptimizing]);

  const pauseOptimization = useCallback(() => {
    if (workerRef.current && state.isOptimizing && !state.isPaused) {
      logger.info('useOptimizer', 'Pausing optimization');
      workerRef.current.postMessage({ type: 'pause' });
    }
  }, [state.isOptimizing, state.isPaused]);

  const resumeOptimization = useCallback(() => {
    if (workerRef.current && state.isOptimizing && state.isPaused) {
      logger.info('useOptimizer', 'Resuming optimization');
      workerRef.current.postMessage({ type: 'resume' });
    }
  }, [state.isOptimizing, state.isPaused]);

  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
    logger.info('useOptimizer', 'History cleared');
  }, []);

  const retryOptimization = useCallback(
    async (historyId: string) => {
      const historyItem = state.history.find(h => h.id === historyId);
      if (historyItem) {
        logger.info('useOptimizer', 'Retrying optimization from history', {
          historyId,
        });
        await startOptimization(historyItem.config);
      }
    },
    [state.history, startOptimization]
  );

  return {
    ...state,
    startOptimization,
    cancelOptimization,
    pauseOptimization,
    resumeOptimization,
    clearHistory,
    retryOptimization,
  };
}
