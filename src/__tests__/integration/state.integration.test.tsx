import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ScheduleProvider,
  useScheduleContext,
} from '../../context/ScheduleContext';
import {
  ConfigurationProvider,
  useConfiguration,
} from '../../context/ConfigurationContext';
import { UIProvider, useUI } from '../../context/UIContext';
import { ProgressProvider, useProgress } from '../../context/ProgressContext';
import {
  PersistenceProvider,
  usePersistence,
} from '../../context/PersistenceContext';

// Mock localStorage
beforeEach(() => {
  const localStorageMock = {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };
  global.localStorage = localStorageMock as any;

  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('State Management Integration Tests', () => {
  describe('ScheduleContext Integration', () => {
    it('should manage schedule state and provide correct computed values', () => {
      const TestComponent = () => {
        const context = useScheduleContext();
        const mockSchedule = [
          {
            day: 1,
            shifts: ['Morning'],
            earnings: 300,
            expenses: 50,
            deposit: 0,
            startBalance: 1000,
            endBalance: 1250,
          },
          {
            day: 2,
            shifts: [],
            earnings: 0,
            expenses: 50,
            deposit: 0,
            startBalance: 1250,
            endBalance: 1200,
          },
          {
            day: 3,
            shifts: ['Evening'],
            earnings: 350,
            expenses: 50,
            deposit: 100,
            startBalance: 1200,
            endBalance: 1600,
          },
        ];

        return (
          <div>
            <button onClick={() => context.setCurrentSchedule(mockSchedule)}>
              Set Schedule
            </button>
            <div data-testid="schedule-length">
              {context.currentSchedule.length}
            </div>
            <div data-testid="has-edits">
              {context.edits.length > 0 ? 'yes' : 'no'}
            </div>
          </div>
        );
      };

      render(
        <ScheduleProvider>
          <TestComponent />
        </ScheduleProvider>
      );

      expect(screen.getByTestId('schedule-length')).toHaveTextContent('0');
      expect(screen.getByTestId('has-edits')).toHaveTextContent('no');

      // Set schedule
      act(() => {
        screen.getByText('Set Schedule').click();
      });

      expect(screen.getByTestId('schedule-length')).toHaveTextContent('3');
    });

    it('should handle edits correctly', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const context = useScheduleContext();

        React.useEffect(() => {
          // Set initial schedule
          context.setCurrentSchedule([
            {
              day: 1,
              shifts: ['Morning'],
              earnings: 300,
              expenses: 50,
              deposit: 0,
              startBalance: 1000,
              endBalance: 1250,
            },
          ]);
        }, []);

        const addEdit = () => {
          context.addEdit({
            day: 1,
            field: 'earnings',
            originalValue: 300,
            newValue: 500,
          });
        };

        return (
          <div>
            <button onClick={addEdit}>Add Edit</button>
            <button onClick={() => context.applyEdits()}>Apply Edits</button>
            <button onClick={() => context.clearEdits()}>Clear Edits</button>
            <div data-testid="edit-count">{context.edits.length}</div>
            <div data-testid="earnings">
              {context.currentSchedule[0]?.earnings || 0}
            </div>
          </div>
        );
      };

      render(
        <ScheduleProvider>
          <TestComponent />
        </ScheduleProvider>
      );

      // Initially no edits
      expect(screen.getByTestId('edit-count')).toHaveTextContent('0');

      // Add an edit
      await user.click(screen.getByText('Add Edit'));
      expect(screen.getByTestId('edit-count')).toHaveTextContent('1');

      // Apply edits
      await user.click(screen.getByText('Apply Edits'));

      await waitFor(() => {
        expect(screen.getByTestId('earnings')).toHaveTextContent('500');
        expect(screen.getByTestId('edit-count')).toHaveTextContent('0');
      });
    });
  });

  describe('ConfigurationContext Integration', () => {
    it('should manage configuration and presets', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const { config, presets, updateConfig, createPreset, selectPreset } =
          useConfiguration();

        return (
          <div>
            <div data-testid="starting-balance">{config.startingBalance}</div>
            <div data-testid="preset-count">{presets.length}</div>
            <button onClick={() => updateConfig({ startingBalance: 5000 })}>
              Update Balance
            </button>
            <button
              onClick={() => createPreset('Test Preset', 'Test description')}
            >
              Create Preset
            </button>
            <button onClick={() => selectPreset('conservative')}>
              Select Conservative
            </button>
          </div>
        );
      };

      render(
        <ConfigurationProvider>
          <TestComponent />
        </ConfigurationProvider>
      );

      // Check initial state
      expect(screen.getByTestId('starting-balance')).toHaveTextContent('1000');
      expect(screen.getByTestId('preset-count')).toHaveTextContent('4'); // Default presets

      // Update configuration
      await user.click(screen.getByText('Update Balance'));
      expect(screen.getByTestId('starting-balance')).toHaveTextContent('5000');

      // Create preset
      await user.click(screen.getByText('Create Preset'));
      expect(screen.getByTestId('preset-count')).toHaveTextContent('5');

      // Select preset
      await user.click(screen.getByText('Select Conservative'));

      await waitFor(() => {
        expect(screen.getByTestId('starting-balance')).not.toHaveTextContent(
          '5000'
        );
      });
    });

    it('should validate configuration correctly', () => {
      const TestComponent = () => {
        const { validateConfig } = useConfiguration();
        const [validationResult, setValidationResult] =
          React.useState<any>(null);

        const testValidation = () => {
          const result = validateConfig({
            startingBalance: -100,
            targetBalance: 5000,
            minimumBalance: 0,
            populationSize: 5, // Too small
            generations: 50,
            mutationRate: 2, // Too high
            eliteCount: 1,
            enableBalanceOptimization: true,
            adaptiveMutation: false,
            diversityPressure: false,
          });
          setValidationResult(result);
        };

        return (
          <div>
            <button onClick={testValidation}>Test Validation</button>
            {validationResult && (
              <>
                <div data-testid="is-valid">
                  {validationResult.isValid ? 'yes' : 'no'}
                </div>
                <div data-testid="error-count">
                  {validationResult.errors.length}
                </div>
              </>
            )}
          </div>
        );
      };

      render(
        <ConfigurationProvider>
          <TestComponent />
        </ConfigurationProvider>
      );

      act(() => {
        screen.getByText('Test Validation').click();
      });

      expect(screen.getByTestId('is-valid')).toHaveTextContent('no');
      expect(screen.getByTestId('error-count')).toHaveTextContent('3'); // 3 validation errors
    });
  });

  describe('UIContext Integration', () => {
    it('should manage UI state and preferences', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const ui = useUI();

        return (
          <div>
            <div data-testid="theme">{ui.theme}</div>
            <div data-testid="view-mode">{ui.viewMode}</div>
            <div data-testid="show-weekends">
              {ui.showWeekends ? 'yes' : 'no'}
            </div>
            <div data-testid="active-modal">{ui.activeModal || 'none'}</div>

            <button onClick={() => ui.toggleTheme()}>Toggle Theme</button>
            <button onClick={() => ui.setViewMode('calendar')}>
              Calendar View
            </button>
            <button onClick={() => ui.openModal('edit')}>
              Open Edit Modal
            </button>
            <button onClick={() => ui.toggleWeekends()}>Toggle Weekends</button>
          </div>
        );
      };

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      // Check initial state
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('view-mode')).toHaveTextContent('table');
      expect(screen.getByTestId('show-weekends')).toHaveTextContent('yes');
      expect(screen.getByTestId('active-modal')).toHaveTextContent('none');

      // Toggle theme
      await user.click(screen.getByText('Toggle Theme'));
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');

      // Change view mode
      await user.click(screen.getByText('Calendar View'));
      expect(screen.getByTestId('view-mode')).toHaveTextContent('calendar');

      // Open modal
      await user.click(screen.getByText('Open Edit Modal'));
      expect(screen.getByTestId('active-modal')).toHaveTextContent('edit');

      // Toggle weekends
      await user.click(screen.getByText('Toggle Weekends'));
      expect(screen.getByTestId('show-weekends')).toHaveTextContent('no');
    });

    it('should manage filters and sorting', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const ui = useUI();

        return (
          <div>
            <div data-testid="work-days-only">
              {ui.filters.showWorkDaysOnly ? 'yes' : 'no'}
            </div>
            <div data-testid="sort-field">{ui.sort.field}</div>
            <div data-testid="sort-direction">{ui.sort.direction}</div>

            <button onClick={() => ui.setFilter({ showWorkDaysOnly: true })}>
              Filter Work Days
            </button>
            <button onClick={() => ui.setSort('earnings', 'desc')}>
              Sort by Earnings
            </button>
            <button onClick={() => ui.clearFilters()}>Clear Filters</button>
          </div>
        );
      };

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      // Check initial state
      expect(screen.getByTestId('work-days-only')).toHaveTextContent('no');
      expect(screen.getByTestId('sort-field')).toHaveTextContent('day');
      expect(screen.getByTestId('sort-direction')).toHaveTextContent('asc');

      // Apply filter
      await user.click(screen.getByText('Filter Work Days'));
      expect(screen.getByTestId('work-days-only')).toHaveTextContent('yes');

      // Change sort
      await user.click(screen.getByText('Sort by Earnings'));
      expect(screen.getByTestId('sort-field')).toHaveTextContent('earnings');
      expect(screen.getByTestId('sort-direction')).toHaveTextContent('desc');

      // Clear filters
      await user.click(screen.getByText('Clear Filters'));
      expect(screen.getByTestId('work-days-only')).toHaveTextContent('no');
    });
  });

  describe('ProgressContext Integration', () => {
    it('should track optimization progress', async () => {
      const TestComponent = () => {
        const progress = useProgress();

        const simulateProgress = () => {
          progress.startProgress(100);
          setTimeout(() => {
            progress.updateProgress({
              generation: 50,
              progress: 0.5,
              bestFitness: 0.75,
              workDays: 15,
              balance: 8000,
              violations: 0,
            });
          }, 100);
        };

        return (
          <div>
            <div data-testid="is-running">
              {progress.currentProgress ? 'yes' : 'no'}
            </div>
            <div data-testid="progress-percent">
              {progress.getProgressPercentage()}
            </div>
            <div data-testid="time-elapsed">
              {Math.floor(progress.getElapsedTime() / 1000)}
            </div>

            <button onClick={simulateProgress}>Start Progress</button>
            <button onClick={() => progress.completeProgress()}>
              Complete
            </button>
          </div>
        );
      };

      render(
        <ProgressProvider>
          <TestComponent />
        </ProgressProvider>
      );

      // Initially no progress
      expect(screen.getByTestId('is-running')).toHaveTextContent('no');
      expect(screen.getByTestId('progress-percent')).toHaveTextContent('0');

      // Start progress
      act(() => {
        screen.getByText('Start Progress').click();
      });

      // Wait for update
      await waitFor(() => {
        expect(screen.getByTestId('is-running')).toHaveTextContent('yes');
        expect(screen.getByTestId('progress-percent')).toHaveTextContent('50');
      });

      // Complete progress
      act(() => {
        screen.getByText('Complete').click();
      });

      expect(screen.getByTestId('is-running')).toHaveTextContent('no');
    });
  });

  describe('PersistenceContext Integration', () => {
    it('should manage data persistence operations', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const persistence = usePersistence();

        return (
          <div>
            <div data-testid="has-changes">
              {persistence.hasUnsavedChanges ? 'yes' : 'no'}
            </div>
            <div data-testid="is-saving">
              {persistence.isSaving ? 'yes' : 'no'}
            </div>
            <div data-testid="last-save">
              {persistence.lastSaveTime ? 'saved' : 'never'}
            </div>

            <button onClick={() => persistence.markAsChanged()}>
              Mark Changed
            </button>
            <button onClick={() => persistence.save()}>Save</button>
          </div>
        );
      };

      // Mock schedule and config contexts
      const MockProviders: React.FC<{ children: React.ReactNode }> = ({
        children,
      }) => (
        <ScheduleProvider>
          <ConfigurationProvider>
            <PersistenceProvider>{children}</PersistenceProvider>
          </ConfigurationProvider>
        </ScheduleProvider>
      );

      render(
        <MockProviders>
          <TestComponent />
        </MockProviders>
      );

      // Initially no changes
      expect(screen.getByTestId('has-changes')).toHaveTextContent('no');
      expect(screen.getByTestId('is-saving')).toHaveTextContent('no');
      expect(screen.getByTestId('last-save')).toHaveTextContent('never');

      // Mark as changed
      await user.click(screen.getByText('Mark Changed'));
      expect(screen.getByTestId('has-changes')).toHaveTextContent('yes');

      // Save
      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByTestId('is-saving')).toHaveTextContent('no');
        expect(screen.getByTestId('has-changes')).toHaveTextContent('no');
        expect(screen.getByTestId('last-save')).toHaveTextContent('saved');
      });

      // Verify localStorage was called
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Cross-Context Integration', () => {
    it('should coordinate state changes across multiple contexts', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const schedule = useScheduleContext();
        const config = useConfiguration();
        const ui = useUI();
        const persistence = usePersistence();

        const performComplexOperation = () => {
          // Update configuration
          config.updateConfig({ startingBalance: 3000 });

          // Add schedule
          schedule.setCurrentSchedule([
            {
              day: 1,
              shifts: ['Morning'],
              earnings: 400,
              expenses: 100,
              deposit: 0,
              startBalance: 3000,
              endBalance: 3300,
            },
          ]);

          // Update UI
          ui.setViewMode('calendar');
          ui.toggleTheme();
        };

        return (
          <div>
            <div data-testid="starting-balance">
              {config.config.startingBalance}
            </div>
            <div data-testid="schedule-length">
              {schedule.currentSchedule.length}
            </div>
            <div data-testid="view-mode">{ui.viewMode}</div>
            <div data-testid="theme">{ui.theme}</div>
            <div data-testid="has-changes">
              {persistence.hasUnsavedChanges ? 'yes' : 'no'}
            </div>

            <button onClick={performComplexOperation}>
              Perform Complex Operation
            </button>
          </div>
        );
      };

      const MockProviders: React.FC<{ children: React.ReactNode }> = ({
        children,
      }) => (
        <UIProvider>
          <ScheduleProvider>
            <ConfigurationProvider>
              <PersistenceProvider>{children}</PersistenceProvider>
            </ConfigurationProvider>
          </ScheduleProvider>
        </UIProvider>
      );

      render(
        <MockProviders>
          <TestComponent />
        </MockProviders>
      );

      // Check initial state
      expect(screen.getByTestId('starting-balance')).toHaveTextContent('1000');
      expect(screen.getByTestId('schedule-length')).toHaveTextContent('0');
      expect(screen.getByTestId('view-mode')).toHaveTextContent('table');
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('has-changes')).toHaveTextContent('no');

      // Perform complex operation
      await user.click(screen.getByText('Perform Complex Operation'));

      // Verify all state changes
      await waitFor(() => {
        expect(screen.getByTestId('starting-balance')).toHaveTextContent(
          '3000'
        );
        expect(screen.getByTestId('schedule-length')).toHaveTextContent('1');
        expect(screen.getByTestId('view-mode')).toHaveTextContent('calendar');
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(screen.getByTestId('has-changes')).toHaveTextContent('yes');
      });
    });
  });
});
