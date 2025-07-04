/**
 * Factory for creating Web Workers in a test-friendly way
 */

export function createOptimizerWorker(): Worker {
  try {
    // Check if we're in a test environment (Jest doesn't support import.meta)
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      // In test environment, this function should be mocked
      throw new Error('createOptimizerWorker should be mocked in tests');
    }

    // In production/development, create the worker directly
    // The build system (webpack/vite) will handle the worker bundling
    const worker = new Worker(
      new URL('./optimizer.worker.ts', import.meta.url),
      {
        type: 'module',
      }
    );
    return worker;
  } catch (error) {
    throw error;
  }
}
