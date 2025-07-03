import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import {
  PersistenceState,
  PersistenceActions,
  PersistenceContextValue,
  StoredAppData,
} from './types';
import { storage, fileUtils } from '../utils/storage';
import { logger } from '../utils/logger';
import { useScheduleContext } from './ScheduleContext';
import { useConfigurationContext } from './ConfigurationContext';
import { getDefaultData } from '../utils/sampleData';

/**
 * Action types for the persistence reducer
 */
type PersistenceActionType =
  | { type: 'SET_AUTO_SAVE_ENABLED'; payload: boolean }
  | { type: 'SET_AUTO_SAVE_INTERVAL'; payload: number }
  | { type: 'SET_LAST_SAVE_TIME'; payload: Date | null }
  | { type: 'SET_HAS_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'SET_IS_RESTORING'; payload: boolean }
  | { type: 'SET_DATA_VERSION'; payload: string };

/**
 * Initial state for the persistence context
 */
const initialState: PersistenceState = {
  autoSaveEnabled: true,
  autoSaveInterval: 30, // 30 seconds default
  lastSaveTime: null,
  hasUnsavedChanges: false,
  isRestoring: false,
  dataVersion: '1.0.0',
};

/**
 * Persistence reducer to handle state updates
 */
function persistenceReducer(
  state: PersistenceState,
  action: PersistenceActionType
): PersistenceState {
  switch (action.type) {
    case 'SET_AUTO_SAVE_ENABLED':
      return { ...state, autoSaveEnabled: action.payload };

    case 'SET_AUTO_SAVE_INTERVAL':
      return { ...state, autoSaveInterval: action.payload };

    case 'SET_LAST_SAVE_TIME':
      return { ...state, lastSaveTime: action.payload };

    case 'SET_HAS_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload };

    case 'SET_IS_RESTORING':
      return { ...state, isRestoring: action.payload };

    case 'SET_DATA_VERSION':
      return { ...state, dataVersion: action.payload };

    default:
      return state;
  }
}

/**
 * Persistence context
 */
const PersistenceContext = createContext<PersistenceContextValue | undefined>(
  undefined
);

/**
 * Persistence context provider props
 */
interface PersistenceProviderProps {
  children: ReactNode;
}

/**
 * Persistence context provider component
 */
export function PersistenceProvider({ children }: PersistenceProviderProps) {
  const [state, dispatch] = useReducer(persistenceReducer, initialState);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastChangeRef = useRef<number>(Date.now());

  // Get other contexts - we'll need these for save/load operations
  // Note: These contexts must be wrapped around PersistenceProvider in the app
  const scheduleContext = useScheduleContext();
  const configContext = useConfigurationContext();

  // Mark as changed whenever relevant data changes
  useEffect(() => {
    const currentTime = Date.now();
    // Only mark as changed if it's been more than 100ms since last change
    // This debounces rapid changes
    if (currentTime - lastChangeRef.current > 100) {
      dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: true });
      lastChangeRef.current = currentTime;
    }
  }, [
    scheduleContext.currentSchedule,
    scheduleContext.edits,
    scheduleContext.shiftTypes,
    scheduleContext.expenses,
    scheduleContext.deposits,
    configContext.config,
    configContext.presets,
    configContext.selectedPresetId,
  ]);

  // Save to localStorage
  const saveToLocalStorage = useCallback(async (): Promise<void> => {
    try {
      logger.info('Persistence', 'Saving to localStorage...');

      const data: StoredAppData = {
        version: state.dataVersion,
        timestamp: new Date().toISOString(),
        schedule: {
          currentSchedule: scheduleContext.currentSchedule,
          edits: scheduleContext.edits,
          shiftTypes: scheduleContext.shiftTypes,
          expenses: scheduleContext.expenses,
          deposits: scheduleContext.deposits,
        },
        configuration: {
          config: configContext.config,
          presets: configContext.presets,
          selectedPresetId: configContext.selectedPresetId,
        },
        ui: {
          viewMode: 'table', // Default values for now
          showWeekends: true,
          highlightViolations: true,
        },
      };

      await storage.save(data);

      dispatch({ type: 'SET_LAST_SAVE_TIME', payload: new Date() });
      dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: false });

      logger.info('Persistence', 'Data saved successfully');
    } catch (error) {
      logger.error('Persistence', 'Failed to save data', error as Error);
      throw error;
    }
  }, [state.dataVersion, scheduleContext, configContext]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_IS_RESTORING', payload: true });
      logger.info('Persistence', 'Loading from localStorage...');

      const data = await storage.load();

      if (data) {
        // Restore schedule data
        if (data.schedule) {
          const defaultData = getDefaultData();

          scheduleContext.setCurrentSchedule(
            data.schedule.currentSchedule || []
          );
          scheduleContext.updateShiftTypes(
            data.schedule.shiftTypes || defaultData.shiftTypes
          );
          // Ensure expenses are always populated (fallback for existing users)
          const expenses =
            data.schedule.expenses && data.schedule.expenses.length > 0
              ? data.schedule.expenses
              : defaultData.expenses;
          const deposits =
            data.schedule.deposits && data.schedule.deposits.length > 0
              ? data.schedule.deposits
              : defaultData.deposits;

          scheduleContext.setExpenses(expenses);
          scheduleContext.setDeposits(deposits);

          // Apply edits if any
          if (data.schedule.edits && data.schedule.edits.length > 0) {
            data.schedule.edits.forEach(edit => scheduleContext.addEdit(edit));
          }
        }

        // Restore configuration data
        if (data.configuration) {
          configContext.updateConfig(data.configuration.config || {});
          if (data.configuration.selectedPresetId) {
            configContext.selectPreset(data.configuration.selectedPresetId);
          }
        }

        dispatch({
          type: 'SET_LAST_SAVE_TIME',
          payload: new Date(data.timestamp),
        });
        dispatch({ type: 'SET_DATA_VERSION', payload: data.version });
        dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: false });

        logger.info('Persistence', 'Data loaded successfully', {
          version: data.version,
          timestamp: data.timestamp,
        });
      } else {
        logger.info(
          'Persistence',
          'No saved data found - loading default data'
        );

        // Load default sample data when no saved data exists
        const defaultData = getDefaultData();
        scheduleContext.setExpenses(defaultData.expenses);
        scheduleContext.setDeposits(defaultData.deposits);
        scheduleContext.updateShiftTypes(defaultData.shiftTypes);
      }
    } catch (error) {
      logger.error('Persistence', 'Failed to load data', error as Error);
      throw error;
    } finally {
      dispatch({ type: 'SET_IS_RESTORING', payload: false });
    }
  }, [scheduleContext, configContext]);

  // Clear localStorage
  const clearLocalStorage = useCallback(async (): Promise<void> => {
    try {
      logger.info('Persistence', 'Clearing localStorage...');
      await storage.clear();
      dispatch({ type: 'SET_LAST_SAVE_TIME', payload: null });
      dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: false });
      logger.info('Persistence', 'Storage cleared');
    } catch (error) {
      logger.error('Persistence', 'Failed to clear storage', error as Error);
      throw error;
    }
  }, []);

  // Export data
  const exportData = useCallback(async (): Promise<string> => {
    try {
      logger.info('Persistence', 'Exporting data...');

      const data: StoredAppData = {
        version: state.dataVersion,
        timestamp: new Date().toISOString(),
        schedule: {
          currentSchedule: scheduleContext.currentSchedule,
          edits: scheduleContext.edits,
          shiftTypes: scheduleContext.shiftTypes,
          expenses: scheduleContext.expenses,
          deposits: scheduleContext.deposits,
        },
        configuration: {
          config: configContext.config,
          presets: configContext.presets,
          selectedPresetId: configContext.selectedPresetId,
        },
        ui: {
          viewMode: 'table',
          showWeekends: true,
          highlightViolations: true,
        },
      };

      const exportString = await storage.export(data);

      // Download the file
      const filename = `financial-schedule-${new Date().toISOString().split('T')[0]}.json`;
      fileUtils.download(exportString, filename);

      logger.info('Persistence', 'Data exported successfully');
      return exportString;
    } catch (error) {
      logger.error('Persistence', 'Failed to export data', error as Error);
      throw error;
    }
  }, [state.dataVersion, scheduleContext, configContext]);

  // Import data
  const importData = useCallback(
    async (jsonString: string): Promise<void> => {
      try {
        dispatch({ type: 'SET_IS_RESTORING', payload: true });
        logger.info('Persistence', 'Importing data...');

        const data = await storage.import(jsonString);

        // Restore schedule data
        if (data.schedule) {
          scheduleContext.setCurrentSchedule(
            data.schedule.currentSchedule || []
          );
          scheduleContext.updateShiftTypes(
            data.schedule.shiftTypes || {
              large: { gross: 250, net: 175 },
              medium: { gross: 200, net: 140 },
              small: { gross: 150, net: 105 },
            }
          );
          scheduleContext.setExpenses(data.schedule.expenses || []);
          scheduleContext.setDeposits(data.schedule.deposits || []);

          // Clear existing edits before applying imported ones
          scheduleContext.clearEdits();
          if (data.schedule.edits && data.schedule.edits.length > 0) {
            data.schedule.edits.forEach(edit => scheduleContext.addEdit(edit));
          }
        }

        // Restore configuration data
        if (data.configuration) {
          configContext.updateConfig(data.configuration.config || {});
          if (data.configuration.selectedPresetId) {
            configContext.selectPreset(data.configuration.selectedPresetId);
          }
        }

        dispatch({ type: 'SET_DATA_VERSION', payload: data.version });
        dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: false });

        // Save the imported data to localStorage
        await saveToLocalStorage();

        logger.info('Persistence', 'Data imported successfully');
      } catch (error) {
        logger.error('Persistence', 'Failed to import data', error as Error);
        throw error;
      } finally {
        dispatch({ type: 'SET_IS_RESTORING', payload: false });
      }
    },
    [scheduleContext, configContext, saveToLocalStorage]
  );

  // Toggle auto-save
  const toggleAutoSave = useCallback(() => {
    dispatch({
      type: 'SET_AUTO_SAVE_ENABLED',
      payload: !state.autoSaveEnabled,
    });
  }, [state.autoSaveEnabled]);

  // Set auto-save interval
  const setAutoSaveInterval = useCallback((seconds: number) => {
    if (seconds < 10) {
      logger.warn(
        'Persistence',
        'Auto-save interval too short, using minimum of 10 seconds'
      );
      seconds = 10;
    }
    dispatch({ type: 'SET_AUTO_SAVE_INTERVAL', payload: seconds });
  }, []);

  // Mark as changed
  const markAsChanged = useCallback(() => {
    dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: true });
  }, []);

  // Mark as saved
  const markAsSaved = useCallback(() => {
    dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: false });
    dispatch({ type: 'SET_LAST_SAVE_TIME', payload: new Date() });
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (state.autoSaveEnabled && state.hasUnsavedChanges) {
      // Clear existing interval
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }

      // Set up new interval
      autoSaveIntervalRef.current = setInterval(() => {
        if (state.hasUnsavedChanges) {
          saveToLocalStorage().catch(error => {
            logger.error('Persistence', 'Auto-save failed', error as Error);
          });
        }
      }, state.autoSaveInterval * 1000);

      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
        }
      };
    }
  }, [
    state.autoSaveEnabled,
    state.autoSaveInterval,
    state.hasUnsavedChanges,
    saveToLocalStorage,
  ]);

  // Load data on mount
  useEffect(() => {
    loadFromLocalStorage().catch(error => {
      logger.error(
        'Persistence',
        'Failed to load data on mount',
        error as Error
      );
    });
  }, []);

  // Save on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (state.hasUnsavedChanges) {
        // Note: This is synchronous, so it might not complete if the page closes too quickly
        saveToLocalStorage().catch(error => {
          logger.error(
            'Persistence',
            'Failed to save on unmount',
            error as Error
          );
        });
      }
    };
  }, [state.hasUnsavedChanges, saveToLocalStorage]);

  const actions: PersistenceActions = {
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    exportData,
    importData,
    toggleAutoSave,
    setAutoSaveInterval,
    markAsChanged,
    markAsSaved,
  };

  const value: PersistenceContextValue = {
    ...state,
    ...actions,
  };

  return (
    <PersistenceContext.Provider value={value}>
      {children}
    </PersistenceContext.Provider>
  );
}

/**
 * Custom hook to use the persistence context
 */
export function usePersistenceContext(): PersistenceContextValue {
  const context = useContext(PersistenceContext);
  if (!context) {
    throw new Error(
      'usePersistenceContext must be used within a PersistenceProvider'
    );
  }
  return context;
}

/**
 * Alias for backward compatibility
 */
export const usePersistence = usePersistenceContext;
