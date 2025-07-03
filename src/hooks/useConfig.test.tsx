import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useConfig } from './useConfig';
import { ConfigurationProvider } from '../context/ConfigurationContext';
import { OptimizationConfig } from '../types';

describe('useConfig hook', () => {
  // Helper to render hook with provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ConfigurationProvider>{children}</ConfigurationProvider>
  );

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      const validConfig: Partial<OptimizationConfig> = {
        startingBalance: 1000,
        targetEndingBalance: 2000,
        minimumBalance: 100,
        populationSize: 50,
        generations: 30,
      };

      const validation = result.current.validateConfig(validConfig);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect negative balances', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      const validation = result.current.validateConfig({
        startingBalance: -100,
        targetEndingBalance: -500,
        minimumBalance: -50,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Starting balance must be non-negative'
      );
      expect(validation.errors).toContain(
        'Target ending balance must be non-negative'
      );
      expect(validation.errors).toContain(
        'Minimum balance must be non-negative'
      );
    });

    it('should detect minimum balance exceeding starting balance', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      const validation = result.current.validateConfig({
        startingBalance: 500,
        minimumBalance: 1000,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Minimum balance cannot exceed starting balance'
      );
    });

    it('should validate population size bounds', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      const tooSmall = result.current.validateConfig({ populationSize: 5 });
      expect(tooSmall.isValid).toBe(false);
      expect(tooSmall.errors).toContain('Population size must be at least 10');

      const tooLarge = result.current.validateConfig({ populationSize: 1500 });
      expect(tooLarge.isValid).toBe(false);
      expect(tooLarge.errors).toContain(
        'Population size should not exceed 1000 for performance reasons'
      );
    });

    it('should validate generations bounds', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      const tooSmall = result.current.validateConfig({ generations: 0 });
      expect(tooSmall.isValid).toBe(false);
      expect(tooSmall.errors).toContain('Generations must be at least 1');

      const tooLarge = result.current.validateConfig({ generations: 600 });
      expect(tooLarge.isValid).toBe(false);
      expect(tooLarge.errors).toContain(
        'Generations should not exceed 500 for performance reasons'
      );
    });

    it('should validate balance edit day', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      const tooSmall = result.current.validateConfig({ balanceEditDay: 0 });
      expect(tooSmall.isValid).toBe(false);
      expect(tooSmall.errors).toContain(
        'Balance edit day must be between 1 and 30'
      );

      const tooLarge = result.current.validateConfig({ balanceEditDay: 31 });
      expect(tooLarge.isValid).toBe(false);
      expect(tooLarge.errors).toContain(
        'Balance edit day must be between 1 and 30'
      );

      const valid = result.current.validateConfig({ balanceEditDay: 15 });
      expect(valid.isValid).toBe(true);
    });
  });

  describe('safeUpdateConfig', () => {
    it('should update config when valid', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      let success: boolean;
      act(() => {
        success = result.current.safeUpdateConfig({
          startingBalance: 2000,
          targetEndingBalance: 4000,
        });
      });

      expect(success!).toBe(true);
      expect(result.current.config.startingBalance).toBe(2000);
      expect(result.current.config.targetEndingBalance).toBe(4000);
    });

    it('should reject invalid updates', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      let success: boolean;
      act(() => {
        success = result.current.safeUpdateConfig({
          populationSize: 5,
          generations: -1,
        });
      });

      expect(success!).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.config.populationSize).not.toBe(5);

      consoleSpy.mockRestore();
    });
  });

  describe('compareConfigs', () => {
    it('should identify differences in primitive fields', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      const configA: OptimizationConfig = {
        startingBalance: 1000,
        targetEndingBalance: 2000,
        minimumBalance: 100,
        populationSize: 50,
        generations: 30,
        manualConstraints: {},
      };

      const configB: OptimizationConfig = {
        ...configA,
        startingBalance: 1500,
        generations: 50,
      };

      const differences = result.current.compareConfigs(configA, configB);
      expect(differences).toEqual({
        startingBalance: 1500,
        generations: 50,
      });
    });

    it('should identify differences in manual constraints', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      const configA: OptimizationConfig = {
        startingBalance: 1000,
        targetEndingBalance: 2000,
        minimumBalance: 100,
        populationSize: 50,
        generations: 30,
        manualConstraints: { 1: { shifts: 'large' } },
      };

      const configB: OptimizationConfig = {
        ...configA,
        manualConstraints: {
          1: { shifts: 'medium' },
          2: { fixedBalance: 500 },
        },
      };

      const differences = result.current.compareConfigs(configA, configB);
      expect(differences.manualConstraints).toEqual(configB.manualConstraints);
    });

    it('should return empty object when configs are identical', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      const config: OptimizationConfig = {
        startingBalance: 1000,
        targetEndingBalance: 2000,
        minimumBalance: 100,
        populationSize: 50,
        generations: 30,
        manualConstraints: {},
      };

      const differences = result.current.compareConfigs(config, { ...config });
      expect(differences).toEqual({});
    });
  });

  describe('Preset utilities', () => {
    describe('findMatchingPresets', () => {
      it('should find presets matching current config', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        // Select a preset first
        act(() => {
          result.current.selectPreset('conservative');
        });

        const matching = result.current.findMatchingPresets();
        expect(matching).toContain('conservative');
      });

      it('should return empty array when no presets match', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        // Update to a unique configuration
        act(() => {
          result.current.updateConfig({
            populationSize: 123,
            generations: 456,
          });
        });

        const matching = result.current.findMatchingPresets();
        expect(matching).toHaveLength(0);
      });
    });

    describe('getPresetById', () => {
      it('should return preset by ID', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        const preset = result.current.getPresetById('aggressive');
        expect(preset?.name).toBe('Aggressive');
        expect(preset?.config.minimumBalance).toBe(50);
      });

      it('should return undefined for non-existent ID', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        const preset = result.current.getPresetById('non-existent');
        expect(preset).toBeUndefined();
      });
    });

    describe('isPresetNameTaken', () => {
      it('should detect taken preset names', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        expect(result.current.isPresetNameTaken('Conservative')).toBe(true);
        expect(result.current.isPresetNameTaken('conservative')).toBe(true); // Case insensitive
        expect(result.current.isPresetNameTaken('New Preset')).toBe(false);
      });
    });

    describe('createPreset', () => {
      it('should create preset with validation', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        let success: boolean;
        act(() => {
          success = result.current.createPreset(
            'Valid Preset',
            'A valid preset'
          );
        });

        expect(success!).toBe(true);
        expect(
          result.current.presets.some(p => p.name === 'Valid Preset')
        ).toBe(true);
      });

      it('should reject empty preset name', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        let success: boolean;
        act(() => {
          success = result.current.createPreset('', 'No name');
        });

        expect(success!).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Preset name cannot be empty');

        consoleSpy.mockRestore();
      });

      it('should reject duplicate preset name', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        let success: boolean;
        act(() => {
          success = result.current.createPreset('Conservative', 'Duplicate');
        });

        expect(success!).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          'A preset with this name already exists'
        );

        consoleSpy.mockRestore();
      });

      it('should trim preset name and description', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        act(() => {
          result.current.createPreset(
            '  Trimmed Name  ',
            '  Trimmed Description  '
          );
        });

        const preset = result.current.presets.find(
          p => p.name === 'Trimmed Name'
        );
        expect(preset).toBeDefined();
        expect(preset?.description).toBe('Trimmed Description');
      });
    });
  });

  describe('Import/Export', () => {
    describe('exportConfig', () => {
      it('should export configuration as JSON', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        // Create a custom preset
        act(() => {
          result.current.createPreset('Export Test', 'For export');
        });

        const exported = result.current.exportConfig();
        const parsed = JSON.parse(exported);

        expect(parsed.config).toEqual(result.current.config);
        expect(parsed.presets).toHaveLength(1); // Only custom presets
        expect(parsed.presets[0].name).toBe('Export Test');
        expect(parsed.exportDate).toBeDefined();
      });

      it('should exclude default presets from export', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        const exported = result.current.exportConfig();
        const parsed = JSON.parse(exported);

        expect(parsed.presets).toHaveLength(0);
      });
    });

    describe('importConfig', () => {
      it('should import valid configuration', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });

        const toImport = {
          config: {
            startingBalance: 3000,
            targetEndingBalance: 6000,
            minimumBalance: 300,
            populationSize: 75,
            generations: 40,
            manualConstraints: {},
          },
          presets: [
            {
              id: 'imported',
              name: 'Imported Preset',
              description: 'From import',
              config: { minimumBalance: 400 },
              isDefault: false,
            },
          ],
        };

        let success: boolean;
        act(() => {
          success = result.current.importConfig(JSON.stringify(toImport));
        });

        expect(success!).toBe(true);
        expect(result.current.config.startingBalance).toBe(3000);
        expect(
          result.current.presets.some(p => p.name === 'Imported Preset')
        ).toBe(true);
      });

      it('should reject invalid JSON', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        let success: boolean;
        act(() => {
          success = result.current.importConfig('invalid json');
        });

        expect(success!).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should reject invalid configuration format', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        let success: boolean;
        act(() => {
          success = result.current.importConfig(
            JSON.stringify({ invalid: 'format' })
          );
        });

        expect(success!).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid configuration format');

        consoleSpy.mockRestore();
      });

      it('should reject configuration with validation errors', () => {
        const { result } = renderHook(() => useConfig(), { wrapper });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const toImport = {
          config: {
            startingBalance: -1000,
            populationSize: 5,
          },
        };

        let success: boolean;
        act(() => {
          success = result.current.importConfig(JSON.stringify(toImport));
        });

        expect(success!).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Computed values', () => {
    it('should compute hasUnsavedChanges', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      // Initially no preset selected
      expect(result.current.hasUnsavedChanges).toBe(true);

      // Select a preset
      act(() => {
        result.current.selectPreset('conservative');
      });
      expect(result.current.hasUnsavedChanges).toBe(false);

      // Modify config
      act(() => {
        result.current.updateConfig({ startingBalance: 5000 });
      });
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should compute isUsingPreset', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      expect(result.current.isUsingPreset).toBe(false);

      act(() => {
        result.current.selectPreset('balanced');
      });
      expect(result.current.isUsingPreset).toBe(true);
    });

    it('should compute currentPreset', () => {
      const { result } = renderHook(() => useConfig(), { wrapper });

      expect(result.current.currentPreset).toBeUndefined();

      act(() => {
        result.current.selectPreset('aggressive');
      });
      expect(result.current.currentPreset?.name).toBe('Aggressive');
    });
  });
});
