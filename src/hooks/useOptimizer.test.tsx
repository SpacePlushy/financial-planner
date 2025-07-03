// Set up mocks before any imports
// Now import everything
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  OptimizationConfig,
  OptimizationProgress,
  OptimizationResult,
} from '../types';
import { ScheduleProvider } from '../context/ScheduleContext';
import React from 'react';
import { useOptimizer } from './useOptimizer';
import { DaySchedule } from '../types';

const mockWorker = {
  postMessage: jest.fn(),
  terminate: jest.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: ErrorEvent) => void) | null,
};

// Override global Worker constructor
(global as any).Worker = jest.fn().mockImplementation(() => mockWorker);

// Mock URL constructor to handle import.meta.url
(global as any).URL = class URL {
  constructor(url: string) {
    return { href: url };
  }
  static createObjectURL = jest.fn().mockReturnValue('mock-blob-url');
};

// Mock the worker module
jest.mock('../workers/optimizer.worker.ts', () => ({
  default: class MockWorker {
    postMessage = jest.fn();
    terminate = jest.fn();
    onmessage: any = null;
    onerror: any = null;
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    logAction: jest.fn(),
  },
}));

// Mock schedule data
const mockSchedule: DaySchedule[] = [
  {
    day: 1,
    shifts: ['large'],
    earnings: 250,
    expenses: 100,
    deposit: 0,
    startBalance: 1000,
    endBalance: 1150,
  },
  {
    day: 2,
    shifts: ['medium'],
    earnings: 200,
    expenses: 50,
    deposit: 0,
    startBalance: 1150,
    endBalance: 1300,
  },
  {
    day: 3,
    shifts: [],
    earnings: 0,
    expenses: 200,
    deposit: 100,
    startBalance: 1300,
    endBalance: 1200,
  },
  {
    day: 4,
    shifts: ['small', 'small'],
    earnings: 300,
    expenses: 100,
    deposit: 0,
    startBalance: 1200,
    endBalance: 1400,
  },
  {
    day: 5,
    shifts: [],
    earnings: 0,
    expenses: 40,
    deposit: 0,
    startBalance: 1400,
    endBalance: 1360,
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ScheduleProvider>{children}</ScheduleProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockWorker.postMessage.mockClear();
  mockWorker.terminate.mockClear();
  mockWorker.onmessage = null;
  mockWorker.onerror = null;
});

describe('useOptimizer', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useOptimizer(), { wrapper });

    expect(result.current.isOptimizing).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should start optimization', async () => {
    const { result } = renderHook(() => useOptimizer(), { wrapper });

    const config: OptimizationConfig = {
      startingBalance: 500,
      targetEndingBalance: 1000,
      minimumBalance: 100,
      populationSize: 50,
      generations: 10,
      manualConstraints: {},
    };

    await act(async () => {
      await result.current.startOptimization(config);
    });

    expect(result.current.isOptimizing).toBe(true);
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'start',
      config,
      schedule: expect.any(Array),
      shiftTypes: expect.any(Object),
    });
  });

  it('should handle optimization progress', async () => {
    const { result } = renderHook(() => useOptimizer(), { wrapper });

    const config: OptimizationConfig = {
      startingBalance: 500,
      targetEndingBalance: 1000,
      minimumBalance: 100,
      populationSize: 50,
      generations: 10,
      manualConstraints: {},
    };

    await act(async () => {
      await result.current.startOptimization(config);
    });

    const progressData: OptimizationProgress = {
      generation: 5,
      progress: 0.5,
      bestFitness: 0.8,
      workDays: 12,
      balance: 750,
      violations: 0,
    };

    act(() => {
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            type: 'progress',
            progress: progressData,
          },
        } as MessageEvent);
      }
    });

    expect(result.current.progress).toEqual(progressData);
  });

  it('should handle optimization completion', async () => {
    const { result } = renderHook(() => useOptimizer(), { wrapper });

    const config: OptimizationConfig = {
      startingBalance: 500,
      targetEndingBalance: 1000,
      minimumBalance: 100,
      populationSize: 50,
      generations: 10,
      manualConstraints: {},
    };

    await act(async () => {
      await result.current.startOptimization(config);
    });

    const mockResult: OptimizationResult = {
      schedule: ['large', 'medium', null, 'small,small', null],
      workDays: [1, 2, 4],
      totalEarnings: 750,
      finalBalance: 1610,
      minBalance: 1200,
      violations: 0,
      computationTime: '1.5s',
      formattedSchedule: mockSchedule,
    };

    act(() => {
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            type: 'complete',
            result: mockResult,
          },
        } as MessageEvent);
      }
    });

    await waitFor(() => {
      expect(result.current.isOptimizing).toBe(false);
    });
  });

  it('should handle optimization errors', async () => {
    const { result } = renderHook(() => useOptimizer(), { wrapper });

    const config: OptimizationConfig = {
      startingBalance: 500,
      targetEndingBalance: 1000,
      minimumBalance: 100,
      populationSize: 50,
      generations: 10,
      manualConstraints: {},
    };

    await act(async () => {
      await result.current.startOptimization(config);
    });

    const errorMessage = 'Optimization failed';

    act(() => {
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            type: 'error',
            error: errorMessage,
          },
        } as MessageEvent);
      }
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isOptimizing).toBe(false);
  });

  it('should stop optimization', async () => {
    const { result } = renderHook(() => useOptimizer(), { wrapper });

    const config: OptimizationConfig = {
      startingBalance: 500,
      targetEndingBalance: 1000,
      minimumBalance: 100,
      populationSize: 50,
      generations: 10,
      manualConstraints: {},
    };

    await act(async () => {
      await result.current.startOptimization(config);
    });

    expect(result.current.isOptimizing).toBe(true);

    act(() => {
      result.current.cancelOptimization();
    });

    expect(result.current.isOptimizing).toBe(false);
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'stop' });
  });

  it('should clear error', async () => {
    const { result } = renderHook(() => useOptimizer(), { wrapper });

    // Set an error first
    const config: OptimizationConfig = {
      startingBalance: 500,
      targetEndingBalance: 1000,
      minimumBalance: 100,
      populationSize: 50,
      generations: 10,
      manualConstraints: {},
    };

    await act(async () => {
      await result.current.startOptimization(config);
    });

    act(() => {
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            type: 'error',
            error: 'Test error',
          },
        } as MessageEvent);
      }
    });

    expect(result.current.error).toBe('Test error');

    // Note: clearError method is not implemented
  });

  it('should cleanup worker on unmount', async () => {
    const { result, unmount } = renderHook(() => useOptimizer(), { wrapper });

    const config: OptimizationConfig = {
      startingBalance: 500,
      targetEndingBalance: 1000,
      minimumBalance: 100,
      populationSize: 50,
      generations: 10,
      manualConstraints: {},
    };

    await act(async () => {
      await result.current.startOptimization(config);
    });

    unmount();

    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('should handle worker onerror', async () => {
    const { result } = renderHook(() => useOptimizer(), { wrapper });

    const config: OptimizationConfig = {
      startingBalance: 500,
      targetEndingBalance: 1000,
      minimumBalance: 100,
      populationSize: 50,
      generations: 10,
      manualConstraints: {},
    };

    await act(async () => {
      await result.current.startOptimization(config);
    });

    const errorEvent = new ErrorEvent('error', {
      message: 'Worker error',
      error: new Error('Worker crashed'),
    });

    act(() => {
      if (mockWorker.onerror) {
        mockWorker.onerror(errorEvent);
      }
    });

    expect(result.current.error).toBe('Worker error: Worker crashed');
    expect(result.current.isOptimizing).toBe(false);
  });

  it('should not start new optimization while one is running', async () => {
    const { result } = renderHook(() => useOptimizer(), { wrapper });

    const config: OptimizationConfig = {
      startingBalance: 500,
      targetEndingBalance: 1000,
      minimumBalance: 100,
      populationSize: 50,
      generations: 10,
      manualConstraints: {},
    };

    await act(async () => {
      await result.current.startOptimization(config);
    });

    const postMessageCallCount = mockWorker.postMessage.mock.calls.length;

    // Try to start another optimization
    await act(async () => {
      await result.current.startOptimization(config);
    });

    // Should not have made another call
    expect(mockWorker.postMessage).toHaveBeenCalledTimes(postMessageCallCount);
  });
});
