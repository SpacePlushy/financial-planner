/**
 * Factory for creating Web Workers in a test-friendly way
 */

export function createOptimizerWorker(): Worker {
  // In production/development, create the worker directly
  // The build system (webpack/vite) will handle the worker bundling
  return new Worker(new URL('./optimizer.worker.ts', import.meta.url), {
    type: 'module',
  });
}
