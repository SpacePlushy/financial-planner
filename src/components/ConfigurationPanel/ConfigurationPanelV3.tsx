import React, { useState, useCallback, useMemo } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { useScheduleContext } from '../../context/ScheduleContext';
import { getDefaultData } from '../../utils/sampleData';
import { OptimizationConfig } from '../../types';
import { ProcessingModeSelector } from '../ProcessingModeSelector/ProcessingModeSelector';
import {
  ProcessingMode,
  ProcessingMetrics,
} from '../../hooks/useDualOptimizer';
import styles from './ConfigurationPanel.module.css';

interface ValidationErrors {
  [key: string]: string;
}

interface ConfigurationPanelProps {
  startOptimization: (mode?: ProcessingMode) => Promise<void>;
  isOptimizing: boolean;
  processingMode: ProcessingMode;
  setProcessingMode: (mode: ProcessingMode) => void;
  metrics: ProcessingMetrics;
  clientProgress: number | null;
  serverProgress: number | null;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  startOptimization,
  isOptimizing,
  processingMode,
  setProcessingMode,
  metrics,
  clientProgress,
  serverProgress,
}) => {
  const {
    config,
    presets,
    selectedPresetId,
    selectPreset,
    clearPreset,
    createPreset,
    validateConfig,
    safeUpdateConfig,
    isPresetNameTaken,
  } = useConfig();

  const scheduleContext = useScheduleContext();

  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  // Loading state for preset operations
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);

  // Field-specific validation
  const validateFieldSpecific = useCallback(
    (
      updates: Partial<OptimizationConfig>,
      fullConfig: OptimizationConfig
    ): ValidationErrors => {
      const errors: ValidationErrors = {};

      // Check each updated field
      if (updates.startingBalance !== undefined) {
        if (updates.startingBalance < 0) {
          errors.startingBalance = 'Starting balance must be non-negative';
        } else if (fullConfig.minimumBalance > updates.startingBalance) {
          errors.startingBalance =
            'Starting balance must be >= minimum balance';
        }
      }

      if (updates.targetEndingBalance !== undefined) {
        if (updates.targetEndingBalance < 0) {
          errors.targetEndingBalance =
            'Target ending balance must be non-negative';
        }
      }

      if (updates.minimumBalance !== undefined) {
        if (updates.minimumBalance < 0) {
          errors.minimumBalance = 'Minimum balance must be non-negative';
        } else if (updates.minimumBalance > fullConfig.startingBalance) {
          errors.minimumBalance =
            'Minimum balance cannot exceed starting balance';
        }
      }

      if (updates.populationSize !== undefined) {
        if (updates.populationSize < 10) {
          errors.populationSize = 'Population size must be at least 10';
        }
      }

      if (updates.generations !== undefined) {
        if (updates.generations < 1) {
          errors.generations = 'Generations must be at least 1';
        }
      }

      return errors;
    },
    []
  );

  // Validate configuration on changes
  const handleConfigChange = useCallback(
    (updates: Partial<typeof config>) => {
      const newConfig = { ...config, ...updates };

      // Get field-specific validation errors
      const fieldErrors = validateFieldSpecific(updates, newConfig);

      // Update validation errors state
      setValidationErrors(prev => {
        // Clear errors for fields that were updated and are now valid
        const newErrors = { ...prev };
        Object.keys(updates).forEach(key => {
          if (!fieldErrors[key]) {
            delete newErrors[key];
          }
        });
        // Add new errors
        return { ...newErrors, ...fieldErrors };
      });

      safeUpdateConfig(updates);
      clearPreset();
    },
    [config, validateFieldSpecific, safeUpdateConfig, clearPreset]
  );

  // Handle optimization start
  const handleStartOptimization = useCallback(async () => {
    // Validate all fields
    const allFieldErrors = validateFieldSpecific(config, config);

    // Check if there are any errors
    if (Object.keys(allFieldErrors).length > 0) {
      setValidationErrors(allFieldErrors);
      return;
    }

    try {
      await startOptimization(processingMode);
    } catch (error) {
      console.error('Failed to start optimization:', error);
    }
  }, [config, validateFieldSpecific, startOptimization, processingMode]);

  // Calculate progress for the optimizer based on processing mode
  const optimizerProgress = useMemo(() => {
    if (processingMode === 'client') return clientProgress;
    if (processingMode === 'server') return serverProgress;
    if (processingMode === 'both') return clientProgress; // Use client progress as primary
    return null;
  }, [processingMode, clientProgress, serverProgress]);

  // Handle preset selection
  const handlePresetSelect = useCallback(
    async (presetId: string) => {
      setIsLoadingPreset(true);
      try {
        await selectPreset(presetId);
        setValidationErrors({});
      } catch (error) {
        console.error('Failed to load preset:', error);
      } finally {
        setIsLoadingPreset(false);
      }
    },
    [selectPreset]
  );

  // Handle preset save
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      setValidationErrors({
        presetName: 'Preset name is required',
      });
      return;
    }

    if (isPresetNameTaken(presetName)) {
      setValidationErrors({
        presetName: 'A preset with this name already exists',
      });
      return;
    }

    createPreset(presetName, presetDescription);

    setShowSavePreset(false);
    setPresetName('');
    setPresetDescription('');
    setValidationErrors({});
  }, [presetName, presetDescription, config, createPreset, isPresetNameTaken]);

  // Load sample data
  const handleLoadSampleData = useCallback(() => {
    const sampleData = getDefaultData();
    scheduleContext.setExpenses(sampleData.expenses);
    scheduleContext.setDeposits(sampleData.deposits);
    // Note: The schedule will be generated when optimization runs
  }, [scheduleContext]);

  // Reset configuration
  const handleReset = useCallback(() => {
    safeUpdateConfig({
      startingBalance: 1000,
      targetEndingBalance: 2000,
      minimumBalance: 100,
      populationSize: 100,
      generations: 100,
    });
    setValidationErrors({});
    clearPreset();
  }, [safeUpdateConfig, clearPreset]);

  return (
    <div className={styles.configurationPanel}>
      {/* Processing Mode Selector */}
      <ProcessingModeSelector
        mode={processingMode}
        onModeChange={setProcessingMode}
        metrics={metrics}
        isOptimizing={isOptimizing}
        clientProgress={optimizerProgress}
        serverProgress={serverProgress}
      />

      {/* Basic Configuration */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Financial Goals</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            Starting Balance ($)
            <input
              type="number"
              className={`${styles.input} ${
                validationErrors.startingBalance ? styles.inputError : ''
              }`}
              value={config.startingBalance}
              onChange={e =>
                handleConfigChange({
                  startingBalance: Number(e.target.value),
                })
              }
              step="0.01"
              disabled={isOptimizing}
            />
            {validationErrors.startingBalance && (
              <span className={styles.errorMessage}>
                {validationErrors.startingBalance}
              </span>
            )}
          </label>

          <label className={styles.label}>
            Target Ending Balance ($)
            <input
              type="number"
              className={`${styles.input} ${
                validationErrors.targetEndingBalance ? styles.inputError : ''
              }`}
              value={config.targetEndingBalance}
              onChange={e =>
                handleConfigChange({
                  targetEndingBalance: Number(e.target.value),
                })
              }
              step="0.01"
              disabled={isOptimizing}
            />
            {validationErrors.targetEndingBalance && (
              <span className={styles.errorMessage}>
                {validationErrors.targetEndingBalance}
              </span>
            )}
          </label>

          <label className={styles.label}>
            Minimum Balance ($)
            <input
              type="number"
              className={`${styles.input} ${
                validationErrors.minimumBalance ? styles.inputError : ''
              }`}
              value={config.minimumBalance}
              onChange={e =>
                handleConfigChange({
                  minimumBalance: Number(e.target.value),
                })
              }
              step="0.01"
              disabled={isOptimizing}
            />
            {validationErrors.minimumBalance && (
              <span className={styles.errorMessage}>
                {validationErrors.minimumBalance}
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Algorithm Settings */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Algorithm Parameters</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            Population Size
            <input
              type="number"
              className={`${styles.input} ${
                validationErrors.populationSize ? styles.inputError : ''
              }`}
              value={config.populationSize}
              onChange={e =>
                handleConfigChange({
                  populationSize: Number(e.target.value),
                })
              }
              step="1"
              min="50"
              max="500"
              disabled={isOptimizing}
            />
            {validationErrors.populationSize && (
              <span className={styles.errorMessage}>
                {validationErrors.populationSize}
              </span>
            )}
          </label>

          <label className={styles.label}>
            Generations
            <input
              type="number"
              className={`${styles.input} ${
                validationErrors.generations ? styles.inputError : ''
              }`}
              value={config.generations}
              onChange={e =>
                handleConfigChange({
                  generations: Number(e.target.value),
                })
              }
              step="1"
              min="50"
              max="1000"
              disabled={isOptimizing}
            />
            {validationErrors.generations && (
              <span className={styles.errorMessage}>
                {validationErrors.generations}
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Presets */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Presets</h3>
        <div className={styles.presetGroup}>
          <select
            className={styles.select}
            value={selectedPresetId || ''}
            onChange={e => handlePresetSelect(e.target.value)}
            disabled={isOptimizing || isLoadingPreset}
          >
            <option value="">Select a preset...</option>
            {presets.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <button
            className={styles.button}
            onClick={() => setShowSavePreset(!showSavePreset)}
            disabled={isOptimizing}
          >
            Save Current
          </button>
        </div>

        {showSavePreset && (
          <div className={styles.savePresetForm}>
            <input
              type="text"
              className={`${styles.input} ${
                validationErrors.presetName ? styles.inputError : ''
              }`}
              placeholder="Preset name"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              disabled={isOptimizing}
            />
            {validationErrors.presetName && (
              <span className={styles.errorMessage}>
                {validationErrors.presetName}
              </span>
            )}
            <textarea
              className={styles.textarea}
              placeholder="Description (optional)"
              value={presetDescription}
              onChange={e => setPresetDescription(e.target.value)}
              rows={2}
              disabled={isOptimizing}
            />
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={handleSavePreset}
                disabled={isOptimizing}
              >
                Save
              </button>
              <button
                className={styles.button}
                onClick={() => {
                  setShowSavePreset(false);
                  setPresetName('');
                  setPresetDescription('');
                }}
                disabled={isOptimizing}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonLarge}`}
          onClick={handleStartOptimization}
          disabled={isOptimizing || Object.keys(validationErrors).length > 0}
        >
          {isOptimizing ? 'Optimizing...' : 'Start Optimization'}
        </button>

        <div className={styles.secondaryActions}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleLoadSampleData}
            disabled={isOptimizing}
          >
            Load Sample Data
          </button>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleReset}
            disabled={isOptimizing}
          >
            Reset Config
          </button>
        </div>
      </div>
    </div>
  );
};
