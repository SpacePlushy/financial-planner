/// <reference lib="webworker" />

import { GeneticOptimizer } from '../services/geneticOptimizer/GeneticOptimizer';
import {
  OptimizationConfig,
  OptimizationProgress,
  OptimizationResult,
  Expense,
  Deposit,
  ShiftTypes,
} from '../types';

interface WorkerMessage {
  type: 'start' | 'cancel' | 'pause' | 'resume';
  config?: OptimizationConfig;
  expenses?: Expense[];
  deposits?: Deposit[];
  shiftTypes?: ShiftTypes;
}

interface WorkerResponse {
  type: 'progress' | 'complete' | 'error' | 'cancelled' | 'paused' | 'resumed';
  data?: OptimizationProgress | OptimizationResult;
  error?: string;
}

let optimizer: GeneticOptimizer | null = null;
let isPaused = false;
let isCancelled = false;

// Set up the worker context
declare const self: DedicatedWorkerGlobalScope;

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, config, expenses, deposits, shiftTypes } = event.data;

  switch (type) {
    case 'start':
      if (!config) {
        self.postMessage({
          type: 'error',
          error: 'No configuration provided',
        } as WorkerResponse);
        return;
      }

      try {
        optimizer = new GeneticOptimizer(
          config,
          expenses || [],
          deposits || [],
          shiftTypes
        );
        isPaused = false;
        isCancelled = false;

        const result = await optimizer.optimize(async progress => {
          // Check if cancelled
          if (isCancelled) {
            throw new Error('Optimization cancelled');
          }

          // Handle pause
          while (isPaused && !isCancelled) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Send progress update
          self.postMessage({
            type: 'progress',
            data: progress,
          } as WorkerResponse);
        });

        if (!isCancelled) {
          self.postMessage({
            type: 'complete',
            data: result,
          } as WorkerResponse);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Optimization cancelled'
        ) {
          self.postMessage({
            type: 'cancelled',
          } as WorkerResponse);
        } else {
          self.postMessage({
            type: 'error',
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          } as WorkerResponse);
        }
      }
      break;

    case 'cancel':
      isCancelled = true;
      isPaused = false;
      optimizer = null;
      break;

    case 'pause':
      isPaused = true;
      self.postMessage({ type: 'paused' } as WorkerResponse);
      break;

    case 'resume':
      isPaused = false;
      self.postMessage({ type: 'resumed' } as WorkerResponse);
      break;
  }
});

// Export empty object to make TypeScript happy
export {};
