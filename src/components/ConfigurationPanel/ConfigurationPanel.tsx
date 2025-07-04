import React, { useState, useCallback, useMemo } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { OptimizationConfig } from '../../types';
import styles from './ConfigurationPanel.module.css';

interface ConfigurationPanelProps {
  config: OptimizationConfig;
  onChange: (config: OptimizationConfig) => void;
  onOptimize: () => void;
  isOptimizing: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onChange,
  onOptimize,
  isOptimizing,
}) => {
  const {
    presets,
    selectedPresetId,
    selectPreset,
    clearPreset,
    createPreset,
    validateConfig,
    isPresetNameTaken,
  } = useConfig();

  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  // Loading state for preset operations
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);

  // Validate configuration on changes
  const handleConfigChange = useCallback(
    (updates: Partial<OptimizationConfig>) => {
      const newConfig = { ...config, ...updates };
      const validation = validateConfig(newConfig);

      // Update validation errors
      const errors: ValidationErrors = {};
      validation.errors.forEach(error => {
        // Map error messages to field names
        if (error.includes('Starting balance')) errors.startingBalance = error;
        else if (error.includes('Target ending balance'))
          errors.targetEndingBalance = error;
        else if (error.includes('Minimum balance'))
          errors.minimumBalance = error;
        else if (error.includes('Population size'))
          errors.populationSize = error;
        else if (error.includes('Generations')) errors.generations = error;
        else if (error.includes('Balance edit day'))
          errors.balanceEditDay = error;
      });
      setValidationErrors(errors);

      // Always update the config, let parent component handle validation
      onChange(newConfig);
    },
    [config, onChange, validateConfig]
  );

  // Handle preset selection
  const handlePresetSelect = useCallback(
    async (presetId: string) => {
      setIsLoadingPreset(true);
      setTimeout(() => {
        if (presetId === '') {
          // Custom configuration
          clearPreset();
        } else {
          const preset = presets.find(p => p.id === presetId);
          if (preset) {
            selectPreset(presetId);
            onChange({ ...config, ...preset.config });
          }
        }
        setIsLoadingPreset(false);
      }, 100); // Simulate async operation
    },
    [presets, selectPreset, clearPreset, onChange, config]
  );

  // Handle save as preset
  const handleSavePreset = useCallback(() => {
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
  }, [presetName, presetDescription, isPresetNameTaken, createPreset]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0 && !isOptimizing;
  }, [validationErrors, isOptimizing]);

  return (
    <div className={styles.panel}>
      {isLoadingPreset && (
        <div className={styles.loadingMessage}>Loading preset...</div>
      )}
      <h2 className={styles.title}>Optimization Configuration</h2>

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
          disabled={isOptimizing}
        >
          <option value="">Custom Configuration</option>
          {presets.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Financial Settings */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Financial Settings</h3>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="startingBalance">
            Starting Balance ($)
          </label>
          <input
            id="startingBalance"
            type="number"
            className={`${styles.input} ${validationErrors.startingBalance ? styles.inputError : ''}`}
            value={config.startingBalance}
            onChange={e =>
              handleConfigChange({
                startingBalance: parseFloat(e.target.value) || 0,
              })
            }
            disabled={isOptimizing}
            min="0"
            step="0.01"
          />
          {validationErrors.startingBalance && (
            <span className={styles.errorMessage}>
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
            className={`${styles.input} ${validationErrors.targetEndingBalance ? styles.inputError : ''}`}
            value={config.targetEndingBalance}
            onChange={e =>
              handleConfigChange({
                targetEndingBalance: parseFloat(e.target.value) || 0,
              })
            }
            disabled={isOptimizing}
            min="0"
            step="0.01"
          />
          {validationErrors.targetEndingBalance && (
            <span className={styles.errorMessage}>
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
            className={`${styles.input} ${validationErrors.minimumBalance ? styles.inputError : ''}`}
            value={config.minimumBalance}
            onChange={e =>
              handleConfigChange({
                minimumBalance: parseFloat(e.target.value) || 0,
              })
            }
            disabled={isOptimizing}
            min="0"
            step="0.01"
          />
          {validationErrors.minimumBalance && (
            <span className={styles.errorMessage}>
              {validationErrors.minimumBalance}
            </span>
          )}
        </div>
      </div>

      {/* Algorithm Settings */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Algorithm Settings</h3>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="populationSize">
            Population Size
          </label>
          <input
            id="populationSize"
            type="number"
            className={`${styles.input} ${validationErrors.populationSize ? styles.inputError : ''}`}
            value={config.populationSize}
            onChange={e =>
              handleConfigChange({
                populationSize: parseInt(e.target.value) || 50,
              })
            }
            disabled={isOptimizing}
            min="10"
            step="10"
          />
          {validationErrors.populationSize && (
            <span className={styles.errorMessage}>
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
            className={`${styles.input} ${validationErrors.generations ? styles.inputError : ''}`}
            value={config.generations}
            onChange={e =>
              handleConfigChange({
                generations: parseInt(e.target.value) || 100,
              })
            }
            disabled={isOptimizing}
            min="1"
            step="10"
          />
          {validationErrors.generations && (
            <span className={styles.errorMessage}>
              {validationErrors.generations}
            </span>
          )}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Advanced Settings</h3>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="balanceEditDay">
            Balance Edit Day (optional)
          </label>
          <input
            id="balanceEditDay"
            type="number"
            className={`${styles.input} ${validationErrors.balanceEditDay ? styles.inputError : ''}`}
            value={config.balanceEditDay || ''}
            onChange={e =>
              handleConfigChange({
                balanceEditDay: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              })
            }
            disabled={isOptimizing}
            min="1"
            max="30"
            placeholder="None"
          />
          {validationErrors.balanceEditDay && (
            <span className={styles.errorMessage}>
              {validationErrors.balanceEditDay}
            </span>
          )}
        </div>

        {config.balanceEditDay && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="newStartingBalance">
              New Starting Balance ($)
            </label>
            <input
              id="newStartingBalance"
              type="number"
              className={styles.input}
              value={config.newStartingBalance || ''}
              onChange={e =>
                handleConfigChange({
                  newStartingBalance: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={isOptimizing}
              min="0"
              step="0.01"
              placeholder="Current balance"
            />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={config.debugFitness || false}
              onChange={e =>
                handleConfigChange({ debugFitness: e.target.checked })
              }
              disabled={isOptimizing}
            />
            Enable Debug Fitness Logging
          </label>
        </div>
      </div>

      {/* Save as Preset */}
      {!showSavePreset && (
        <button
          className={styles.buttonSecondary}
          onClick={() => setShowSavePreset(true)}
          disabled={isOptimizing || Object.keys(validationErrors).length > 0}
        >
          Save as Preset
        </button>
      )}

      {showSavePreset && (
        <div className={styles.savePresetForm}>
          <h3 className={styles.sectionTitle}>Save Configuration as Preset</h3>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="presetName">
              Preset Name
            </label>
            <input
              id="presetName"
              type="text"
              className={`${styles.input} ${validationErrors.presetName ? styles.inputError : ''}`}
              value={presetName}
              onChange={e => {
                setPresetName(e.target.value);
                setValidationErrors(prev => {
                  const { presetName, ...rest } = prev;
                  return rest;
                });
              }}
              placeholder="e.g., Conservative Strategy"
              maxLength={50}
            />
            {validationErrors.presetName && (
              <span className={styles.errorMessage}>
                {validationErrors.presetName}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="presetDescription">
              Description (optional)
            </label>
            <textarea
              id="presetDescription"
              className={styles.textarea}
              value={presetDescription}
              onChange={e => setPresetDescription(e.target.value)}
              placeholder="Describe when to use this preset..."
              rows={3}
              maxLength={200}
            />
          </div>

          <div className={styles.buttonGroup}>
            <button className={styles.button} onClick={handleSavePreset}>
              Save Preset
            </button>
            <button
              className={styles.buttonSecondary}
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
          </div>
        </div>
      )}

      {/* Optimize Button */}
      <button
        className={`${styles.button} ${styles.optimizeButton}`}
        onClick={onOptimize}
        disabled={!isFormValid}
      >
        {isOptimizing ? (
          <>
            <span className={styles.spinner}></span>
            Optimizing...
          </>
        ) : (
          'Optimize Schedule'
        )}
      </button>
    </div>
  );
};
