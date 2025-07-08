import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useReducer,
  useEffect,
} from 'react';
import { OptimizationConfig } from '../types';
import { ConfigurationContextValue, ConfigurationPreset } from './types';
import {
  createLoggingMiddleware,
  defaultStateSanitizer,
  defaultActionSanitizer,
} from './middleware/loggingMiddleware';
import { logger } from '../utils/logger';

/**
 * Default optimization configuration values
 */
const DEFAULT_CONFIG: OptimizationConfig = {
  startingBalance: 1000,
  targetEndingBalance: 2000,
  minimumBalance: 100,
  populationSize: 200,
  generations: 500,
  manualConstraints: {},
  balanceEditDay: undefined,
  newStartingBalance: undefined,
  debugFitness: false,
};

/**
 * Default presets for common optimization scenarios
 */
const DEFAULT_PRESETS: ConfigurationPreset[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Low risk, steady growth with high minimum balance',
    isDefault: true,
    config: {
      minimumBalance: 500,
      populationSize: 150,
      generations: 300,
    },
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Higher risk, maximum earnings potential',
    isDefault: true,
    config: {
      minimumBalance: 50,
      populationSize: 150,
      generations: 100,
    },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Moderate risk with reasonable growth targets',
    isDefault: true,
    config: {
      minimumBalance: 200,
      populationSize: 200,
      generations: 500,
    },
  },
  {
    id: 'quick',
    name: 'Quick Optimization',
    description: 'Fast results with reduced accuracy',
    isDefault: true,
    config: {
      populationSize: 50,
      generations: 100,
    },
  },
];

/**
 * Configuration state interface
 */
interface ConfigurationState {
  config: OptimizationConfig;
  presets: ConfigurationPreset[];
  selectedPresetId: string | null;
}

/**
 * Configuration action types
 */
type ConfigurationActionType =
  | { type: 'UPDATE_CONFIG'; payload: Partial<OptimizationConfig> }
  | { type: 'RESET_CONFIG' }
  | { type: 'SELECT_PRESET'; payload: string }
  | { type: 'CLEAR_PRESET' }
  | { type: 'SAVE_PRESET'; payload: ConfigurationPreset }
  | { type: 'DELETE_PRESET'; payload: string }
  | {
      type: 'SET_BALANCE_EDIT';
      payload: { day: number | null; newBalance?: number };
    }
  | { type: 'CLEAR_SELECTED_PRESET' };

/**
 * Configuration reducer
 */
function configurationReducer(
  state: ConfigurationState,
  action: ConfigurationActionType
): ConfigurationState {
  switch (action.type) {
    case 'UPDATE_CONFIG': {
      const newConfig = { ...state.config, ...action.payload };

      // Validation
      if (newConfig.startingBalance < 0) {
        console.error('Starting balance cannot be negative');
        newConfig.startingBalance = 0;
      }

      if (newConfig.minimumBalance < 0) {
        console.error('Minimum balance cannot be negative');
        newConfig.minimumBalance = 0;
      }

      if (newConfig.minimumBalance > newConfig.startingBalance) {
        console.error('Minimum balance cannot exceed starting balance');
        newConfig.minimumBalance = newConfig.startingBalance;
      }

      if (newConfig.populationSize < 10) {
        console.error('Population size must be at least 10');
        newConfig.populationSize = 10;
      }

      if (newConfig.generations < 1) {
        console.error('Generations must be at least 1');
        newConfig.generations = 1;
      }

      return {
        ...state,
        config: newConfig,
        selectedPresetId: null, // Clear selected preset on manual change
      };
    }

    case 'RESET_CONFIG':
      return {
        ...state,
        config: DEFAULT_CONFIG,
        selectedPresetId: null,
      };

    case 'SELECT_PRESET': {
      const preset = state.presets.find(p => p.id === action.payload);
      if (!preset) {
        console.error(`Preset with id ${action.payload} not found`);
        return state;
      }

      return {
        ...state,
        config: { ...state.config, ...preset.config },
        selectedPresetId: action.payload,
      };
    }

    case 'CLEAR_PRESET':
      return {
        ...state,
        selectedPresetId: null,
      };

    case 'SAVE_PRESET':
      return {
        ...state,
        presets: [...state.presets, action.payload],
      };

    case 'DELETE_PRESET': {
      const preset = state.presets.find(p => p.id === action.payload);
      if (preset?.isDefault) {
        console.error('Cannot delete default presets');
        return state;
      }

      return {
        ...state,
        presets: state.presets.filter(p => p.id !== action.payload),
        selectedPresetId:
          state.selectedPresetId === action.payload
            ? null
            : state.selectedPresetId,
      };
    }

    case 'SET_BALANCE_EDIT': {
      const { day, newBalance } = action.payload;

      if (day === null) {
        return {
          ...state,
          config: {
            ...state.config,
            balanceEditDay: undefined,
            newStartingBalance: undefined,
          },
        };
      }

      return {
        ...state,
        config: {
          ...state.config,
          balanceEditDay: day,
          newStartingBalance: newBalance,
        },
      };
    }

    default:
      return state;
  }
}

/**
 * Configuration context for managing optimization settings
 */
const ConfigurationContext = createContext<
  ConfigurationContextValue | undefined
>(undefined);

/**
 * Props for the ConfigurationProvider component
 */
interface ConfigurationProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<OptimizationConfig>;
  initialPresets?: ConfigurationPreset[];
}

/**
 * ConfigurationProvider component that manages optimization configuration state
 *
 * @param props - Provider props
 * @returns Provider component
 */
export function ConfigurationProvider({
  children,
  initialConfig,
  initialPresets,
}: ConfigurationProviderProps) {
  // Initial state
  const initialState: ConfigurationState = {
    config: {
      ...DEFAULT_CONFIG,
      ...initialConfig,
    },
    presets: initialPresets || DEFAULT_PRESETS,
    selectedPresetId: null,
  };

  // Create wrapped reducer with logging middleware
  const wrappedReducer = useMemo(
    () =>
      createLoggingMiddleware(configurationReducer, {
        contextName: 'ConfigurationContext',
        enabled:
          process.env.NODE_ENV !== 'production' ||
          process.env.REACT_APP_ENABLE_LOGGING === 'true',
        logStateDiff: process.env.REACT_APP_LOG_STATE_DIFF === 'true',
        sanitizeState: defaultStateSanitizer,
        sanitizeAction: defaultActionSanitizer,
      }),
    []
  );

  const [state, dispatch] = useReducer(wrappedReducer, initialState);

  // Log provider mount/unmount
  useEffect(() => {
    logger.info('ConfigurationContext', 'ConfigurationProvider mounted', {
      hasInitialConfig: !!initialConfig,
      presetsCount: state.presets.length,
      defaultPresetsCount: state.presets.filter(p => p.isDefault).length,
    });

    return () => {
      logger.info('ConfigurationContext', 'ConfigurationProvider unmounted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Updates the configuration with partial values
   * Validates the updates before applying them
   */
  const updateConfig = useCallback((updates: Partial<OptimizationConfig>) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: updates });
  }, []);

  /**
   * Resets the configuration to default values
   */
  const resetConfig = useCallback(() => {
    dispatch({ type: 'RESET_CONFIG' });
  }, []);

  /**
   * Selects and applies a preset configuration
   */
  const selectPreset = useCallback((presetId: string) => {
    dispatch({ type: 'SELECT_PRESET', payload: presetId });
  }, []);

  /**
   * Clears the currently selected preset
   */
  const clearPreset = useCallback(() => {
    dispatch({ type: 'CLEAR_PRESET' });
  }, []);

  /**
   * Saves the current configuration as a new preset
   */
  const saveAsPreset = useCallback(
    (name: string, description: string) => {
      const newPreset: ConfigurationPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        config: { ...state.config },
        isDefault: false,
      };

      dispatch({ type: 'SAVE_PRESET', payload: newPreset });
    },
    [state.config]
  );

  /**
   * Deletes a preset by ID
   * Default presets cannot be deleted
   */
  const deletePreset = useCallback((presetId: string) => {
    dispatch({ type: 'DELETE_PRESET', payload: presetId });
  }, []);

  /**
   * Sets or clears a balance edit constraint
   */
  const setBalanceEdit = useCallback(
    (day: number | null, newBalance?: number) => {
      dispatch({ type: 'SET_BALANCE_EDIT', payload: { day, newBalance } });
    },
    []
  );

  // Memoized context value
  const contextValue = useMemo<ConfigurationContextValue>(
    () => ({
      // State
      config: state.config,
      presets: state.presets,
      selectedPresetId: state.selectedPresetId,

      // Actions
      updateConfig,
      resetConfig,
      selectPreset,
      clearPreset,
      saveAsPreset,
      deletePreset,
      setBalanceEdit,
    }),
    [
      state.config,
      state.presets,
      state.selectedPresetId,
      updateConfig,
      resetConfig,
      selectPreset,
      clearPreset,
      saveAsPreset,
      deletePreset,
      setBalanceEdit,
    ]
  );

  return (
    <ConfigurationContext.Provider value={contextValue}>
      {children}
    </ConfigurationContext.Provider>
  );
}

/**
 * Hook to access the configuration context
 *
 * @throws Error if used outside of ConfigurationProvider
 * @returns Configuration context value
 */
export function useConfigurationContext() {
  const context = useContext(ConfigurationContext);
  if (!context) {
    throw new Error(
      'useConfiguration must be used within a ConfigurationProvider'
    );
  }
  return context;
}

// Export alias for backward compatibility
export const useConfiguration = useConfigurationContext;

// Export types for external use
export type { ConfigurationPreset } from './types';
export { DEFAULT_CONFIG, DEFAULT_PRESETS };
