import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  ConfigurationProvider,
  useConfiguration,
  DEFAULT_CONFIG,
  DEFAULT_PRESETS,
} from './ConfigurationContext';
import { OptimizationConfig } from '../types';

describe('ConfigurationContext', () => {
  // Helper to render hook with provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ConfigurationProvider>{children}</ConfigurationProvider>
  );

  describe('useConfiguration hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useConfiguration());
      }).toThrow(
        'useConfiguration must be used within a ConfigurationProvider'
      );

      consoleSpy.mockRestore();
    });

    it('should provide default configuration', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });

      expect(result.current.config).toEqual(DEFAULT_CONFIG);
      expect(result.current.presets).toEqual(DEFAULT_PRESETS);
      expect(result.current.selectedPresetId).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration with partial values', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });

      act(() => {
        result.current.updateConfig({
          startingBalance: 2000,
          targetEndingBalance: 5000,
        });
      });

      expect(result.current.config.startingBalance).toBe(2000);
      expect(result.current.config.targetEndingBalance).toBe(5000);
      expect(result.current.config.minimumBalance).toBe(
        DEFAULT_CONFIG.minimumBalance
      );
    });

    it('should validate and correct negative starting balance', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      act(() => {
        result.current.updateConfig({ startingBalance: -100 });
      });

      expect(result.current.config.startingBalance).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Starting balance cannot be negative'
      );

      consoleSpy.mockRestore();
    });

    it('should validate and correct negative minimum balance', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      act(() => {
        result.current.updateConfig({ minimumBalance: -50 });
      });

      expect(result.current.config.minimumBalance).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Minimum balance cannot be negative'
      );

      consoleSpy.mockRestore();
    });

    it('should adjust minimum balance if it exceeds starting balance', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      act(() => {
        result.current.updateConfig({
          startingBalance: 500,
          minimumBalance: 1000,
        });
      });

      expect(result.current.config.minimumBalance).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Minimum balance cannot exceed starting balance'
      );

      consoleSpy.mockRestore();
    });

    it('should validate population size constraints', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      act(() => {
        result.current.updateConfig({ populationSize: 5 });
      });

      expect(result.current.config.populationSize).toBe(10);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Population size must be at least 10'
      );

      consoleSpy.mockRestore();
    });

    it('should validate generations constraints', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      act(() => {
        result.current.updateConfig({ generations: 0 });
      });

      expect(result.current.config.generations).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith('Generations must be at least 1');

      consoleSpy.mockRestore();
    });

    it('should clear selected preset when config is manually updated', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });

      // First select a preset
      act(() => {
        result.current.selectPreset('conservative');
      });
      expect(result.current.selectedPresetId).toBe('conservative');

      // Then update config manually
      act(() => {
        result.current.updateConfig({ startingBalance: 3000 });
      });
      expect(result.current.selectedPresetId).toBeNull();
    });

    it('should handle manual constraints update', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });

      const constraints = {
        1: { shifts: 'large', fixedEarnings: 100 },
        5: { fixedBalance: 500 },
      };

      act(() => {
        result.current.updateConfig({ manualConstraints: constraints });
      });

      expect(result.current.config.manualConstraints).toEqual(constraints);
    });
  });

  describe('resetConfig', () => {
    it('should reset configuration to default values', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });

      // First modify the config
      act(() => {
        result.current.updateConfig({
          startingBalance: 5000,
          generations: 100,
        });
      });

      // Then reset
      act(() => {
        result.current.resetConfig();
      });

      expect(result.current.config).toEqual(DEFAULT_CONFIG);
      expect(result.current.selectedPresetId).toBeNull();
    });
  });

  describe('Preset Management', () => {
    describe('selectPreset', () => {
      it('should apply preset configuration', () => {
        const { result } = renderHook(() => useConfiguration(), { wrapper });

        act(() => {
          result.current.selectPreset('aggressive');
        });

        expect(result.current.selectedPresetId).toBe('aggressive');
        expect(result.current.config.minimumBalance).toBe(50);
        expect(result.current.config.populationSize).toBe(150);
        expect(result.current.config.generations).toBe(100);
      });

      it('should warn if preset not found', () => {
        const { result } = renderHook(() => useConfiguration(), { wrapper });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        act(() => {
          result.current.selectPreset('non-existent');
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          'Preset with id non-existent not found'
        );
        expect(result.current.selectedPresetId).toBeNull();

        consoleSpy.mockRestore();
      });
    });

    describe('saveAsPreset', () => {
      it('should create new preset with current config', () => {
        const { result } = renderHook(() => useConfiguration(), { wrapper });

        // Modify config first
        act(() => {
          result.current.updateConfig({
            startingBalance: 3000,
            minimumBalance: 300,
          });
        });

        // Save as preset
        act(() => {
          result.current.saveAsPreset(
            'Custom Preset',
            'My custom configuration'
          );
        });

        const customPreset = result.current.presets.find(
          p => p.name === 'Custom Preset'
        );
        expect(customPreset).toBeDefined();
        expect(customPreset?.description).toBe('My custom configuration');
        expect(customPreset?.config.startingBalance).toBe(3000);
        expect(customPreset?.config.minimumBalance).toBe(300);
        expect(customPreset?.isDefault).toBe(false);
      });

      it('should generate unique preset ID', () => {
        const { result } = renderHook(() => useConfiguration(), { wrapper });

        act(() => {
          result.current.saveAsPreset('Preset 1', 'First preset');
          result.current.saveAsPreset('Preset 2', 'Second preset');
        });

        const presets = result.current.presets.filter(p => !p.isDefault);
        expect(presets).toHaveLength(2);
        expect(presets[0].id).not.toBe(presets[1].id);
      });
    });

    describe('deletePreset', () => {
      it('should delete custom preset', () => {
        const { result } = renderHook(() => useConfiguration(), { wrapper });

        // Create a custom preset
        act(() => {
          result.current.saveAsPreset('To Delete', 'Will be deleted');
        });

        const presetToDelete = result.current.presets.find(
          p => p.name === 'To Delete'
        );
        expect(presetToDelete).toBeDefined();

        // Delete it
        act(() => {
          result.current.deletePreset(presetToDelete!.id);
        });

        expect(
          result.current.presets.find(p => p.name === 'To Delete')
        ).toBeUndefined();
      });

      it('should not delete default presets', () => {
        const { result } = renderHook(() => useConfiguration(), { wrapper });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const initialPresetCount = result.current.presets.length;

        act(() => {
          result.current.deletePreset('conservative');
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          'Cannot delete default presets'
        );
        expect(result.current.presets).toHaveLength(initialPresetCount);

        consoleSpy.mockRestore();
      });

      it('should clear selection if selected preset is deleted', () => {
        const { result } = renderHook(() => useConfiguration(), { wrapper });

        // Create and select a preset
        act(() => {
          result.current.saveAsPreset('Temporary', 'Will be deleted');
        });

        const tempPreset = result.current.presets.find(
          p => p.name === 'Temporary'
        );

        act(() => {
          result.current.selectPreset(tempPreset!.id);
        });
        expect(result.current.selectedPresetId).toBe(tempPreset!.id);

        // Delete the selected preset
        act(() => {
          result.current.deletePreset(tempPreset!.id);
        });

        expect(result.current.selectedPresetId).toBeNull();
      });
    });
  });

  describe('setBalanceEdit', () => {
    it('should set balance edit day and new balance', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });

      act(() => {
        result.current.setBalanceEdit(15, 2500);
      });

      expect(result.current.config.balanceEditDay).toBe(15);
      expect(result.current.config.newStartingBalance).toBe(2500);
    });

    it('should clear balance edit when day is null', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });

      // First set balance edit
      act(() => {
        result.current.setBalanceEdit(10, 1500);
      });

      // Then clear it
      act(() => {
        result.current.setBalanceEdit(null);
      });

      expect(result.current.config.balanceEditDay).toBeUndefined();
      expect(result.current.config.newStartingBalance).toBeUndefined();
    });

    it('should set balance edit day without new balance', () => {
      const { result } = renderHook(() => useConfiguration(), { wrapper });

      act(() => {
        result.current.setBalanceEdit(20);
      });

      expect(result.current.config.balanceEditDay).toBe(20);
      expect(result.current.config.newStartingBalance).toBeUndefined();
    });
  });

  describe('Provider with initial values', () => {
    it('should accept initial configuration', () => {
      const initialConfig: Partial<OptimizationConfig> = {
        startingBalance: 5000,
        targetEndingBalance: 10000,
        generations: 75,
      };

      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <ConfigurationProvider initialConfig={initialConfig}>
          {children}
        </ConfigurationProvider>
      );

      const { result } = renderHook(() => useConfiguration(), {
        wrapper: customWrapper,
      });

      expect(result.current.config.startingBalance).toBe(5000);
      expect(result.current.config.targetEndingBalance).toBe(10000);
      expect(result.current.config.generations).toBe(75);
      expect(result.current.config.minimumBalance).toBe(
        DEFAULT_CONFIG.minimumBalance
      );
    });

    it('should accept initial presets', () => {
      const customPresets = [
        {
          id: 'custom1',
          name: 'Custom 1',
          description: 'First custom preset',
          config: { minimumBalance: 250 },
          isDefault: false,
        },
      ];

      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <ConfigurationProvider initialPresets={customPresets}>
          {children}
        </ConfigurationProvider>
      );

      const { result } = renderHook(() => useConfiguration(), {
        wrapper: customWrapper,
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].name).toBe('Custom 1');
    });
  });
});
