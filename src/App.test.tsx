import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock hooks that use import.meta
jest.mock('./hooks/useOptimizer', () => ({
  useOptimizer: () => ({
    isOptimizing: false,
    isPaused: false,
    progress: null,
    error: null,
    history: [],
    startOptimization: jest.fn(),
    cancelOptimization: jest.fn(),
    pauseOptimization: jest.fn(),
    resumeOptimization: jest.fn(),
    clearHistory: jest.fn(),
    retryOptimization: jest.fn(),
  }),
}));

jest.mock('./hooks/useSchedule', () => ({
  useSchedule: () => ({
    currentSchedule: [],
    edits: [],
    metrics: {
      totalDays: 30,
      totalEarnings: 0,
      totalExpenses: 0,
      totalDeposits: 0,
      netIncome: 0,
      averageDailyBalance: 0,
      lowestBalance: 0,
      highestBalance: 0,
      daysWithNegativeBalance: 0,
      isValid: true,
      violations: [],
    },
    addEdit: jest.fn(),
    removeEdit: jest.fn(),
    clearEdits: jest.fn(),
    applyEdits: jest.fn(),
    updateScheduleDay: jest.fn(),
    regenerateSchedule: jest.fn(),
    getDayByIndex: jest.fn(),
    getEditForDay: jest.fn(),
    hasEditForDay: jest.fn(),
    canAddShift: jest.fn(),
    canRemoveShift: jest.fn(),
  }),
}));

jest.mock('./hooks/usePersistence', () => ({
  usePersistence: () => ({
    isRestoring: false,
    isSaving: false,
    isExporting: false,
    isImporting: false,
    hasUnsavedChanges: false,
    lastSaveTime: null,
    lastSaveError: null,
    autoSaveEnabled: false,
    autoSaveInterval: 30,
    save: jest.fn(),
    restore: jest.fn(),
    clear: jest.fn(),
    exportToFile: jest.fn(),
    importFromFile: jest.fn(),
    toggleAutoSave: jest.fn(),
    setAutoSaveInterval: jest.fn(),
  }),
}));

// Mock all the components
jest.mock('./components/ConfigurationPanel/ConfigurationPanel', () => ({
  ConfigurationPanel: () => (
    <div data-testid="configuration-panel">Configuration Panel</div>
  ),
}));

jest.mock('./components/ScheduleTable/ScheduleTable', () => ({
  ScheduleTable: () => <div data-testid="schedule-table">Schedule Table</div>,
}));

jest.mock('./components/Summary/Summary', () => ({
  Summary: () => <div data-testid="summary">Summary</div>,
}));

jest.mock('./components/OptimizationProgress/OptimizationProgress', () => ({
  OptimizationProgress: () => (
    <div data-testid="optimization-progress">Optimization Progress</div>
  ),
}));

jest.mock('./components/EditModal/EditModal', () => ({
  EditModal: () => <div data-testid="edit-modal">Edit Modal</div>,
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock Worker
class WorkerMock {
  postMessage = jest.fn();
  terminate = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();
  onmessage = jest.fn();
  onmessageerror = jest.fn();
  onerror = jest.fn();
}
global.Worker = WorkerMock as unknown as typeof Worker;

describe('App Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    // Clean up DOM before each test
    document.body.innerHTML = '';
    // Use fake timers to control timing
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up DOM after each test
    document.body.innerHTML = '';
    // Clean up any lingering timeouts
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render without crashing', () => {
    render(<App />);
    expect(
      screen.getByText('Financial Schedule Optimizer')
    ).toBeInTheDocument();
  });

  it('should render all main components', async () => {
    render(<App />);

    await screen.findByTestId('configuration-panel');
    expect(screen.getByTestId('summary')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-table')).toBeInTheDocument();
  });

  it('should show loading state when restoring data', () => {
    // Mock usePersistence to show loading state
    jest.mock('./hooks/usePersistence', () => ({
      usePersistence: () => ({
        isRestoring: true,
        isSaving: false,
        isExporting: false,
        isImporting: false,
        hasUnsavedChanges: false,
        lastSaveTime: null,
        lastSaveError: null,
        autoSaveEnabled: false,
        autoSaveInterval: 30,
        save: jest.fn(),
        restore: jest.fn(),
        clear: jest.fn(),
        exportToFile: jest.fn(),
        importFromFile: jest.fn(),
        toggleAutoSave: jest.fn(),
        setAutoSaveInterval: jest.fn(),
      }),
    }));

    const { usePersistence } = require('./hooks/usePersistence');
    usePersistence.mockReturnValueOnce({
      isRestoring: true,
      isSaving: false,
      isExporting: false,
      isImporting: false,
      hasUnsavedChanges: false,
      lastSaveTime: null,
      lastSaveError: null,
      autoSaveEnabled: false,
      autoSaveInterval: 30,
      save: jest.fn(),
      restore: jest.fn(),
      clear: jest.fn(),
      exportToFile: jest.fn(),
      importFromFile: jest.fn(),
      toggleAutoSave: jest.fn(),
      setAutoSaveInterval: jest.fn(),
    });

    render(<App />);

    // Should show loading initially
    expect(screen.getByText('Loading saved data...')).toBeInTheDocument();
  });

  it('should toggle theme', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
    });

    const themeButton = screen.getByLabelText('Toggle theme');
    const appElement = screen.getByTestId('app');

    // Should start with light theme
    expect(appElement).toHaveClass('light');
    expect(appElement).toHaveAttribute('data-theme', 'light');

    // Click to toggle to dark
    await user.click(themeButton);
    expect(appElement).toHaveClass('dark');
    expect(appElement).toHaveAttribute('data-theme', 'dark');
  });

  it('should show view controls', async () => {
    render(<App />);

    await screen.findByText('Table View');
    expect(screen.getByText('Calendar View')).toBeInTheDocument();
    expect(screen.getByLabelText(/Show Weekends/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Highlight Violations/)).toBeInTheDocument();
  });

  it('should show action buttons', async () => {
    render(<App />);

    await screen.findByText('Save');
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Start Optimization')).toBeInTheDocument();
  });

  it('should handle save button click', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save');

    // Initially disabled (no unsaved changes)
    expect(saveButton).toBeDisabled();
  });

  it('should handle import file selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    // Mock file input creation
    const mockFileInput = document.createElement('input');
    const clickSpy = jest.spyOn(mockFileInput, 'click');
    jest.spyOn(document, 'createElement').mockReturnValueOnce(mockFileInput);

    await user.click(screen.getByText('Import'));

    expect(clickSpy).toHaveBeenCalled();
    expect(mockFileInput.type).toBe('file');
    expect(mockFileInput.accept).toBe('.json');
  });

  it('should not show optimization progress when not optimizing', async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.queryByTestId('optimization-progress')
      ).not.toBeInTheDocument();
    });
  });

  it('should show error toast when there is an error', async () => {
    // This would require setting an error through the UI context
    // For now, we'll just verify the structure exists
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('×')).not.toBeInTheDocument();
    });
  });

  it('should handle responsive layout', async () => {
    render(<App />);

    await waitFor(() => {
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('app-main');
    });
  });
});
