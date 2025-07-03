import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock external dependencies
beforeEach(() => {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };
  global.localStorage = localStorageMock as any;

  // Mock console to reduce noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('App Integration Tests', () => {
  it('should render the complete application', async () => {
    render(<App />);

    // Wait for the app to fully load
    await waitFor(() => {
      expect(
        screen.getByText('Financial Schedule Optimizer')
      ).toBeInTheDocument();
    });

    // Check main sections are rendered
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('should handle theme switching', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
    });

    const themeButton = screen.getByLabelText('Toggle theme');

    // Check initial theme
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Switch theme
    await user.click(themeButton);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should show schedule table with proper controls', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Table View')).toBeInTheDocument();
      expect(screen.getByText('Calendar View')).toBeInTheDocument();
      expect(screen.getByLabelText(/Show Weekends/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Highlight Violations/)).toBeInTheDocument();
    });
  });

  it('should handle configuration changes', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for configuration panel
    await waitFor(() => {
      expect(screen.getByLabelText('Total Days')).toBeInTheDocument();
    });

    const totalDaysInput = screen.getByLabelText('Total Days');

    // Change total days
    await user.clear(totalDaysInput);
    await user.type(totalDaysInput, '20');

    // Value should update
    expect(totalDaysInput).toHaveValue(20);
  });

  it('should handle optimization workflow', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Start Optimization')).toBeInTheDocument();
    });

    const optimizeButton = screen.getByText('Start Optimization');

    // Should be enabled (schedule is valid by default)
    expect(optimizeButton).not.toBeDisabled();

    // Click to start optimization
    await user.click(optimizeButton);

    // Should show pause and cancel buttons
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('should handle data persistence actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    // Save button should be disabled initially (no changes)
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();

    // Export should be enabled
    const exportButton = screen.getByText('Export');
    expect(exportButton).not.toBeDisabled();
  });

  it('should handle edit modal opening', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for schedule table
    await waitFor(() => {
      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    // Double-click on a cell to open edit modal
    const editableCell = screen.getAllByRole('cell')[0];
    await user.dblClick(editableCell);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Edit Day')).toBeInTheDocument();
    });
  });

  it('should display schedule metrics in summary', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Total Earnings/)).toBeInTheDocument();
      expect(screen.getByText(/Total Expenses/)).toBeInTheDocument();
      expect(screen.getByText(/Net Income/)).toBeInTheDocument();
    });
  });

  it('should handle responsive layout', async () => {
    render(<App />);

    await waitFor(() => {
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('app-main');
    });

    // Check that sections are properly structured
    const sections = screen.getAllByRole('region');
    expect(sections.length).toBeGreaterThan(0);
  });

  it('should show error handling UI', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Simulate an error by trying to set invalid configuration
    await waitFor(() => {
      expect(screen.getByLabelText('Total Days')).toBeInTheDocument();
    });

    const totalDaysInput = screen.getByLabelText('Total Days');

    // Try to set invalid value
    await user.clear(totalDaysInput);
    await user.type(totalDaysInput, '-5');
    await user.tab(); // Trigger blur

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/must be between/)).toBeInTheDocument();
    });
  });
});
