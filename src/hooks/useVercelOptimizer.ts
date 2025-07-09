import { useState, useCallback } from 'react';
import {
  OptimizationConfig,
  OptimizationResult,
  OptimizationProgress,
} from '../types';

/**
 * Hook for using Vercel-hosted optimization with BotID protection
 * Falls back to client-side optimization in development
 */
export function useVercelOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optimize = useCallback(
    async (
      config: OptimizationConfig,
      onProgress?: (progress: OptimizationProgress) => void
    ): Promise<OptimizationResult | null> => {
      setIsOptimizing(true);
      setError(null);
      setProgress(null);

      try {
        // Check if we're in production (deployed to Vercel)
        const isProduction = process.env.NODE_ENV === 'production';
        const hasVercelUrl =
          process.env.REACT_APP_VERCEL_URL ||
          window.location.hostname.includes('vercel.app');

        if (isProduction && hasVercelUrl) {
          // Use server-side optimization with BotID protection
          const response = await fetch('/api/optimize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Optimization failed');
          }

          // Handle Server-Sent Events for progress updates
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'progress') {
                    setProgress(data.data);
                    onProgress?.(data.data);
                  } else if (data.type === 'complete') {
                    return data.data as OptimizationResult;
                  }
                }
              }
            }
          }
        } else {
          // Fallback to client-side optimization in development
          console.log('Using client-side optimization (development mode)');

          // Import dynamically to avoid loading in production
          const { GeneticOptimizer } = await import(
            '../services/geneticOptimizer/GeneticOptimizer'
          );
          const optimizer = new GeneticOptimizer(config);

          const result = await optimizer.optimize(async progress => {
            setProgress(progress);
            onProgress?.(progress);
          });

          return result;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred';
        setError(message);
        console.error('Optimization error:', error);
        return null;
      } finally {
        setIsOptimizing(false);
      }

      return null;
    },
    []
  );

  return {
    optimize,
    isOptimizing,
    progress,
    error,
  };
}
