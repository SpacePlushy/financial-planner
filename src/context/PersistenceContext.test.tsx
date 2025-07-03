import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  PersistenceProvider,
  usePersistenceContext,
} from './PersistenceContext';
import { ScheduleProvider, useScheduleContext } from './ScheduleContext';
import {
  ConfigurationProvider,
  useConfigurationContext,
} from './ConfigurationContext';
import {
  storage,
  compressionUtils,
  storageQuota,
  fileUtils,
} from '../utils/storage';
import { StoredAppData } from './types';

// Mock storage utilities
jest.mock('../utils/storage', () => ({
  storage: {
    save: jest.fn(),
    load: jest.fn(),
    clear: jest.fn(),
    export: jest.fn(),
    import: jest.fn(),
    migrate: jest.fn(),
  },
  compressionUtils: {
    compress: jest.fn(),
    decompress: jest.fn(),
  },
  storageQuota: {
    checkQuota: jest.fn(),
    hasSpace: jest.fn(),
  },
  fileUtils: {
    download: jest.fn(),
    readFile: jest.fn(),
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Test component that uses persistence context
function TestComponent() {
  const persistence = usePersistenceContext();
  const schedule = useScheduleContext();
  const config = useConfigurationContext();

  return (
    <div>
      <div data-testid="auto-save-enabled">
        {persistence.autoSaveEnabled.toString()}
      </div>
      <div data-testid="auto-save-interval">{persistence.autoSaveInterval}</div>
      <div data-testid="has-unsaved-changes">
        {persistence.hasUnsavedChanges.toString()}
      </div>
      <div data-testid="is-restoring">{persistence.isRestoring.toString()}</div>
      <div data-testid="data-version">{persistence.dataVersion}</div>
      <div data-testid="last-save-time">
        {persistence.lastSaveTime?.toISOString() || 'null'}
      </div>

      <button onClick={() => persistence.saveToLocalStorage()}>Save</button>
      <button onClick={() => persistence.loadFromLocalStorage()}>Load</button>
      <button onClick={() => persistence.clearLocalStorage()}>Clear</button>
      <button onClick={() => persistence.exportData()}>Export</button>
      <button onClick={() => persistence.importData('{}')}>Import</button>
      <button onClick={() => persistence.toggleAutoSave()}>
        Toggle Auto-save
      </button>
      <button onClick={() => persistence.setAutoSaveInterval(60)}>
        Set Interval 60
      </button>
      <button onClick={() => persistence.markAsChanged()}>Mark Changed</button>
      <button onClick={() => persistence.markAsSaved()}>Mark Saved</button>

      {/* Triggers for context changes */}
      <button onClick={() => schedule.setCurrentSchedule([])}>
        Change Schedule
      </button>
      <button onClick={() => config.updateConfig({ startingBalance: 2000 })}>
        Change Config
      </button>
    </div>
  );
}

// Wrapper component with all required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScheduleProvider>
      <ConfigurationProvider>
        <PersistenceProvider>{children}</PersistenceProvider>
      </ConfigurationProvider>
    </ScheduleProvider>
  );
}

describe('PersistenceContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    (storage.save as jest.Mock).mockResolvedValue(undefined);
    (storage.load as jest.Mock).mockResolvedValue(null);
    (storage.clear as jest.Mock).mockResolvedValue(undefined);
    (storage.export as jest.Mock).mockResolvedValue('{"exported": true}');
    (storage.import as jest.Mock).mockImplementation(data => JSON.parse(data));
    (storageQuota.hasSpace as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('auto-save-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('auto-save-interval')).toHaveTextContent('30');
      expect(screen.getByTestId('has-unsaved-changes')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('is-restoring')).toHaveTextContent('false');
      expect(screen.getByTestId('data-version')).toHaveTextContent('1.0.0');
      expect(screen.getByTestId('last-save-time')).toHaveTextContent('null');
    });

    it('should load data on mount', async () => {
      const mockData: StoredAppData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        schedule: {
          currentSchedule: [],
          edits: [],
          shiftTypes: {
            large: { gross: 250, net: 175 },
            medium: { gross: 200, net: 140 },
            small: { gross: 150, net: 105 },
          },
          expenses: [],
          deposits: [],
        },
        configuration: {
          config: {
            startingBalance: 1000,
            targetEndingBalance: 2000,
            minimumBalance: 100,
            populationSize: 100,
            generations: 50,
          },
          presets: [],
          selectedPresetId: null,
        },
        ui: {
          viewMode: 'table',
          showWeekends: true,
          highlightViolations: true,
        },
      };

      (storage.load as jest.Mock).mockResolvedValue(mockData);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(storage.load).toHaveBeenCalled();
      });
    });
  });

  describe('Save/Load Operations', () => {
    it('should save data to localStorage', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(storage.save).toHaveBeenCalledWith(
          expect.objectContaining({
            version: '1.0.0',
            timestamp: expect.any(String),
            schedule: expect.any(Object),
            configuration: expect.any(Object),
            ui: expect.any(Object),
          })
        );
      });

      expect(screen.getByTestId('has-unsaved-changes')).toHaveTextContent(
        'false'
      );
    });

    it('should load data from localStorage', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const mockData: StoredAppData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        schedule: {
          currentSchedule: [
            {
              day: 1,
              shifts: ['large'],
              earnings: 175,
              expenses: 50,
              deposit: 0,
              startBalance: 1000,
              endBalance: 1125,
            },
          ],
          edits: [],
          shiftTypes: {
            large: { gross: 250, net: 175 },
            medium: { gross: 200, net: 140 },
            small: { gross: 150, net: 105 },
          },
          expenses: [],
          deposits: [],
        },
        configuration: {
          config: {
            startingBalance: 1500,
            targetEndingBalance: 3000,
            minimumBalance: 200,
            populationSize: 150,
            generations: 75,
          },
          presets: [],
          selectedPresetId: null,
        },
        ui: {
          viewMode: 'calendar',
          showWeekends: false,
          highlightViolations: false,
        },
      };

      (storage.load as jest.Mock).mockResolvedValue(mockData);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByText('Load'));

      await waitFor(() => {
        expect(screen.getByTestId('is-restoring')).toHaveTextContent('false');
      });

      expect(storage.load).toHaveBeenCalled();
    });

    it('should handle load errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      (storage.load as jest.Mock).mockRejectedValue(new Error('Load failed'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByText('Load'));

      await waitFor(() => {
        expect(screen.getByTestId('is-restoring')).toHaveTextContent('false');
      });
    });

    it('should clear localStorage', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      window.confirm = jest.fn(() => true);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByText('Clear'));

      await waitFor(() => {
        expect(storage.clear).toHaveBeenCalled();
      });

      expect(screen.getByTestId('has-unsaved-changes')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('last-save-time')).toHaveTextContent('null');
    });
  });

  describe('Export/Import Operations', () => {
    it('should export data', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(storage.export).toHaveBeenCalled();
        expect(fileUtils.download).toHaveBeenCalledWith(
          '{"exported": true}',
          expect.stringMatching(/^financial-schedule-.*\.json$/)
        );
      });
    });

    it('should import data', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const importData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        schedule: {
          currentSchedule: [],
          edits: [],
          shiftTypes: {
            large: { gross: 250, net: 175 },
            medium: { gross: 200, net: 140 },
            small: { gross: 150, net: 105 },
          },
          expenses: [],
          deposits: [],
        },
        configuration: {
          config: {
            startingBalance: 2000,
            targetEndingBalance: 4000,
            minimumBalance: 300,
            populationSize: 200,
            generations: 100,
          },
          presets: [],
          selectedPresetId: null,
        },
        ui: {
          viewMode: 'table',
          showWeekends: true,
          highlightViolations: true,
        },
      };

      (storage.import as jest.Mock).mockResolvedValue(importData);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByTestId('is-restoring')).toHaveTextContent('false');
      });

      expect(storage.import).toHaveBeenCalledWith('{}');
      expect(storage.save).toHaveBeenCalled(); // Should save after import
    });
  });

  describe('Auto-save Functionality', () => {
    it('should toggle auto-save', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('auto-save-enabled')).toHaveTextContent('true');

      await user.click(screen.getByText('Toggle Auto-save'));

      expect(screen.getByTestId('auto-save-enabled')).toHaveTextContent(
        'false'
      );

      await user.click(screen.getByText('Toggle Auto-save'));

      expect(screen.getByTestId('auto-save-enabled')).toHaveTextContent('true');
    });

    it('should set auto-save interval', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByText('Set Interval 60'));

      expect(screen.getByTestId('auto-save-interval')).toHaveTextContent('60');
    });

    it('should auto-save when enabled and has unsaved changes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Mark as changed
      await user.click(screen.getByText('Mark Changed'));

      expect(screen.getByTestId('has-unsaved-changes')).toHaveTextContent(
        'true'
      );

      // Advance time to trigger auto-save
      act(() => {
        jest.advanceTimersByTime(30 * 1000); // 30 seconds
      });

      await waitFor(() => {
        expect(storage.save).toHaveBeenCalled();
      });
    });

    it('should not auto-save when disabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Disable auto-save
      await user.click(screen.getByText('Toggle Auto-save'));

      // Mark as changed
      await user.click(screen.getByText('Mark Changed'));

      // Clear previous calls
      jest.clearAllMocks();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(30 * 1000); // 30 seconds
      });

      expect(storage.save).not.toHaveBeenCalled();
    });
  });

  describe('Change Tracking', () => {
    it('should mark as changed when data changes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('has-unsaved-changes')).toHaveTextContent(
        'false'
      );

      // Change schedule
      await user.click(screen.getByText('Change Schedule'));

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(screen.getByTestId('has-unsaved-changes')).toHaveTextContent(
          'true'
        );
      });
    });

    it('should mark as saved', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Mark as changed first
      await user.click(screen.getByText('Mark Changed'));
      expect(screen.getByTestId('has-unsaved-changes')).toHaveTextContent(
        'true'
      );

      // Mark as saved
      await user.click(screen.getByText('Mark Saved'));

      expect(screen.getByTestId('has-unsaved-changes')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('last-save-time')).not.toHaveTextContent(
        'null'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      (storage.save as jest.Mock).mockRejectedValue(new Error('Save failed'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(storage.save).toHaveBeenCalled();
      });

      // The error should be handled internally, not thrown
      // Check that the component is still functioning
      expect(screen.getByTestId('has-unsaved-changes')).toBeInTheDocument();
    });

    it('should handle storage quota errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      (storage.save as jest.Mock).mockRejectedValue(
        new Error('Insufficient storage space')
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(storage.save).toHaveBeenCalled();
      });

      // The error should be handled internally, not thrown
      // Check that the component is still functioning
      expect(screen.getByTestId('has-unsaved-changes')).toBeInTheDocument();
    });
  });

  describe('Context Hook Error', () => {
    it('should throw error when used outside provider', () => {
      const TestErrorComponent = () => {
        try {
          usePersistenceContext();
          return <div>Should not render</div>;
        } catch (error) {
          return <div>{(error as Error).message}</div>;
        }
      };

      render(<TestErrorComponent />);

      expect(
        screen.getByText(
          'usePersistenceContext must be used within a PersistenceProvider'
        )
      ).toBeInTheDocument();
    });
  });
});
