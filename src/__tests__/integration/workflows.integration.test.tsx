import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Type for our mock worker
interface MockWorker {
  postMessage: jest.Mock;
  terminate: jest.Mock;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  dispatchEvent: jest.Mock;
  onmessage: ((event: MessageEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

// Mock setup
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
  const mockWorker = {
    postMessage: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    onmessage: null,
    onmessageerror: null,
    onerror: null,
  };

  global.Worker = jest
    .fn()
    .mockImplementation(() => mockWorker) as unknown as typeof Worker;

  // Return the mock for test access
  (global as unknown as { mockWorker: typeof mockWorker }).mockWorker =
    mockWorker;

  // Mock console methods
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete (global as unknown as { mockWorker: typeof mockWorker }).mockWorker;
});

describe('User Workflow Integration Tests', () => {
  describe('Complete Optimization Workflow', () => {
    it('should complete a full optimization cycle with schedule generation', async () => {
      const user = userEvent.setup();
      const mockWorker = (global as unknown as { mockWorker: MockWorker })
        .mockWorker;

      render(<App />);

      // Wait for app to load
      await waitFor(() => {
        expect(
          screen.getByText('Financial Schedule Optimizer')
        ).toBeInTheDocument();
      });

      // Step 1: Configure optimization parameters
      const startingBalanceInput = screen.getByLabelText(/Starting Balance/);
      const targetBalanceInput = screen.getByLabelText(/Target Balance/);
      const populationSizeInput = screen.getByLabelText(/Population Size/);

      await user.clear(startingBalanceInput);
      await user.type(startingBalanceInput, '2000');

      await user.clear(targetBalanceInput);
      await user.type(targetBalanceInput, '10000');

      await user.clear(populationSizeInput);
      await user.type(populationSizeInput, '100');

      // Step 2: Start optimization
      const optimizeButton = screen.getByText('Start Optimization');
      await user.click(optimizeButton);

      // Verify optimization started
      await waitFor(() => {
        expect(screen.getByText('Optimization Progress')).toBeInTheDocument();
      });
      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'start',
          config: expect.objectContaining({
            startingBalance: 2000,
            targetBalance: 10000,
            populationSize: 100,
          }),
        })
      );

      // Step 3: Simulate optimization progress
      mockWorker.onmessage({
        data: {
          type: 'progress',
          data: {
            generation: 50,
            progress: 0.5,
            bestFitness: 0.75,
            workDays: 15,
            balance: 8000,
            violations: 0,
          },
        },
      });

      // Verify progress is displayed
      await waitFor(() => {
        expect(screen.getByText(/Generation 50/)).toBeInTheDocument();
      });

      // Step 4: Complete optimization
      const mockSchedule = Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        shifts: i % 3 === 0 ? ['Morning'] : [],
        earnings: i % 3 === 0 ? 300 : 0,
        expenses: 50,
        deposit: 0,
        startBalance: 2000 + i * 100,
        endBalance: 2000 + (i + 1) * 100,
      }));

      mockWorker.onmessage({
        data: {
          type: 'complete',
          result: {
            schedule: mockSchedule,
            workDays: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28],
            fitness: 0.95,
            totalEarnings: 3000,
            totalExpenses: 1500,
            finalBalance: 9500,
            violations: 0,
            computationTime: '2.5s',
          },
        },
      });

      // Verify optimization completed
      await waitFor(() => {
        expect(
          screen.queryByText('Optimization Progress')
        ).not.toBeInTheDocument();
      });
      expect(screen.getByText('Start Optimization')).toBeInTheDocument();

      // Step 5: Verify schedule is displayed
      const scheduleTable = screen.getByRole('table');
      expect(scheduleTable).toBeInTheDocument();

      // Verify summary shows correct metrics
      expect(screen.getByText(/Total Earnings/)).toBeInTheDocument();
      expect(screen.getByText(/Work Days/)).toBeInTheDocument();
      expect(screen.getByText(/10/)).toBeInTheDocument(); // 10 work days
    });
  });

  describe('Edit and Save Workflow', () => {
    it('should allow editing schedule values and saving changes', async () => {
      const user = userEvent.setup();
      const mockWorker = (global as unknown as { mockWorker: MockWorker })
        .mockWorker;

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText('Financial Schedule Optimizer')
        ).toBeInTheDocument();
      });

      // First generate a schedule
      await user.click(screen.getByText('Start Optimization'));

      // Simulate quick optimization
      const mockSchedule = Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        shifts: i === 0 ? ['Morning'] : [],
        earnings: i === 0 ? 300 : 0,
        expenses: 50,
        deposit: 0,
        startBalance: 1000,
        endBalance: i === 0 ? 1250 : 950,
      }));

      mockWorker.onmessage({
        data: {
          type: 'complete',
          result: {
            schedule: mockSchedule,
            workDays: [1],
            fitness: 0.5,
            totalEarnings: 300,
            totalExpenses: 1500,
            finalBalance: 800,
            violations: 0,
          },
        },
      });

      // Wait for schedule to be displayed
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });

      // Find an editable cell (earnings for day 1)
      const editableCells = screen.getAllByTitle(/Double-click to edit/);
      const earningsCell = editableCells.find(cell =>
        cell.textContent?.includes('$300')
      );

      // Ensure we have the expected cell
      expect(earningsCell).toBeTruthy();

      // Double-click to edit
      await user.dblClick(earningsCell!);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Edit the value
      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '500');

      // Save the edit
      const saveButton = within(screen.getByRole('dialog')).getByText('Save');
      await user.click(saveButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Save button should be enabled now
      const mainSaveButton = screen.getByText('Save');
      expect(mainSaveButton).not.toBeDisabled();

      // Save changes
      await user.click(mainSaveButton);

      // Verify localStorage was called
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalled();
      });
    });
  });

  describe('Preset Management Workflow', () => {
    it('should create and use custom presets', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });

      // Step 1: Configure custom values
      const startingBalanceInput = screen.getByLabelText(/Starting Balance/);
      const mutationRateInput = screen.getByLabelText(/Mutation Rate/);

      await user.clear(startingBalanceInput);
      await user.type(startingBalanceInput, '3000');

      await user.clear(mutationRateInput);
      await user.type(mutationRateInput, '0.05');

      // Step 2: Save as preset
      const saveAsPresetButton = screen.getByText(/Save as preset/);
      await user.click(saveAsPresetButton);

      // Enter preset details
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Preset name/)).toBeInTheDocument();
      });

      const presetNameInput = screen.getByPlaceholderText(/Preset name/);
      const presetDescInput = screen.getByPlaceholderText(/Description/);

      await user.type(presetNameInput, 'My Custom Strategy');
      await user.type(
        presetDescInput,
        'High starting balance with low mutation'
      );

      // Save the preset
      const savePresetButton = screen.getByRole('button', {
        name: /Save Preset/,
      });
      await user.click(savePresetButton);

      // Verify preset was created
      await waitFor(() => {
        const presetSelect = screen.getByLabelText(/Configuration Preset/);
        const options = within(presetSelect).getAllByRole('option');
        const customOption = options.find(
          opt => opt.textContent === 'My Custom Strategy'
        );
        expect(customOption).toBeInTheDocument();
      });

      // Step 3: Switch to a different preset and back
      const presetSelect = screen.getByLabelText(/Configuration Preset/);

      // Select conservative preset
      await user.selectOptions(presetSelect, 'conservative');

      // Values should change
      await waitFor(() => {
        expect(startingBalanceInput).not.toHaveValue(3000);
      });

      // Select our custom preset
      await user.selectOptions(presetSelect, 'My Custom Strategy');

      // Values should restore
      await waitFor(() => {
        expect(startingBalanceInput).toHaveValue(3000);
      });
      expect(mutationRateInput).toHaveValue(0.05);
    });
  });

  describe('Import/Export Workflow', () => {
    it('should export and import configuration and schedule data', async () => {
      const user = userEvent.setup();
      const mockWorker = (global as unknown as { mockWorker: MockWorker })
        .mockWorker;

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText('Financial Schedule Optimizer')
        ).toBeInTheDocument();
      });

      // Generate a schedule first
      await user.click(screen.getByText('Start Optimization'));

      const mockSchedule = Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        shifts: [],
        earnings: 0,
        expenses: 50,
        deposit: 0,
        startBalance: 1000 - i * 50,
        endBalance: 950 - i * 50,
      }));

      mockWorker.onmessage({
        data: {
          type: 'complete',
          result: {
            schedule: mockSchedule,
            workDays: [],
            fitness: 0.3,
            totalEarnings: 0,
            totalExpenses: 1500,
            finalBalance: -500,
            violations: 10,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Step 1: Export data
      const exportButton = screen.getByText('Export');

      // Mock download functionality
      let downloadUrl = '';
      const createElementSpy = jest
        .spyOn(document, 'createElement')
        .mockImplementation(tagName => {
          if (tagName === 'a') {
            const element = document.createElement(tagName);
            Object.defineProperty(element, 'href', {
              set: value => {
                downloadUrl = value;
              },
              get: () => downloadUrl,
            });
            Object.defineProperty(element, 'click', {
              value: jest.fn(),
            });
            return element;
          }
          return document.createElement(tagName);
        });

      URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = jest.fn();

      await user.click(exportButton);

      // Verify export was triggered
      await waitFor(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
      });
      expect(URL.createObjectURL).toHaveBeenCalled();

      // Step 2: Import data
      const importButton = screen.getByText('Import');

      // Create mock file
      const mockFile = new File(
        [
          JSON.stringify({
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            schedule: {
              currentSchedule: mockSchedule,
              edits: [],
            },
            configuration: {
              config: {
                startingBalance: 5000,
                targetBalance: 15000,
                minimumBalance: 500,
                populationSize: 150,
                generations: 200,
              },
            },
          }),
        ],
        'export.json',
        { type: 'application/json' }
      );

      // Mock file input
      let fileInputElement: HTMLInputElement | null = null;
      createElementSpy.mockImplementation(tagName => {
        if (tagName === 'input') {
          fileInputElement = document.createElement(
            'input'
          ) as HTMLInputElement;
          fileInputElement.type = 'file';
          Object.defineProperty(fileInputElement, 'files', {
            value: [mockFile],
          });
          return fileInputElement;
        }
        return document.createElement(tagName);
      });

      await user.click(importButton);

      // Trigger file selection
      if (fileInputElement && fileInputElement.onchange) {
        fileInputElement.onchange(new Event('change'));
      }

      // Verify import updated values
      await waitFor(() => {
        const startingBalanceInput = screen.getByLabelText(/Starting Balance/);
        expect(startingBalanceInput).toHaveValue(5000);
      });
    });
  });

  describe('Filter and Sort Workflow', () => {
    it('should filter and sort schedule data', async () => {
      const user = userEvent.setup();
      const mockWorker = (global as unknown as { mockWorker: MockWorker })
        .mockWorker;

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText('Financial Schedule Optimizer')
        ).toBeInTheDocument();
      });

      // Generate a schedule
      await user.click(screen.getByText('Start Optimization'));

      const mockSchedule = Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        shifts: i % 7 === 0 || i % 7 === 6 ? [] : ['Morning'], // Weekends have no shifts
        earnings: i % 7 === 0 || i % 7 === 6 ? 0 : 300,
        expenses: 50,
        deposit: 0,
        startBalance: 1000 + i * 200,
        endBalance: 1000 + (i + 1) * 200,
      }));

      mockWorker.onmessage({
        data: {
          type: 'complete',
          result: {
            schedule: mockSchedule,
            workDays: mockSchedule
              .filter(d => d.shifts.length > 0)
              .map(d => d.day),
            fitness: 0.8,
            totalEarnings: 6000,
            totalExpenses: 1500,
            finalBalance: 7500,
            violations: 0,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Test weekend toggle
      const showWeekendsCheckbox = screen.getByLabelText(/Show Weekends/);

      // Get initial row count
      const table = screen.getByRole('table');
      const initialRows = within(table).getAllByRole('row');
      const initialRowCount = initialRows.length;

      // Hide weekends
      await user.click(showWeekendsCheckbox);

      // Should have fewer rows
      await waitFor(() => {
        const rows = within(table).getAllByRole('row');
        expect(rows.length).toBeLessThan(initialRowCount);
      });

      // Test sorting
      const dayHeader = screen.getByText(/Day.*↑/); // Day column with sort indicator

      // Click to reverse sort
      await user.click(dayHeader);

      // Should show descending order
      await waitFor(() => {
        expect(screen.getByText(/Day.*↓/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover from optimization errors and allow retry', async () => {
      const user = userEvent.setup();
      let errorCount = 0;

      // Mock Worker to fail first time, succeed second time
      global.Worker = jest.fn().mockImplementation(() => {
        const worker = {
          postMessage: jest.fn(),
          terminate: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
          onmessage: null,
          onmessageerror: null,
          onerror: null,
        };

        // Override postMessage to trigger error or success
        worker.postMessage = jest.fn(data => {
          if (data.type === 'start') {
            setTimeout(() => {
              if (errorCount === 0) {
                errorCount++;
                // First attempt: error
                if (worker.onmessage) {
                  worker.onmessage({
                    data: {
                      type: 'error',
                      error: 'Optimization failed: Invalid configuration',
                    },
                  });
                }
              } else {
                // Second attempt: success
                if (worker.onmessage) {
                  worker.onmessage({
                    data: {
                      type: 'complete',
                      result: {
                        schedule: Array.from({ length: 30 }, (_, i) => ({
                          day: i + 1,
                          shifts: [],
                          earnings: 0,
                          expenses: 50,
                          deposit: 0,
                          startBalance: 1000,
                          endBalance: 950,
                        })),
                        workDays: [],
                        fitness: 0.5,
                        totalEarnings: 0,
                        totalExpenses: 1500,
                        finalBalance: 500,
                        violations: 0,
                      },
                    },
                  });
                }
              }
            }, 100);
          }
        });

        return worker;
      }) as unknown as typeof Worker;

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText('Financial Schedule Optimizer')
        ).toBeInTheDocument();
      });

      // First attempt - will fail
      const optimizeButton = screen.getByText('Start Optimization');
      await user.click(optimizeButton);

      // Should show error (error handling will reset state)
      await waitFor(() => {
        expect(screen.getByText('Start Optimization')).toBeInTheDocument();
      });
      expect(
        screen.queryByText('Optimization Progress')
      ).not.toBeInTheDocument();

      // Second attempt - will succeed
      await user.click(optimizeButton);

      // Should complete successfully
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });
  });
});
