import React, { useState, useCallback, useMemo } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { useOptimizer } from '../../hooks/useOptimizer';
import { useScheduleContext } from '../../context/ScheduleContext';
import { getDefaultData } from '../../utils/sampleData';
import {
  LoadingOverlay,
  useLoadingState,
  SkeletonLoader,
} from '../LoadingStates';
import styles from './ConfigurationPanel.module.css';

interface ValidationErrors {
  [key: string]: string;
}

export const ConfigurationPanel: React.FC = () => {
  const {
    config,
    presets,
    selectedPresetId,
    selectPreset,
    clearPreset,
    createPreset,
    updateConfig,
    validateConfig,
    safeUpdateConfig,
    isPresetNameTaken,
  } = useConfig();

  const { startOptimization, isOptimizing } = useOptimizer();
  const scheduleContext = useScheduleContext();

  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  // Loading state for preset operations
  const { isLoading: isLoadingPreset, withLoading } = useLoadingState({
    delay: 200,
    minDuration: 300,
  });

  // Loading state for initial data
  const { isLoading: isInitializing } = useLoadingState({
    delay: 0,
    minDuration: 500,
  });

  // Validate configuration on changes
  const handleConfigChange = useCallback(
    (updates: Partial<typeof config>) => {
      const newConfig = { ...config, ...updates };
      const validation = validateConfig(newConfig);

      // Update validation errors
      const errors: ValidationErrors = {};
      validation.errors.forEach(error => {
        // Map error messages to field names
        if (error.includes('Starting balance')) errors.startingBalance = error;
        if (error.includes('Target ending balance'))
          errors.targetEndingBalance = error;
        if (error.includes('Minimum balance')) errors.minimumBalance = error;
        if (error.includes('Population size')) errors.populationSize = error;
        if (error.includes('Generations')) errors.generations = error;
      });

      setValidationErrors(errors);

      // Always update the config, let context handle validation
      safeUpdateConfig(updates);
    },
    [config, validateConfig, safeUpdateConfig]
  );

  // Handle preset selection
  const handlePresetSelect = useCallback(
    async (presetId: string) => {
      await withLoading(
        new Promise<void>(resolve => {
          setTimeout(() => {
            if (presetId === '') {
              // Custom configuration
              clearPreset();
            } else {
              const preset = presets.find(p => p.id === presetId);
              if (preset) {
                selectPreset(presetId);
                updateConfig(preset.config);
              }
            }
            resolve();
          }, 100); // Simulate async operation
        })
      );
    },
    [presets, selectPreset, clearPreset, updateConfig, withLoading]
  );

  // Handle save as preset
  const handleSavePreset = useCallback(async () => {
    if (!presetName.trim()) {
      setValidationErrors(prev => ({
        ...prev,
        presetName: 'Preset name is required',
      }));
      return;
    }

    if (isPresetNameTaken(presetName)) {
      setValidationErrors(prev => ({
        ...prev,
        presetName: 'A preset with this name already exists',
      }));
      return;
    }

    await withLoading(
      new Promise<void>(resolve => {
        setTimeout(() => {
          const success = createPreset(presetName, presetDescription);
          if (success) {
            setShowSavePreset(false);
            setPresetName('');
            setPresetDescription('');
            setValidationErrors(prev => {
              const { presetName, ...rest } = prev;
              return rest;
            });
          }
          resolve();
        }, 300);
      })
    );
  }, [
    presetName,
    presetDescription,
    isPresetNameTaken,
    createPreset,
    withLoading,
  ]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0 && !isOptimizing;
  }, [validationErrors, isOptimizing]);

  // Show skeleton loader while initializing
  if (isInitializing) {
    return (
      <div className={styles.panel}>
        <SkeletonLoader height={40} width="50%" variant="text" />
        <div style={{ marginTop: 20 }}>
          <SkeletonLoader height={60} count={6} spacing={16} />
        </div>
        <div style={{ marginTop: 20 }}>
          <SkeletonLoader height={48} width={200} />
        </div>
      </div>
    );
  }

  return (
    <LoadingOverlay
      isLoading={isLoadingPreset}
      message="Loading preset..."
      blur
    >
      <div className={styles.panel}>
        <h2 className={styles.title}>Configuration</h2>

        {/* Preset Selection */}
        <div className={styles.section}>
          <label className={styles.label} htmlFor="preset">
            Configuration Preset
          </label>
          <select
            id="preset"
            className={styles.select}
            value={selectedPresetId || ''}
            onChange={e => handlePresetSelect(e.target.value)}
            disabled={isLoadingPreset}
          >
            <option value="">Custom Configuration</option>
            {presets.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          {selectedPresetId && (
            <p className={styles.description}>
              {presets.find(p => p.id === selectedPresetId)?.description}
            </p>
          )}
        </div>

        {/* Save as Preset */}
        {!selectedPresetId && (
          <div className={styles.section}>
            {!showSavePreset ? (
              <button
                className={styles.linkButton}
                onClick={() => setShowSavePreset(true)}
              >
                Save as preset...
              </button>
            ) : (
              <div className={styles.savePreset}>
                <input
                  type="text"
                  className={`${styles.input} ${validationErrors.presetName ? styles.error : ''}`}
                  placeholder="Preset name"
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                />
                {validationErrors.presetName && (
                  <span className={styles.errorText}>
                    {validationErrors.presetName}
                  </span>
                )}
                <textarea
                  className={styles.textarea}
                  placeholder="Description (optional)"
                  value={presetDescription}
                  onChange={e => setPresetDescription(e.target.value)}
                  rows={2}
                />
                <div className={styles.presetActions}>
                  <button
                    className={`${styles.button} ${styles.secondaryButton}`}
                    onClick={() => {
                      setShowSavePreset(false);
                      setPresetName('');
                      setPresetDescription('');
                      setValidationErrors(prev => {
                        const { presetName, ...rest } = prev;
                        return rest;
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.button}
                    onClick={handleSavePreset}
                    disabled={isLoadingPreset}
                  >
                    Save Preset
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configuration Fields */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Financial Goals</h3>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="startingBalance">
              Starting Balance ($)
            </label>
            <input
              id="startingBalance"
              type="number"
              className={`${styles.input} ${validationErrors.startingBalance ? styles.error : ''}`}
              value={config.startingBalance}
              onChange={e =>
                handleConfigChange({ startingBalance: Number(e.target.value) })
              }
              step="0.01"
            />
            {validationErrors.startingBalance && (
              <span className={styles.errorText}>
                {validationErrors.startingBalance}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="targetEndingBalance">
              Target Ending Balance ($)
            </label>
            <input
              id="targetEndingBalance"
              type="number"
              className={`${styles.input} ${validationErrors.targetEndingBalance ? styles.error : ''}`}
              value={config.targetEndingBalance}
              onChange={e =>
                handleConfigChange({
                  targetEndingBalance: Number(e.target.value),
                })
              }
              step="0.01"
            />
            {validationErrors.targetEndingBalance && (
              <span className={styles.errorText}>
                {validationErrors.targetEndingBalance}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="minimumBalance">
              Minimum Balance ($)
            </label>
            <input
              id="minimumBalance"
              type="number"
              className={`${styles.input} ${validationErrors.minimumBalance ? styles.error : ''}`}
              value={config.minimumBalance}
              onChange={e =>
                handleConfigChange({
                  minimumBalance: Number(e.target.value),
                })
              }
              step="0.01"
            />
            {validationErrors.minimumBalance && (
              <span className={styles.errorText}>
                {validationErrors.minimumBalance}
              </span>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Algorithm Parameters</h3>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="populationSize">
              Population Size
            </label>
            <input
              id="populationSize"
              type="number"
              className={`${styles.input} ${validationErrors.populationSize ? styles.error : ''}`}
              value={config.populationSize}
              onChange={e =>
                handleConfigChange({ populationSize: Number(e.target.value) })
              }
              step="1"
            />
            {validationErrors.populationSize && (
              <span className={styles.errorText}>
                {validationErrors.populationSize}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="generations">
              Generations
            </label>
            <input
              id="generations"
              type="number"
              className={`${styles.input} ${validationErrors.generations ? styles.error : ''}`}
              value={config.generations}
              onChange={e =>
                handleConfigChange({ generations: Number(e.target.value) })
              }
              step="1"
            />
            {validationErrors.generations && (
              <span className={styles.errorText}>
                {validationErrors.generations}
              </span>
            )}
          </div>
        </div>

        {/* Debug: Load Sample Data Button */}
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => {
            const defaultData = getDefaultData();
            scheduleContext.setExpenses(defaultData.expenses);
            scheduleContext.setDeposits(defaultData.deposits);
            console.log('Loaded sample data:', defaultData);
          }}
        >
          Load Sample Data
        </button>

        {/* Optimize Button */}
        <button
          type="button"
          className={`${styles.button} ${styles.optimizeButton}`}
          onClick={e => {
            e.preventDefault();
            console.log('Button clicked!', { config, isFormValid });
            // Log current data state for debugging
            console.log('Current expenses:', scheduleContext.expenses);
            console.log('Current deposits:', scheduleContext.deposits);
            console.log('Using config:', config);
            startOptimization(config);
          }}
          disabled={!isFormValid}
        >
          {isOptimizing ? 'Optimizing...' : 'Start Optimization'}
        </button>
      </div>
    </LoadingOverlay>
  );
};
