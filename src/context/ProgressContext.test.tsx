import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProgressProvider,
  useProgressContext,
  useProgress,
} from './ProgressContext';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Test component that uses progress context
function TestComponent() {
  const progress = useProgressContext();

  return (
    <div>
      <div data-testid="is-optimizing">{progress.isOptimizing.toString()}</div>
      <div data-testid="is-paused">{progress.isPaused.toString()}</div>
      <div data-testid="has-error">{progress.error ? 'true' : 'false'}</div>
      <div data-testid="current-generation">
        {progress.currentProgress?.generation || 'none'}
      </div>
      <div data-testid="history-length">
        {progress.generationHistory.length}
      </div>

      <button onClick={() => progress.startOptimization()}>Start</button>
      <button
        onClick={() =>
          progress.updateProgress({
            generation: 50,
            progress: 0.5,
            bestFitness: 0.8,
            workDays: 15,
            balance: 5000,
            violations: 0,
          })
        }
      >
        Update Progress
      </button>
      <button
        onClick={() =>
          progress.completeOptimization({
            schedule: [],
            workDays: [1, 2, 3],
            totalEarnings: 5000,
            finalBalance: 8000,
            minBalance: 1000,
            violations: 0,
            computationTime: '5000ms',
            formattedSchedule: [],
          })
        }
      >
        Complete
      </button>
      <button onClick={() => progress.cancelOptimization()}>Cancel</button>
      <button onClick={() => progress.pauseOptimization()}>Pause</button>
      <button onClick={() => progress.resumeOptimization()}>Resume</button>
      <button onClick={() => progress.setError(new Error('Test error'))}>
        Set Error
      </button>
      <button onClick={() => progress.clearHistory()}>Clear History</button>
      <button
        onClick={() =>
          progress.addGenerationStats({
            generation: 1,
            timestamp: Date.now(),
            fitness: 0.5,
            workDays: 10,
            violations: 0,
            balance: 4000,
          })
        }
      >
        Add Stats
      </button>
    </div>
  );
}

describe('ProgressContext', () => {
  describe('Provider', () => {
    it('should provide default values', () => {
      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      expect(screen.getByTestId('is-optimizing')).toHaveTextContent('false');
      expect(screen.getByTestId('is-paused')).toHaveTextContent('false');
      expect(screen.getByTestId('has-error')).toHaveTextContent('false');
      expect(screen.getByTestId('current-generation')).toHaveTextContent(
        'none'
      );
      expect(screen.getByTestId('history-length')).toHaveTextContent('0');
    });

    it('should throw error when used outside provider', () => {
      const TestErrorComponent = () => {
        try {
          useProgressContext();
          return <div>Should not render</div>;
        } catch (error) {
          return <div>{(error as Error).message}</div>;
        }
      };

      render(<TestErrorComponent />);
      expect(
        screen.getByText(
          'useProgressContext must be used within a ProgressProvider'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Optimization Control', () => {
    it('should start optimization', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Start'));
      expect(screen.getByTestId('is-optimizing')).toHaveTextContent('true');
      expect(screen.getByTestId('is-paused')).toHaveTextContent('false');
    });

    it('should update progress', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Update Progress'));

      expect(screen.getByTestId('current-generation')).toHaveTextContent('50');
    });

    it('should complete optimization', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Start'));
      expect(screen.getByTestId('is-optimizing')).toHaveTextContent('true');

      await user.click(screen.getByText('Complete'));
      expect(screen.getByTestId('is-optimizing')).toHaveTextContent('false');
    });

    it('should cancel optimization', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Cancel'));

      expect(screen.getByTestId('is-optimizing')).toHaveTextContent('false');
      expect(screen.getByTestId('is-paused')).toHaveTextContent('false');
    });

    it('should pause and resume optimization', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Pause'));
      expect(screen.getByTestId('is-paused')).toHaveTextContent('true');

      await user.click(screen.getByText('Resume'));
      expect(screen.getByTestId('is-paused')).toHaveTextContent('false');
    });
  });

  describe('Error Handling', () => {
    it('should set and clear error', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Set Error'));
      expect(screen.getByTestId('has-error')).toHaveTextContent('true');
      expect(screen.getByTestId('is-optimizing')).toHaveTextContent('false');
    });

    it('should clear error when starting new optimization', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Set Error'));
      expect(screen.getByTestId('has-error')).toHaveTextContent('true');

      await user.click(screen.getByText('Start'));
      expect(screen.getByTestId('has-error')).toHaveTextContent('false');
    });
  });

  describe('History Management', () => {
    it('should add generation statistics', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Add Stats'));
      expect(screen.getByTestId('history-length')).toHaveTextContent('1');

      await user.click(screen.getByText('Add Stats'));
      expect(screen.getByTestId('history-length')).toHaveTextContent('2');
    });

    it('should clear history', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Add Stats'));
      await user.click(screen.getByText('Add Stats'));
      expect(screen.getByTestId('history-length')).toHaveTextContent('2');

      await user.click(screen.getByText('Clear History'));
      expect(screen.getByTestId('history-length')).toHaveTextContent('0');
    });

    it('should clear history when starting new optimization', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      await user.click(screen.getByText('Add Stats'));
      await user.click(screen.getByText('Add Stats'));
      expect(screen.getByTestId('history-length')).toHaveTextContent('2');

      await user.click(screen.getByText('Start'));
      expect(screen.getByTestId('history-length')).toHaveTextContent('0');
    });

    it('should respect max history size', async () => {
      const user = userEvent.setup();

      render(
        <ProgressProvider maxHistorySize={3}>
          <TestComponent />
        </ProgressProvider>
      );

      // Add 3 stats (max)
      await user.click(screen.getByText('Add Stats'));
      await user.click(screen.getByText('Add Stats'));
      await user.click(screen.getByText('Add Stats'));
      expect(screen.getByTestId('history-length')).toHaveTextContent('3');

      // Adding one more should clear history first
      await user.click(screen.getByText('Add Stats'));
      expect(screen.getByTestId('history-length')).toHaveTextContent('1');
    });
  });
});

describe('useProgress Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProgressProvider>{children}</ProgressProvider>
  );

  it('should calculate elapsed time', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    // No start time yet
    expect(result.current.getElapsedTime()).toBe(0);

    // Start optimization
    act(() => {
      result.current.startOptimization();
    });

    // Should have some elapsed time
    const elapsed = result.current.getElapsedTime();
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it('should calculate progress percentage', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    // No progress yet
    expect(result.current.getProgressPercentage()).toBe(0);

    // Update progress
    act(() => {
      result.current.updateProgress({
        generation: 25,
        progress: 0.25,
        bestFitness: 0.5,
        workDays: 10,
        balance: 3000,
        violations: 1,
      });
    });

    expect(result.current.getProgressPercentage()).toBe(25);
  });

  it('should estimate time remaining', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    // No estimate without progress
    expect(result.current.getEstimatedTimeRemaining()).toBeNull();

    // Start and update progress
    act(() => {
      result.current.startOptimization();
    });

    // Wait a bit to have some elapsed time
    setTimeout(() => {
      act(() => {
        result.current.updateProgress({
          generation: 50,
          progress: 0.5,
          bestFitness: 0.5,
          workDays: 12,
          balance: 4000,
          violations: 0,
        });
      });

      const estimate = result.current.getEstimatedTimeRemaining();
      expect(estimate).not.toBeNull();
      expect(estimate).toBeGreaterThanOrEqual(0);
    }, 10);
  });

  it('should calculate average fitness', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    // No history
    expect(result.current.getAverageFitness()).toBe(0);

    // Add generation stats
    act(() => {
      result.current.addGenerationStats({
        generation: 1,
        timestamp: 100,
        fitness: 0.5,
        workDays: 10,
        violations: 0,
        balance: 3000,
      });

      result.current.addGenerationStats({
        generation: 2,
        timestamp: 200,
        fitness: 0.6,
        workDays: 12,
        violations: 0,
        balance: 4000,
      });
    });

    expect(result.current.getAverageFitness()).toBeCloseTo(0.65, 10);
  });

  it('should calculate improvement rate', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    // Need at least 2 generations
    expect(result.current.getImprovementRate()).toBe(0);

    // Add generation stats
    act(() => {
      result.current.addGenerationStats({
        generation: 1,
        timestamp: 100,
        fitness: 0.5,
        workDays: 8,
        violations: 1,
        balance: 2500,
      });

      result.current.addGenerationStats({
        generation: 2,
        timestamp: 200,
        fitness: 0.6,
        workDays: 10,
        violations: 0,
        balance: 3500,
      });
    });

    const rate = result.current.getImprovementRate();
    expect(rate).toBeCloseTo(20, 10); // (0.6 - 0.5) / 0.5 * 100 = 20%
  });

  it('should format time correctly', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    expect(result.current.formatTime(500)).toBe('0s');
    expect(result.current.formatTime(5000)).toBe('5s');
    expect(result.current.formatTime(65000)).toBe('1m 5s');
    expect(result.current.formatTime(3665000)).toBe('1h 1m 5s');
  });
});
