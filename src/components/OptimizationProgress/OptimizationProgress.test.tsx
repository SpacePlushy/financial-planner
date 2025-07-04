import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OptimizationProgress } from './OptimizationProgress';
import { OptimizationProgress as OptimizationProgressData } from '../../types';

describe('OptimizationProgress', () => {
  const mockOnCancel = jest.fn();

  const mockProgress: OptimizationProgressData = {
    generation: 50,
    progress: 25,
    bestFitness: 1500.75,
    workDays: 15,
    balance: 2500.5,
    violations: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when no progress and not optimizing', () => {
      render(
        <OptimizationProgress
          progress={null}
          isOptimizing={false}
          onCancel={mockOnCancel}
        />
      );
      expect(
        screen.queryByText('Optimization Progress')
      ).not.toBeInTheDocument();
    });

    it('renders with progress data', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Optimization Progress')).toBeInTheDocument();
      expect(screen.getByText('25.0%')).toBeInTheDocument();
      expect(screen.getByText('Generation 50')).toBeInTheDocument();
    });

    it('renders all metrics correctly', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      // Check metric labels
      expect(screen.getByText('Best Fitness')).toBeInTheDocument();
      expect(screen.getByText('Work Days')).toBeInTheDocument();
      expect(screen.getByText('Balance')).toBeInTheDocument();
      expect(screen.getByText('Violations')).toBeInTheDocument();

      // Check metric values
      expect(screen.getByText('1500.75')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('$2500.50')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('shows cancel button when optimizing', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('hides cancel button when not optimizing', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={false}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.queryByRole('button', { name: /cancel/i })
      ).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
          className="custom-class"
        />
      );

      const progressContainer = screen.getByTestId('optimization-progress');
      expect(progressContainer).toHaveClass('custom-class');
    });
  });

  describe('Progress Bar', () => {
    it('renders progress bar with correct width', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '25%' });
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('handles 0% progress', () => {
      render(
        <OptimizationProgress
          progress={{ ...mockProgress, progress: 0 }}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveStyle({ width: '0%' });
    });

    it('handles 100% progress', () => {
      render(
        <OptimizationProgress
          progress={{ ...mockProgress, progress: 100 }}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('100.0%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveStyle({ width: '100%' });
    });

    it('clamps progress values above 100%', () => {
      render(
        <OptimizationProgress
          progress={{ ...mockProgress, progress: 150 }}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('100.0%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveStyle({ width: '100%' });
    });
  });

  describe('Special Values', () => {
    it('handles negative balance', () => {
      render(
        <OptimizationProgress
          progress={{ ...mockProgress, balance: -500.25 }}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      const balanceValue = screen.getByText('$-500.25');
      expect(balanceValue).toHaveClass('negative');
    });

    it('handles violations greater than 0', () => {
      render(
        <OptimizationProgress
          progress={{ ...mockProgress, violations: 3 }}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      const violationsValue = screen.getByText('3');
      expect(violationsValue).toHaveClass('hasViolations');
      expect(
        screen.getByText(/searching for solution with fewer violations/i)
      ).toBeInTheDocument();
    });

    it('handles Infinity fitness value', () => {
      render(
        <OptimizationProgress
          progress={{ ...mockProgress, bestFitness: Infinity }}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('∞')).toBeInTheDocument();
    });

    it('handles -Infinity fitness value', () => {
      render(
        <OptimizationProgress
          progress={{ ...mockProgress, bestFitness: -Infinity }}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('-∞')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state when optimizing without progress', () => {
      render(
        <OptimizationProgress
          progress={null}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText('Initializing optimization...')
      ).toBeInTheDocument();
      // Check for loading state
      const loadingContainer = screen.getByTestId('loading-container');
      expect(loadingContainer).toHaveClass('loadingContainer');
    });
  });

  describe('Status Messages', () => {
    it('shows default status when optimizing with no violations', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Optimizing schedule...')).toBeInTheDocument();
    });

    it('shows warning status when violations exist', () => {
      render(
        <OptimizationProgress
          progress={{ ...mockProgress, violations: 2 }}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText(/searching for solution with fewer violations/i)
      ).toBeInTheDocument();
    });

    it('hides status message when not optimizing', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={false}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.queryByText('Optimizing schedule...')
      ).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onCancel when cancel button is clicked', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Animations', () => {
    it('applies changing class when values update', async () => {
      const { rerender } = render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      // Update with different values
      const updatedProgress: OptimizationProgressData = {
        ...mockProgress,
        progress: 50,
        bestFitness: 1200.5,
        workDays: 18,
        violations: 1,
      };

      rerender(
        <OptimizationProgress
          progress={updatedProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      // Check that the changing class is applied immediately
      expect(screen.getByText('50.0%')).toHaveClass('changing');
      expect(screen.getByText('1200.50')).toHaveClass('changing');
      expect(screen.getByText('18')).toHaveClass('changing');
      expect(screen.getByText('1')).toHaveClass('changing');

      // Wait for animations to complete
      await waitFor(
        () => {
          expect(screen.getByText('50.0%')).not.toHaveClass('changing');
        },
        { timeout: 600 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles missing metric values gracefully', () => {
      render(
        <OptimizationProgress
          progress={null}
          isOptimizing={false}
          onCancel={mockOnCancel}
        />
      );

      render(
        <OptimizationProgress
          progress={null}
          isOptimizing={false}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.queryByText('Optimization Progress')
      ).not.toBeInTheDocument();
    });

    it('handles rapid progress updates', async () => {
      const { rerender } = render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      // Simulate rapid updates
      for (let i = 1; i <= 5; i++) {
        rerender(
          <OptimizationProgress
            progress={{ ...mockProgress, progress: i * 20 }}
            isOptimizing={true}
            onCancel={mockOnCancel}
          />
        );
      }

      await waitFor(() => {
        expect(screen.getByText('100.0%')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible progress bar', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has accessible cancel button', () => {
      render(
        <OptimizationProgress
          progress={mockProgress}
          isOptimizing={true}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', {
        name: /cancel optimization/i,
      });
      expect(cancelButton).toBeInTheDocument();
    });
  });
});
