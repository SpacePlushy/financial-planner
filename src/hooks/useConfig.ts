import { useCallback, useMemo } from 'react';
import { useConfiguration } from '../context/ConfigurationContext';
import { OptimizationConfig } from '../types';
import { ConfigurationPreset } from '../context/types';

/**
 * Configuration validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Enhanced configuration hook with validation and utilities
 *
 * This hook wraps the ConfigurationContext and provides additional
 * functionality for configuration management, validation, and comparison.
 *
 * @returns Enhanced configuration utilities
 */
export function useConfig() {
  const context = useConfiguration();

  /**
   * Validates an optimization configuration
   *
   * @param config - Configuration to validate
   * @returns Validation result with any errors
   */
  const validateConfig = useCallback(
    (config: Partial<OptimizationConfig>): ValidationResult => {
      const errors: string[] = [];

      // Validate starting balance
      if (config.startingBalance !== undefined) {
        if (config.startingBalance < 0) {
          errors.push('Starting balance must be non-negative');
        }
      }

      // Validate target ending balance
      if (config.targetEndingBalance !== undefined) {
        if (config.targetEndingBalance < 0) {
          errors.push('Target ending balance must be non-negative');
        }
      }

      // Validate minimum balance
      if (config.minimumBalance !== undefined) {
        if (config.minimumBalance < 0) {
          errors.push('Minimum balance must be non-negative');
        }
        if (
          config.startingBalance !== undefined &&
          config.minimumBalance > config.startingBalance
        ) {
          errors.push('Minimum balance cannot exceed starting balance');
        }
      }

      // Validate population size
      if (config.populationSize !== undefined) {
        if (config.populationSize < 10) {
          errors.push('Population size must be at least 10');
        }
      }

      // Validate generations
      if (config.generations !== undefined) {
        if (config.generations < 1) {
          errors.push('Generations must be at least 1');
        }
      }

      // Validate balance edit day
      if (
        config.balanceEditDay !== undefined &&
        config.balanceEditDay !== null
      ) {
        if (config.balanceEditDay < 1 || config.balanceEditDay > 30) {
          errors.push('Balance edit day must be between 1 and 30');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
    []
  );

  /**
   * Safely updates configuration with validation
   *
   * @param updates - Partial configuration updates
   * @returns Whether the update was successful
   */
  const safeUpdateConfig = useCallback(
    (updates: Partial<OptimizationConfig>): boolean => {
      const validation = validateConfig(updates);

      if (!validation.isValid) {
        console.error('Configuration validation failed:', validation.errors);
        return false;
      }

      context.updateConfig(updates);
      return true;
    },
    [context, validateConfig]
  );

  /**
   * Compares two configurations and returns differences
   *
   * @param configA - First configuration
   * @param configB - Second configuration
   * @returns Object containing only the differing fields
   */
  const compareConfigs = useCallback(
    (
      configA: OptimizationConfig,
      configB: OptimizationConfig
    ): Partial<OptimizationConfig> => {
      const differences: Partial<OptimizationConfig> = {};

      // Compare primitive fields
      const fields: (keyof OptimizationConfig)[] = [
        'startingBalance',
        'targetEndingBalance',
        'minimumBalance',
        'populationSize',
        'generations',
        'balanceEditDay',
        'newStartingBalance',
        'debugFitness',
      ];

      fields.forEach(field => {
        if (configA[field] !== configB[field]) {
          (differences as Record<string, unknown>)[field] = configB[field];
        }
      });

      // Compare manual constraints (deep comparison)
      if (
        JSON.stringify(configA.manualConstraints) !==
        JSON.stringify(configB.manualConstraints)
      ) {
        differences.manualConstraints = configB.manualConstraints;
      }

      return differences;
    },
    []
  );

  /**
   * Finds presets that match the current configuration
   *
   * @returns Array of matching preset IDs
   */
  const findMatchingPresets = useCallback((): string[] => {
    return context.presets
      .filter(preset => {
        const differences = compareConfigs(
          { ...context.config, ...preset.config },
          context.config
        );
        return Object.keys(differences).length === 0;
      })
      .map(preset => preset.id);
  }, [context.config, context.presets, compareConfigs]);

  /**
   * Gets a preset by ID
   *
   * @param presetId - ID of the preset to retrieve
   * @returns The preset or undefined if not found
   */
  const getPresetById = useCallback(
    (presetId: string): ConfigurationPreset | undefined => {
      return context.presets.find(preset => preset.id === presetId);
    },
    [context.presets]
  );

  /**
   * Checks if a preset name already exists
   *
   * @param name - Name to check
   * @returns Whether the name is already in use
   */
  const isPresetNameTaken = useCallback(
    (name: string): boolean => {
      return context.presets.some(
        preset => preset.name.toLowerCase() === name.toLowerCase()
      );
    },
    [context.presets]
  );

  /**
   * Creates a preset with validation
   *
   * @param name - Preset name
   * @param description - Preset description
   * @returns Whether the preset was created successfully
   */
  const createPreset = useCallback(
    (name: string, description: string): boolean => {
      if (!name.trim()) {
        console.error('Preset name cannot be empty');
        return false;
      }

      if (isPresetNameTaken(name)) {
        console.error('A preset with this name already exists');
        return false;
      }

      context.saveAsPreset(name.trim(), description.trim());
      return true;
    },
    [context, isPresetNameTaken]
  );

  /**
   * Exports configuration as JSON string
   *
   * @returns JSON string of current configuration
   */
  const exportConfig = useCallback((): string => {
    return JSON.stringify(
      {
        config: context.config,
        presets: context.presets.filter(p => !p.isDefault),
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );
  }, [context.config, context.presets]);

  /**
   * Imports configuration from JSON string
   *
   * @param jsonString - JSON string to import
   * @returns Whether the import was successful
   */
  const importConfig = useCallback(
    (jsonString: string): boolean => {
      try {
        const data = JSON.parse(jsonString);

        if (!data.config || typeof data.config !== 'object') {
          console.error('Invalid configuration format');
          return false;
        }

        const validation = validateConfig(data.config);
        if (!validation.isValid) {
          console.error(
            'Imported configuration is invalid:',
            validation.errors
          );
          return false;
        }

        // Update configuration
        context.updateConfig(data.config);

        // Import custom presets if available
        if (Array.isArray(data.presets)) {
          data.presets.forEach((preset: ConfigurationPreset) => {
            if (!preset.isDefault && preset.name && preset.config) {
              createPreset(preset.name, preset.description || '');
            }
          });
        }

        return true;
      } catch (error) {
        console.error('Failed to import configuration:', error);
        return false;
      }
    },
    [context, validateConfig, createPreset]
  );

  // Memoized return value
  return useMemo(
    () => ({
      // Original context values and methods
      ...context,

      // Enhanced methods
      safeUpdateConfig,
      validateConfig,
      compareConfigs,
      findMatchingPresets,
      getPresetById,
      isPresetNameTaken,
      createPreset,
      exportConfig,
      importConfig,

      // Computed values
      hasUnsavedChanges: context.selectedPresetId === null,
      isUsingPreset: context.selectedPresetId !== null,
      currentPreset: context.selectedPresetId
        ? getPresetById(context.selectedPresetId)
        : undefined,
    }),
    [
      context,
      safeUpdateConfig,
      validateConfig,
      compareConfigs,
      findMatchingPresets,
      getPresetById,
      isPresetNameTaken,
      createPreset,
      exportConfig,
      importConfig,
    ]
  );
}
