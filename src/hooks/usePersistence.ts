import { useCallback, useRef, useState } from 'react';
import { usePersistenceContext } from '../context/PersistenceContext';
import { fileUtils } from '../utils/storage';
import { logger } from '../utils/logger';

export interface UsePersistenceReturn {
  // State
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  lastSaveTime: Date | null;
  hasUnsavedChanges: boolean;
  isRestoring: boolean;
  isSaving: boolean;
  isImporting: boolean;
  isExporting: boolean;

  // High-level operations
  save: () => Promise<void>;
  load: () => Promise<void>;
  clear: () => Promise<void>;
  exportToFile: () => Promise<void>;
  importFromFile: (file: File) => Promise<void>;

  // Auto-save management
  toggleAutoSave: () => void;
  setAutoSaveInterval: (seconds: number) => void;

  // Migration status
  dataVersion: string;
  isMigrationNeeded: boolean;
}

/**
 * Custom hook that provides high-level persistence operations
 * with loading states and error handling
 */
export function usePersistence(): UsePersistenceReturn {
  const persistenceContext = usePersistenceContext();
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Note: fileInputRef removed as it's not used in this hook

  // Save with loading state
  const save = useCallback(async () => {
    if (isSaving) {
      logger.warn('Persistence', 'Save already in progress');
      return;
    }

    try {
      setIsSaving(true);
      await persistenceContext.saveToLocalStorage();
      logger.info('Persistence', 'Data saved successfully');
    } catch (error) {
      logger.error('Persistence', 'Failed to save data', error as Error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, persistenceContext]);

  // Load with loading state (already handled by isRestoring in context)
  const load = useCallback(async () => {
    try {
      await persistenceContext.loadFromLocalStorage();
      logger.info('Persistence', 'Data loaded successfully');
    } catch (error) {
      logger.error('Persistence', 'Failed to load data', error as Error);
      throw error;
    }
  }, [persistenceContext]);

  // Clear storage
  const clear = useCallback(async () => {
    try {
      const confirmed = window.confirm(
        'Are you sure you want to clear all saved data? This action cannot be undone.'
      );

      if (!confirmed) {
        return;
      }

      await persistenceContext.clearLocalStorage();
      logger.info('Persistence', 'Storage cleared successfully');
    } catch (error) {
      logger.error('Persistence', 'Failed to clear storage', error as Error);
      throw error;
    }
  }, [persistenceContext]);

  // Export to file with loading state
  const exportToFile = useCallback(async () => {
    if (isExporting) {
      logger.warn('Persistence', 'Export already in progress');
      return;
    }

    try {
      setIsExporting(true);
      await persistenceContext.exportData();
      logger.info('Persistence', 'Data exported successfully');
    } catch (error) {
      logger.error('Persistence', 'Failed to export data', error as Error);
      alert('Failed to export data. Please try again.');
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, persistenceContext]);

  // Import from file with validation and loading state
  const importFromFile = useCallback(
    async (file: File) => {
      if (isImporting) {
        logger.warn('Persistence', 'Import already in progress');
        return;
      }

      try {
        setIsImporting(true);

        // Validate file type
        if (!file.name.endsWith('.json')) {
          throw new Error('Invalid file type. Please select a JSON file.');
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error('File too large. Maximum size is 10MB.');
        }

        // Read file content
        const content = await fileUtils.readFile(file);

        // Import data
        await persistenceContext.importData(content);

        logger.info('Persistence', 'Data imported successfully', {
          fileName: file.name,
          fileSize: file.size,
        });

        alert('Data imported successfully!');
      } catch (error) {
        logger.error('Persistence', 'Failed to import data', error as Error);
        alert(
          `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      } finally {
        setIsImporting(false);
      }
    },
    [isImporting, persistenceContext]
  );

  // Check if migration is needed (placeholder for future use)
  const isMigrationNeeded = false;

  return {
    // State
    autoSaveEnabled: persistenceContext.autoSaveEnabled,
    autoSaveInterval: persistenceContext.autoSaveInterval,
    lastSaveTime: persistenceContext.lastSaveTime,
    hasUnsavedChanges: persistenceContext.hasUnsavedChanges,
    isRestoring: persistenceContext.isRestoring,
    isSaving,
    isImporting,
    isExporting,

    // Operations
    save,
    load,
    clear,
    exportToFile,
    importFromFile,

    // Auto-save management
    toggleAutoSave: persistenceContext.toggleAutoSave,
    setAutoSaveInterval: persistenceContext.setAutoSaveInterval,

    // Migration status
    dataVersion: persistenceContext.dataVersion,
    isMigrationNeeded,
  };
}

/**
 * Hook for creating a file input element for importing data
 */
export function useFileImport(onFileSelect: (file: File) => void) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerFileInput = useCallback(() => {
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';

      input.addEventListener('change', event => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          onFileSelect(file);
        }
        // Reset the input so the same file can be selected again
        input.value = '';
      });

      document.body.appendChild(input);
      fileInputRef.current = input;
    }

    fileInputRef.current.click();
  }, [onFileSelect]);

  return triggerFileInput;
}
