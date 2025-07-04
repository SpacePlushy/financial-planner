import { useState, useCallback, useRef } from 'react';
import { OptimizationProgress, OptimizationResult } from '../types';
import { useScheduleContext } from '../context/ScheduleContext';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { useProgress } from '../context/ProgressContext';
import { logger } from '../utils/logger';
import { createOptimizerWorker } from '../workers/workerFactory';
import { ServerOptimizer } from '../services/serverOptimizer';

export type ProcessingMode = 'client' | 'server' | 'both';

export interface ProcessingMetrics {
  clientTime?: number;
  serverTime?: number;
  serverRegion?: string;
  clientStarted?: Date;
  clientCompleted?: Date;
  serverStarted?: Date;
  serverCompleted?: Date;
}

interface UseDualOptimizerReturn {
  isOptimizing: boolean;
  clientProgress: OptimizationProgress | null;
  serverProgress: OptimizationProgress | null;
  error: string | null;
  processingMode: ProcessingMode;
  metrics: ProcessingMetrics;
  startOptimization: (mode?: ProcessingMode) => Promise<void>;
  cancelOptimization: () => void;
  setProcessingMode: (mode: ProcessingMode) => void;
}

export function useDualOptimizer(): UseDualOptimizerReturn {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [clientProgress, setClientProgress] =
    useState<OptimizationProgress | null>(null);
  const [serverProgress, setServerProgress] =
    useState<OptimizationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('both');
  const [metrics, setMetrics] = useState<ProcessingMetrics>({});

  const workerRef = useRef<Worker | null>(null);
  const serverOptimizer = useRef(new ServerOptimizer());

  const { setCurrentSchedule, expenses, deposits, shiftTypes } =
    useScheduleContext();
  const { config } = useConfigurationContext();
  const progressContext = useProgress();

  const runClientOptimization = useCallback(async (): Promise<{
    result: OptimizationResult | null;
    time: number;
  }> => {
    return new Promise(resolve => {
      const startTime = Date.now();
      setMetrics(prev => ({ ...prev, clientStarted: new Date() }));

      try {
        workerRef.current = createOptimizerWorker();

        workerRef.current.addEventListener('message', event => {
          const { type, data, error } = event.data;

          switch (type) {
            case 'progress':
              setClientProgress(data as OptimizationProgress);
              if (processingMode === 'client' || processingMode === 'both') {
                progressContext.updateProgress(data as OptimizationProgress);
              }
              break;

            case 'complete':
              const endTime = Date.now();
              const totalTime = endTime - startTime;
              setMetrics(prev => ({
                ...prev,
                clientTime: totalTime,
                clientCompleted: new Date(),
              }));
              resolve({ result: data as OptimizationResult, time: totalTime });
              break;

            case 'error':
              setError(`Client error: ${error}`);
              resolve({ result: null, time: Date.now() - startTime });
              break;
          }
        });

        workerRef.current.postMessage({
          type: 'start',
          config,
          expenses,
          deposits,
          shiftTypes,
        });
      } catch (err) {
        logger.error('DualOptimizer', 'Client optimization error', err);
        setError(
          `Client error: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
        resolve({ result: null, time: Date.now() - startTime });
      }
    });
  }, [config, expenses, deposits, shiftTypes, processingMode, progressContext]);

  const runServerOptimization = useCallback(async (): Promise<{
    result: OptimizationResult | null;
    time: number;
  }> => {
    const startTime = Date.now();
    setMetrics(prev => ({ ...prev, serverStarted: new Date() }));

    // Show initial server progress
    setServerProgress({
      generation: 0,
      progress: 0,
      bestFitness: 0,
      workDays: 0,
      balance: 0,
      violations: 0,
    });

    try {
      const response = await serverOptimizer.current.optimize(
        config,
        expenses,
        deposits,
        shiftTypes
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      if (response.success && response.result) {
        setMetrics(prev => ({
          ...prev,
          serverTime: response.performanceMetrics.totalTime,
          serverRegion: response.performanceMetrics.serverRegion,
          serverCompleted: new Date(),
        }));

        // Show final server progress
        setServerProgress({
          generation: config.generations,
          progress: 100,
          bestFitness: 100 - response.result.violations, // Approximate fitness
          workDays: response.result.workDays.length,
          balance: response.result.finalBalance,
          violations: response.result.violations,
        });

        return {
          result: response.result,
          time: response.performanceMetrics.totalTime,
        };
      } else {
        setError(`Server error: ${response.error}`);
        return { result: null, time: totalTime };
      }
    } catch (err) {
      logger.error('DualOptimizer', 'Server optimization error', err);
      setError(
        `Server error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      return { result: null, time: Date.now() - startTime };
    }
  }, [config, expenses, deposits, shiftTypes]);

  const startOptimization = useCallback(
    async (mode: ProcessingMode = processingMode) => {
      setIsOptimizing(true);
      setError(null);
      setClientProgress(null);
      setServerProgress(null);
      setMetrics({});

      try {
        if (mode === 'client') {
          const { result } = await runClientOptimization();
          if (result) {
            setCurrentSchedule(result.formattedSchedule);
            // Result is already tracked via progress updates
          }
        } else if (mode === 'server') {
          const { result } = await runServerOptimization();
          if (result) {
            setCurrentSchedule(result.formattedSchedule);
            // Result is already tracked via progress updates
          }
        } else if (mode === 'both') {
          // Run both in parallel
          const [clientResult, serverResult] = await Promise.all([
            runClientOptimization(),
            runServerOptimization(),
          ]);

          // Use the client result as the primary result (it has real-time progress)
          if (clientResult.result) {
            setCurrentSchedule(clientResult.result.formattedSchedule);
          } else if (serverResult.result) {
            setCurrentSchedule(serverResult.result.formattedSchedule);
          }

          // Log performance comparison
          logger.info('DualOptimizer', 'Performance comparison', {
            clientTime: clientResult.time,
            serverTime: serverResult.time,
            speedup:
              clientResult.time > 0
                ? (clientResult.time / serverResult.time).toFixed(2)
                : 'N/A',
          });
        }
      } catch (err) {
        logger.error('DualOptimizer', 'Optimization error', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsOptimizing(false);
      }
    },
    [
      processingMode,
      runClientOptimization,
      runServerOptimization,
      setCurrentSchedule,
    ]
  );

  const cancelOptimization = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsOptimizing(false);
    setClientProgress(null);
    setServerProgress(null);
  }, []);

  return {
    isOptimizing,
    clientProgress,
    serverProgress,
    error,
    processingMode,
    metrics,
    startOptimization,
    cancelOptimization,
    setProcessingMode,
  };
}
