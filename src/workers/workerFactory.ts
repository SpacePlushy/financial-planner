/**
 * Factory for creating Web Workers in a test-friendly way
 */

export function createOptimizerWorker(): Worker {
  try {
    console.log('[WorkerFactory] Creating optimizer worker...');
    // In production/development, create the worker directly
    // The build system (webpack/vite) will handle the worker bundling
    const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), {
      type: 'module',
    });
    console.log('[WorkerFactory] Worker created successfully');
    return worker;
  } catch (error) {
    console.error('[WorkerFactory] Failed to create worker:', error);
    throw error;
  }
}
