import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock Worker
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
  global.localStorage = localStorageMock as unknown as Storage;

  // Mock Worker
  global.Worker = jest.fn().mockImplementation(() => ({
    postMessage: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    onmessage: null,
    onmessageerror: null,
    onerror: null,
  })) as unknown as typeof Worker;

  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('App Integration Tests', () => {
  describe('Initial Rendering', () => {
    it('should render the complete application with all main sections', async () => {
      render(<App />);

      // Wait for the app to fully load
      await waitFor(() => {
        expect(
          screen.getByText('Financial Schedule Optimizer')
        ).toBeInTheDocument();
      });

      // Check main sections are rendered
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Optimization Summary')).toBeInTheDocument();
      expect(screen.getByText('Schedule')).toBeInTheDocument();

      // Check action buttons
      expect(screen.getByText('Start Optimization')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    it('should show empty schedule state initially', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/No schedule data/)).toBeInTheDocument();
      });
    });

    it('should initialize with default configuration values', async () => {
      render(<App />);

      await waitFor(() => {
        const startingBalance = screen.getByLabelText(/Starting Balance/);
        expect(startingBalance).toHaveValue(1000);
      });
    });
  });

  describe('Theme Management', () => {
    it('should handle theme switching correctly', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
      });

      const themeButton = screen.getByLabelText('Toggle theme');

      // Check initial theme
      const appDiv = screen.getByTestId('app');
      expect(appDiv).toHaveClass('light');
      expect(appDiv).toHaveAttribute('data-theme', 'light');

      // Switch to dark theme
      await user.click(themeButton);

      await waitFor(() =>
        expect(screen.getByTestId('app')).toHaveClass('dark')
      );
      expect(screen.getByTestId('app')).toHaveAttribute('data-theme', 'dark');

      // Switch back to light theme
      await user.click(themeButton);

      await waitFor(() =>
        expect(screen.getByTestId('app')).toHaveClass('light')
      );
    });
  });

  describe('Configuration Panel', () => {
    it('should allow updating configuration values', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Starting Balance/)).toBeInTheDocument();
      });

      const startingBalanceInput = screen.getByLabelText(/Starting Balance/);
      const populationSizeInput = screen.getByLabelText(/Population Size/);

      // Update starting balance
      await user.clear(startingBalanceInput);
      await user.type(startingBalanceInput, '5000');
      expect(startingBalanceInput).toHaveValue(5000);

      // Update population size
      await user.clear(populationSizeInput);
      await user.type(populationSizeInput, '200');
      expect(populationSizeInput).toHaveValue(200);
    });

    it('should handle preset selection', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Configuration Preset/)
        ).toBeInTheDocument();
      });

      const presetSelect = screen.getByLabelText(/Configuration Preset/);

      // Should start with custom configuration
      expect(presetSelect).toHaveValue('');

      // Select a preset
      await user.selectOptions(presetSelect, 'conservative');

      // Configuration values should update
      await waitFor(() => {
        const startingBalance = screen.getByLabelText(/Starting Balance/);
        expect(startingBalance).not.toHaveValue(1000); // Should have changed from default
      });
    });

    it('should toggle algorithm features', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Enable Balance Optimization/)
        ).toBeInTheDocument();
      });

      const balanceOptCheckbox = screen.getByLabelText(
        /Enable Balance Optimization/
      );
      const adaptiveMutationCheckbox = screen.getByLabelText(
        /Adaptive Mutation Rate/
      );

      // Toggle checkboxes
      await user.click(balanceOptCheckbox);
      expect(balanceOptCheckbox).not.toBeChecked();

      await user.click(adaptiveMutationCheckbox);
      expect(adaptiveMutationCheckbox).not.toBeChecked();
    });
  });

  describe('Schedule Table', () => {
    it('should handle view mode switching', async () => {
      const user = userEvent.setup();
      render(<App />);

      await screen.findByText('Table View');
      expect(screen.getByText('Calendar View')).toBeInTheDocument();

      const tableViewButton = screen.getByText('Table View');
      const calendarViewButton = screen.getByText('Calendar View');

      // Table view should be active by default
      expect(tableViewButton).toHaveClass('active');
      expect(calendarViewButton).not.toHaveClass('active');

      // Switch to calendar view
      await user.click(calendarViewButton);

      expect(tableViewButton).not.toHaveClass('active');
      expect(calendarViewButton).toHaveClass('active');
    });

    it('should toggle weekend visibility', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Show Weekends/)).toBeInTheDocument();
      });

      const showWeekendsCheckbox = screen.getByLabelText(/Show Weekends/);

      // Should be checked by default
      expect(showWeekendsCheckbox).toBeChecked();

      // Toggle off
      await user.click(showWeekendsCheckbox);
      expect(showWeekendsCheckbox).not.toBeChecked();
    });
  });

  describe('Optimization Workflow', () => {
    it('should start optimization when button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Start Optimization')).toBeInTheDocument();
      });

      const optimizeButton = screen.getByText('Start Optimization');

      // Click to start optimization
      await user.click(optimizeButton);

      // Should show optimization progress
      await waitFor(() => {
        expect(screen.getByText('Optimization Progress')).toBeInTheDocument();
      });

      // Should show pause and cancel buttons
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should handle optimization pause and resume', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Start Optimization')).toBeInTheDocument();
      });

      // Start optimization
      await user.click(screen.getByText('Start Optimization'));

      await waitFor(() => {
        expect(screen.getByText('Pause')).toBeInTheDocument();
      });

      // Pause optimization
      await user.click(screen.getByText('Pause'));

      await waitFor(() => {
        expect(screen.getByText('Resume')).toBeInTheDocument();
      });

      // Resume optimization
      await user.click(screen.getByText('Resume'));

      await waitFor(() => {
        expect(screen.getByText('Pause')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Modal', () => {
    it('should open edit modal on cell double-click', async () => {
      const user = userEvent.setup();

      // First, we need to generate a schedule
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Start Optimization')).toBeInTheDocument();
      });

      // Start optimization to generate schedule
      await user.click(screen.getByText('Start Optimization'));

      // Wait a moment for schedule to be generated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cancel optimization
      if (screen.queryByText('Cancel')) {
        await user.click(screen.getByText('Cancel'));
      }

      // Now we should have a schedule
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });

      // Find an editable cell (earnings column)
      const editableCells = screen.getAllByTitle(/Double-click to edit/);
      expect(editableCells.length).toBeGreaterThan(0);

      await user.dblClick(editableCells[0]);

      // Modal should open
      await screen.findByRole('dialog');
      expect(screen.getByText(/Edit/)).toBeInTheDocument();
    });
  });

  describe('Data Persistence', () => {
    it('should enable save button when changes are made', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');

      // Save button should be disabled initially
      expect(saveButton).toBeDisabled();

      // Make a change to configuration
      const startingBalanceInput = screen.getByLabelText(/Starting Balance/);
      await user.clear(startingBalanceInput);
      await user.type(startingBalanceInput, '2000');

      // Save button should now be enabled
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should handle export functionality', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export');

      // Export button should be enabled
      expect(exportButton).not.toBeDisabled();

      // Mock file download
      const createElementSpy = jest.spyOn(document, 'createElement');

      await user.click(exportButton);

      // Should create a download link
      await waitFor(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
      });
    });

    it('should handle import functionality', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Import')).toBeInTheDocument();
      });

      const importButton = screen.getByText('Import');

      // Import button should be enabled
      expect(importButton).not.toBeDisabled();

      // Mock file input creation
      const createElementSpy = jest.spyOn(document, 'createElement');

      await user.click(importButton);

      // Should create a file input
      expect(createElementSpy).toHaveBeenCalledWith('input');
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors for invalid configuration', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Starting Balance/)).toBeInTheDocument();
      });

      const startingBalanceInput = screen.getByLabelText(/Starting Balance/);

      // Enter invalid value
      await user.clear(startingBalanceInput);
      await user.type(startingBalanceInput, '-100');
      await user.tab(); // Trigger validation

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/cannot be negative/i)).toBeInTheDocument();
      });
    });

    it('should handle optimization errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock Worker to simulate error
      global.Worker = jest.fn().mockImplementation(() => ({
        postMessage: jest.fn(),
        terminate: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        onmessage: null,
        onmessageerror: null,
        onerror: (error: (event: MessageEvent) => void) => {
          // Simulate error callback
          setTimeout(
            () => error({ data: { type: 'error', error: 'Test error' } }),
            10
          );
        },
      })) as unknown as typeof Worker;

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Start Optimization')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Optimization'));

      // Should handle error gracefully
      await waitFor(
        () => {
          // Error handling should reset optimization state
          expect(screen.getByText('Start Optimization')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Loading States', () => {
    it('should show loading state while restoring data', async () => {
      // Mock localStorage to return data
      const mockData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        schedule: {
          currentSchedule: [],
          edits: [],
          shiftTypes: {},
          expenses: [],
          deposits: [],
        },
        configuration: {
          config: {
            startingBalance: 1000,
            targetEndingBalance: 5000,
            minimumBalance: 100,
            totalDays: 30,
            populationSize: 50,
            generations: 100,
          },
        },
      };

      global.localStorage.getItem = jest.fn(() => JSON.stringify(mockData));

      render(<App />);

      // Should show loading state initially
      expect(screen.getByText(/Loading saved data/)).toBeInTheDocument();

      // Should eventually show the app
      await waitFor(() => {
        expect(
          screen.getByText('Financial Schedule Optimizer')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain layout structure across different sections', async () => {
      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText('Financial Schedule Optimizer')
        ).toBeInTheDocument();
      });

      // Check header structure
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('app-header');

      // Check main content structure
      const main = screen.getByRole('main');
      expect(main).toHaveClass('app-main');

      // Check sections exist
      const sections = within(main).getAllByRole('region');
      expect(sections.length).toBeGreaterThanOrEqual(3); // config, summary, schedule
    });
  });

  describe('Debug Mode', () => {
    it('should not show debug indicator by default', async () => {
      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText('Financial Schedule Optimizer')
        ).toBeInTheDocument();
      });

      // Debug indicator should not be present
      expect(screen.queryByText('Debug Mode')).not.toBeInTheDocument();
    });
  });
});
