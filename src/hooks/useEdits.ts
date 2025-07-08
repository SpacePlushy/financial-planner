import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Edit } from '../types';
import { useScheduleContext } from '../context/ScheduleContext';
import { logger } from '../utils/logger';

// Disable logging in test environment
const log =
  process.env.NODE_ENV === 'test'
    ? {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      }
    : logger;

/**
 * Edit history entry for undo/redo functionality
 */
interface EditHistoryEntry {
  action: 'add' | 'remove' | 'update' | 'batch' | 'clear';
  edits: Edit[];
  timestamp: number;
}

/**
 * Batch edit operation
 */
export interface BatchEditOperation {
  type: 'add' | 'remove' | 'update';
  edits: Edit[];
}

/**
 * Edit statistics
 */
export interface EditStatistics {
  totalEdits: number;
  editsByField: Record<Edit['field'], number>;
  mostEditedDays: Array<{ day: number; count: number }>;
  lastEditTime: Date | null;
}

/**
 * Edit validation result
 */
export interface EditValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Edit session data for persistence
 */
export interface EditSession {
  edits: Edit[];
  history: EditHistoryEntry[];
  historyIndex: number;
  timestamp: string;
  version: string;
}

/**
 * Custom hook for managing edits with advanced features
 */
export function useEdits() {
  const {
    edits,
    addEdit: contextAddEdit,
    removeEdit: contextRemoveEdit,
    clearEdits: contextClearEdits,
    currentSchedule,
  } = useScheduleContext();

  // History management
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const lastSavedEdits = useRef<Edit[]>([]);

  // Initialize lastSavedEdits on mount
  useEffect(() => {
    lastSavedEdits.current = [...edits];
  }, [edits]);

  /**
   * Validate an edit
   */
  const validateEdit = useCallback(
    (edit: Edit): EditValidationResult => {
      const errors: string[] = [];

      // Check if day exists in schedule
      const dayExists = currentSchedule.some(d => d.day === edit.day);
      if (!dayExists) {
        errors.push(`Day ${edit.day} does not exist in the schedule`);
      }

      // Validate field-specific rules
      switch (edit.field) {
        case 'earnings':
        case 'expenses':
        case 'balance':
          const numValue = Number(edit.newValue);
          if (isNaN(numValue)) {
            errors.push(`${edit.field} must be a valid number`);
          }
          if (edit.field !== 'balance' && numValue < 0) {
            errors.push(`${edit.field} cannot be negative`);
          }
          break;
        case 'notes':
          if (typeof edit.newValue !== 'string') {
            errors.push('Notes must be a string');
          }
          if (String(edit.newValue).length > 500) {
            errors.push('Notes cannot exceed 500 characters');
          }
          break;
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
    [currentSchedule]
  );

  /**
   * Add edit to history
   */
  const addToHistory = useCallback(
    (entry: EditHistoryEntry) => {
      let shouldDecrementIndex = false;

      setHistory(prev => {
        // Remove any history after current index
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(entry);

        // Limit history size to prevent memory issues
        if (newHistory.length > 50) {
          newHistory.shift();
          shouldDecrementIndex = true;
        }

        return newHistory;
      });

      // Update index after state update
      if (shouldDecrementIndex) {
        setHistoryIndex(Math.min(historyIndex, 48));
      } else {
        setHistoryIndex(historyIndex + 1);
      }
    },
    [historyIndex]
  );

  /**
   * Add edit with validation
   */
  const addEdit = useCallback(
    (edit: Edit) => {
      const validation = validateEdit(edit);

      if (!validation.isValid) {
        log.warn('useEdits', 'Invalid edit attempted', {
          edit,
          errors: validation.errors,
        });
        throw new Error(`Invalid edit: ${validation.errors.join(', ')}`);
      }

      // Check for conflicts
      const existingEdit = edits.find(
        e => e.day === edit.day && e.field === edit.field
      );

      contextAddEdit(edit);

      addToHistory({
        action: 'add',
        edits: [edit],
        timestamp: Date.now(),
      });

      log.info('useEdits', 'Edit added', {
        edit,
        replaced: !!existingEdit,
        totalEdits: edits.length + (existingEdit ? 0 : 1),
      });
    },
    [edits, validateEdit, contextAddEdit, addToHistory]
  );

  /**
   * Remove edit
   */
  const removeEdit = useCallback(
    (day: number, field: Edit['field']) => {
      const editToRemove = edits.find(e => e.day === day && e.field === field);

      if (!editToRemove) {
        log.warn('useEdits', 'Attempted to remove non-existent edit', {
          day,
          field,
        });
        return;
      }

      contextRemoveEdit(day, field);

      addToHistory({
        action: 'remove',
        edits: [editToRemove],
        timestamp: Date.now(),
      });

      log.info('useEdits', 'Edit removed', { day, field });
    },
    [edits, contextRemoveEdit, addToHistory]
  );

  /**
   * Update edit
   */
  const updateEdit = useCallback(
    (day: number, field: Edit['field'], newValue: string | number) => {
      const existingEdit = edits.find(e => e.day === day && e.field === field);

      if (!existingEdit) {
        log.warn('useEdits', 'Attempted to update non-existent edit', {
          day,
          field,
        });
        return;
      }

      const updatedEdit: Edit = {
        ...existingEdit,
        newValue,
      };

      const validation = validateEdit(updatedEdit);
      if (!validation.isValid) {
        log.warn('useEdits', 'Invalid edit update attempted', {
          updatedEdit,
          errors: validation.errors,
        });
        throw new Error(`Invalid edit update: ${validation.errors.join(', ')}`);
      }

      contextAddEdit(updatedEdit);

      addToHistory({
        action: 'update',
        edits: [existingEdit, updatedEdit],
        timestamp: Date.now(),
      });

      log.info('useEdits', 'Edit updated', { day, field, newValue });
    },
    [edits, validateEdit, contextAddEdit, addToHistory]
  );

  /**
   * Clear all edits
   */
  const clearAllEdits = useCallback(() => {
    const clearedEdits = [...edits];

    contextClearEdits();

    addToHistory({
      action: 'clear',
      edits: clearedEdits,
      timestamp: Date.now(),
    });

    log.info('useEdits', 'All edits cleared', { count: clearedEdits.length });
  }, [edits, contextClearEdits, addToHistory]);

  /**
   * Batch edit operations
   */
  const batchEdit = useCallback(
    (operations: BatchEditOperation[]) => {
      const allEdits: Edit[] = [];
      const errors: string[] = [];

      // Validate all operations first
      operations.forEach((op, index) => {
        op.edits.forEach(edit => {
          const validation = validateEdit(edit);
          if (!validation.isValid) {
            errors.push(
              `Operation ${index + 1}: ${validation.errors.join(', ')}`
            );
          }
        });
        allEdits.push(...op.edits);
      });

      if (errors.length > 0) {
        log.warn('useEdits', 'Batch edit validation failed', { errors });
        throw new Error(`Batch edit failed: ${errors.join('; ')}`);
      }

      // Apply all operations
      operations.forEach(op => {
        switch (op.type) {
          case 'add':
            op.edits.forEach(edit => contextAddEdit(edit));
            break;
          case 'remove':
            op.edits.forEach(edit => contextRemoveEdit(edit.day, edit.field));
            break;
          case 'update':
            op.edits.forEach(edit => contextAddEdit(edit));
            break;
        }
      });

      addToHistory({
        action: 'batch',
        edits: allEdits,
        timestamp: Date.now(),
      });

      log.info('useEdits', 'Batch edit completed', {
        operationCount: operations.length,
        editCount: allEdits.length,
      });
    },
    [validateEdit, contextAddEdit, contextRemoveEdit, addToHistory]
  );

  /**
   * Undo last operation
   */
  const undo = useCallback(() => {
    if (historyIndex < 0 || !history[historyIndex]) {
      log.warn('useEdits', 'No operations to undo');
      return false;
    }

    const currentEntry = history[historyIndex];

    // Apply inverse operation
    switch (currentEntry.action) {
      case 'add':
        currentEntry.edits.forEach(edit =>
          contextRemoveEdit(edit.day, edit.field)
        );
        break;
      case 'remove':
        currentEntry.edits.forEach(edit => contextAddEdit(edit));
        break;
      case 'update':
        // For update, the first edit is the original
        if (currentEntry.edits.length >= 2) {
          contextAddEdit(currentEntry.edits[0]);
        }
        break;
      case 'clear':
        // Restore all cleared edits
        currentEntry.edits.forEach(edit => contextAddEdit(edit));
        break;
      case 'batch':
        // Complex undo for batch operations
        log.warn('useEdits', 'Batch undo not fully implemented');
        break;
    }

    setHistoryIndex(prev => Math.max(prev - 1, -1));
    log.info('useEdits', 'Undo performed', { action: currentEntry.action });

    return true;
  }, [history, historyIndex, contextAddEdit, contextRemoveEdit]);

  /**
   * Redo last undone operation
   */
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !history[historyIndex + 1]) {
      log.warn('useEdits', 'No operations to redo');
      return false;
    }

    const nextEntry = history[historyIndex + 1];

    // Apply operation
    switch (nextEntry.action) {
      case 'add':
        nextEntry.edits.forEach(edit => contextAddEdit(edit));
        break;
      case 'remove':
        nextEntry.edits.forEach(edit =>
          contextRemoveEdit(edit.day, edit.field)
        );
        break;
      case 'update':
        // For update, the second edit is the new value
        if (nextEntry.edits.length >= 2) {
          contextAddEdit(nextEntry.edits[1]);
        }
        break;
      case 'clear':
        contextClearEdits();
        break;
      case 'batch':
        log.warn('useEdits', 'Batch redo not fully implemented');
        break;
    }

    setHistoryIndex(prev => Math.min(prev + 1, history.length - 1));
    log.info('useEdits', 'Redo performed', { action: nextEntry.action });

    return true;
  }, [
    history,
    historyIndex,
    contextAddEdit,
    contextRemoveEdit,
    contextClearEdits,
  ]);

  /**
   * Check if edits have conflicts
   */
  const hasConflicts = useCallback(
    (checkEdits: Edit[] = edits): boolean => {
      const seen = new Map<string, Edit>();

      for (const edit of checkEdits) {
        const key = `${edit.day}-${edit.field}`;
        if (seen.has(key)) {
          return true;
        }
        seen.set(key, edit);
      }

      return false;
    },
    [edits]
  );

  /**
   * Get conflicts between existing edits and new edits
   */
  const getConflicts = useCallback(
    (newEdits: Edit[]): Array<{ existingEdit: Edit; newEdit: Edit }> => {
      const conflicts: Array<{ existingEdit: Edit; newEdit: Edit }> = [];

      newEdits.forEach(newEdit => {
        const existing = edits.find(
          e => e.day === newEdit.day && e.field === newEdit.field
        );
        if (existing) {
          conflicts.push({ existingEdit: existing, newEdit });
        }
      });

      return conflicts;
    },
    [edits]
  );

  /**
   * Resolve conflicts by keeping the latest edit for each day/field combination
   */
  const resolveConflicts = useCallback(
    (
      conflicts: Array<{ existingEdit: Edit; newEdit: Edit }>,
      strategy: 'keepLatest' | 'keepExisting' = 'keepLatest'
    ) => {
      if (strategy === 'keepLatest') {
        conflicts.forEach(({ existingEdit, newEdit }) => {
          contextRemoveEdit(existingEdit.day, existingEdit.field);
          contextAddEdit(newEdit);
        });
      }
      // keepExisting does nothing - existing edits are already in place
    },
    [contextAddEdit, contextRemoveEdit]
  );

  /**
   * Get edit statistics
   */
  const getStatistics = useCallback((): EditStatistics => {
    const fieldCounts: Record<Edit['field'], number> = {
      earnings: 0,
      expenses: 0,
      balance: 0,
      notes: 0,
      shifts: 0,
      deposit: 0,
    };

    const dayCounts = new Map<number, number>();

    edits.forEach(edit => {
      fieldCounts[edit.field]++;
      dayCounts.set(edit.day, (dayCounts.get(edit.day) || 0) + 1);
    });

    const mostEditedDays = Array.from(dayCounts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const lastEdit = history[history.length - 1];

    return {
      totalEdits: edits.length,
      editsByField: fieldCounts,
      mostEditedDays,
      lastEditTime: lastEdit ? new Date(lastEdit.timestamp) : null,
    };
  }, [edits, history]);

  /**
   * Save edit session
   */
  const saveSession = useCallback((): string => {
    const session: EditSession = {
      edits,
      history,
      historyIndex,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const serialized = JSON.stringify(session);
    lastSavedEdits.current = [...edits];

    log.info('useEdits', 'Session saved', {
      editCount: edits.length,
      historySize: history.length,
    });

    return serialized;
  }, [edits, history, historyIndex]);

  /**
   * Load edit session
   */
  const loadSession = useCallback(
    (sessionData: string) => {
      try {
        const session: EditSession = JSON.parse(sessionData);

        // Validate session version
        if (session.version !== '1.0.0') {
          throw new Error(`Unsupported session version: ${session.version}`);
        }

        // Clear current edits
        contextClearEdits();

        // Apply loaded edits
        session.edits.forEach(edit => {
          const validation = validateEdit(edit);
          if (validation.isValid) {
            contextAddEdit(edit);
          } else {
            log.warn('useEdits', 'Skipping invalid edit from session', {
              edit,
              errors: validation.errors,
            });
          }
        });

        // Restore history
        setHistory(session.history);
        setHistoryIndex(session.historyIndex);
        lastSavedEdits.current = [...session.edits];

        log.info('useEdits', 'Session loaded', {
          editCount: session.edits.length,
          timestamp: session.timestamp,
        });
      } catch (error) {
        log.error('useEdits', 'Failed to load session', error as Error);
        throw new Error(
          `Failed to load edit session: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [contextClearEdits, contextAddEdit, validateEdit]
  );

  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = useMemo(() => {
    if (edits.length !== lastSavedEdits.current.length) {
      return true;
    }

    return !edits.every((edit, index) => {
      const saved = lastSavedEdits.current[index];
      return (
        saved &&
        edit.day === saved.day &&
        edit.field === saved.field &&
        edit.newValue === saved.newValue
      );
    });
  }, [edits]);

  return {
    // Core edit operations
    edits,
    addEdit,
    removeEdit,
    updateEdit,
    clearEdits: clearAllEdits,

    // Validation
    validateEdit,

    // Undo/redo
    undo,
    redo,
    canUndo: historyIndex >= 0 && history.length > 0,
    canRedo: historyIndex < history.length - 1,

    // Conflict resolution
    hasConflicts,
    getConflicts,
    resolveConflicts,

    // Batch operations
    batchEdit,

    // Statistics
    getStatistics,
    getEditStatistics: getStatistics, // Alias for compatibility

    // Persistence
    saveSession,
    loadSession,
    hasUnsavedChanges,

    // History
    history,
    historyIndex,
  };
}
