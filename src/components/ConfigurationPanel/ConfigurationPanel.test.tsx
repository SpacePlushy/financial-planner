import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigurationPanel } from './ConfigurationPanel';
import { OptimizationConfig } from '../../types';
import { ConfigurationProvider } from '../../context/ConfigurationContext';
import * as useConfigHook from '../../hooks/useConfig';

// Mock the useConfig hook
jest.mock('../../hooks/useConfig');

const mockUseConfig = useConfigHook.useConfig as jest.MockedFunction<
  typeof useConfigHook.useConfig
>;

// Default test config
const defaultConfig: OptimizationConfig = {
  startingBalance: 1000,
  targetEndingBalance: 2000,
  minimumBalance: 500,
  populationSize: 50,
  generations: 100,
  debugFitness: false,
};

// Default mock implementation
const createMockUseConfig = (overrides = {}) => ({
  config: defaultConfig,
  presets: [
    {
      id: 'conservative',
      name: 'Conservative',
      description: 'Conservative strategy',
      config: {
        startingBalance: 1000,
        targetEndingBalance: 1500,
        minimumBalance: 800,
      },
      isDefault: true,
    },
    {
      id: 'aggressive',
      name: 'Aggressive',
      description: 'Aggressive strategy',
      config: {
        startingBalance: 500,
        targetEndingBalance: 3000,
        minimumBalance: 100,
      },
      isDefault: true,
    },
  ],
  selectedPresetId: null,
  selectPreset: jest.fn(),
  createPreset: jest.fn().mockReturnValue(true),
  validateConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  safeUpdateConfig: jest.fn().mockReturnValue(true),
  isPresetNameTaken: jest.fn().mockReturnValue(false),
  updateConfig: jest.fn(),
  resetConfig: jest.fn(),
  saveAsPreset: jest.fn(),
  deletePreset: jest.fn(),
  setBalanceEdit: jest.fn(),
  ...overrides,
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConfigurationProvider>{children}</ConfigurationProvider>
);

describe('ConfigurationPanel', () => {
  const mockOnChange = jest.fn();
  const mockOnOptimize = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfig.mockReturnValue(createMockUseConfig());
  });

  it('renders all configuration fields', () => {
    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    // Check main title
    expect(screen.getByText('Optimization Configuration')).toBeInTheDocument();

    // Check section titles
    expect(screen.getByText('Financial Settings')).toBeInTheDocument();
    expect(screen.getByText('Algorithm Settings')).toBeInTheDocument();
    expect(screen.getByText('Advanced Settings')).toBeInTheDocument();

    // Check fields
    expect(screen.getByLabelText('Starting Balance ($)')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Target Ending Balance ($)')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum Balance ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Population Size')).toBeInTheDocument();
    expect(screen.getByLabelText('Generations')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Balance Edit Day (optional)')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Enable Debug Fitness Logging')
    ).toBeInTheDocument();
  });

  it('displays current configuration values', () => {
    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
  });

  it('calls onChange when input values change', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    const startingBalanceInput = screen.getByLabelText('Starting Balance ($)');
    await user.clear(startingBalanceInput);
    await user.type(startingBalanceInput, '1500');

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        startingBalance: 1500,
      })
    );
  });

  it('displays validation errors', () => {
    const mockValidateConfig = jest.fn().mockReturnValue({
      isValid: false,
      errors: [
        'Starting balance must be non-negative',
        'Population size must be at least 10',
      ],
    });

    mockUseConfig.mockReturnValue(
      createMockUseConfig({ validateConfig: mockValidateConfig })
    );

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={{
            ...defaultConfig,
            startingBalance: -100,
            populationSize: 5,
          }}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    expect(
      screen.getByText('Starting balance must be non-negative')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Population size must be at least 10')
    ).toBeInTheDocument();
  });

  it('disables optimize button when validation errors exist', () => {
    const mockValidateConfig = jest.fn().mockReturnValue({
      isValid: false,
      errors: ['Starting balance must be non-negative'],
    });

    mockUseConfig.mockReturnValue(
      createMockUseConfig({ validateConfig: mockValidateConfig })
    );

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={{ ...defaultConfig, startingBalance: -100 }}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    const optimizeButton = screen.getByText('Optimize Schedule');
    expect(optimizeButton).toBeDisabled();
  });

  it('shows loading state when optimizing', () => {
    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Optimizing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /optimizing/i })).toBeDisabled();
  });

  it('handles preset selection', async () => {
    const mockSelectPreset = jest.fn();
    mockUseConfig.mockReturnValue(
      createMockUseConfig({ selectPreset: mockSelectPreset })
    );

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    const presetSelect = screen.getByLabelText('Configuration Preset');
    fireEvent.change(presetSelect, { target: { value: 'conservative' } });

    expect(mockSelectPreset).toHaveBeenCalledWith('conservative');
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('shows and hides save preset form', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    // Initially, form should not be visible
    expect(
      screen.queryByText('Save Configuration as Preset')
    ).not.toBeInTheDocument();

    // Click save as preset button
    await user.click(screen.getByText('Save as Preset'));

    // Form should now be visible
    expect(
      screen.getByText('Save Configuration as Preset')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Preset Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument();

    // Cancel should hide the form
    await user.click(screen.getByText('Cancel'));
    expect(
      screen.queryByText('Save Configuration as Preset')
    ).not.toBeInTheDocument();
  });

  it('validates preset name when saving', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    await user.click(screen.getByText('Save as Preset'));
    await user.click(screen.getByText('Save Preset'));

    expect(screen.getByText('Preset name is required')).toBeInTheDocument();
  });

  it('checks for duplicate preset names', async () => {
    const user = userEvent.setup();
    const mockIsPresetNameTaken = jest.fn().mockReturnValue(true);

    mockUseConfig.mockReturnValue(
      createMockUseConfig({ isPresetNameTaken: mockIsPresetNameTaken })
    );

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    await user.click(screen.getByText('Save as Preset'));
    await user.type(screen.getByLabelText('Preset Name'), 'Conservative');
    await user.click(screen.getByText('Save Preset'));

    expect(
      screen.getByText('A preset with this name already exists')
    ).toBeInTheDocument();
  });

  it('successfully saves a preset', async () => {
    const user = userEvent.setup();
    const mockCreatePreset = jest.fn().mockReturnValue(true);

    mockUseConfig.mockReturnValue(
      createMockUseConfig({ createPreset: mockCreatePreset })
    );

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    await user.click(screen.getByText('Save as Preset'));
    await user.type(screen.getByLabelText('Preset Name'), 'My Custom Preset');
    await user.type(
      screen.getByLabelText('Description (optional)'),
      'Test description'
    );
    await user.click(screen.getByText('Save Preset'));

    expect(mockCreatePreset).toHaveBeenCalledWith(
      'My Custom Preset',
      'Test description'
    );
    // Form should be hidden after successful save
    expect(
      screen.queryByText('Save Configuration as Preset')
    ).not.toBeInTheDocument();
  });

  it('shows new starting balance field when balance edit day is set', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    // Initially, new starting balance should not be visible
    expect(
      screen.queryByLabelText('New Starting Balance ($)')
    ).not.toBeInTheDocument();

    // Set balance edit day
    const balanceEditDayInput = screen.getByLabelText(
      'Balance Edit Day (optional)'
    );
    await user.type(balanceEditDayInput, '15');

    // Trigger onChange to update config
    mockOnChange({ ...defaultConfig, balanceEditDay: 15 });

    // Re-render with updated config
    render(
      <TestWrapper>
        <ConfigurationPanel
          config={{ ...defaultConfig, balanceEditDay: 15 }}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    expect(
      screen.getByLabelText('New Starting Balance ($)')
    ).toBeInTheDocument();
  });

  it('disables all inputs when optimizing', () => {
    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={true}
        />
      </TestWrapper>
    );

    const inputs = screen.getAllByRole('spinbutton');
    const selects = screen.getAllByRole('combobox');
    const checkboxes = screen.getAllByRole('checkbox');

    inputs.forEach(input => expect(input).toBeDisabled());
    selects.forEach(select => expect(select).toBeDisabled());
    checkboxes.forEach(checkbox => expect(checkbox).toBeDisabled());
  });

  it('calls onOptimize when optimize button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ConfigurationPanel
          config={defaultConfig}
          onChange={mockOnChange}
          onOptimize={mockOnOptimize}
          isOptimizing={false}
        />
      </TestWrapper>
    );

    await user.click(screen.getByText('Optimize Schedule'));
    expect(mockOnOptimize).toHaveBeenCalled();
  });
});
