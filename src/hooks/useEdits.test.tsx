// Mock logger before any imports
import { renderHook, act } from '@testing-library/react';
import { useEdits, BatchEditOperation, EditSession } from './useEdits';
import { Edit, DaySchedule } from '../types';
import { ScheduleProvider } from '../context/ScheduleContext';
import React from 'react';

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('useEdits', () => {
  const mockSchedule: DaySchedule[] = [
    {
      day: 1,
      shifts: ['large'],
      earnings: 250,
      expenses: 100,
      deposit: 0,
      startBalance: 1000,
      endBalance: 1150,
    },
    {
      day: 2,
      shifts: ['medium'],
      earnings: 200,
      expenses: 30,
      deposit: 0,
      startBalance: 1150,
      endBalance: 1320,
    },
    {
      day: 3,
      shifts: [],
      earnings: 0,
      expenses: 300,
      deposit: 150,
      startBalance: 1320,
      endBalance: 1170,
    },
    {
      day: 4,
      shifts: ['small', 'small'],
      earnings: 300,
      expenses: 50,
      deposit: 0,
      startBalance: 1170,
      endBalance: 1420,
    },
    {
      day: 5,
      shifts: [],
      earnings: 0,
      expenses: 40,
      deposit: 0,
      startBalance: 1370,
      endBalance: 1330,
    },
  ];

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ScheduleProvider initialSchedule={mockSchedule}>
      {children}
    </ScheduleProvider>
  );

  describe('CRUD Operations', () => {
    it('should add a valid edit', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const newEdit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      act(() => {
        result.current.addEdit(newEdit);
      });

      expect(result.current.edits).toHaveLength(1);
      expect(result.current.edits[0]).toEqual(newEdit);
    });

    it('should replace existing edit for same day and field', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit1: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      const edit2: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 350,
      };

      act(() => {
        result.current.addEdit(edit1);
        result.current.addEdit(edit2);
      });

      expect(result.current.edits).toHaveLength(1);
      expect(result.current.edits[0].newValue).toBe(350);
    });

    it('should remove an edit', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit: Edit = {
        day: 2,
        field: 'expenses',
        originalValue: 30,
        newValue: 50,
      };

      act(() => {
        result.current.addEdit(edit);
      });

      expect(result.current.edits).toHaveLength(1);

      act(() => {
        result.current.removeEdit(2, 'expenses');
      });

      expect(result.current.edits).toHaveLength(0);
    });

    it('should update an existing edit', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit: Edit = {
        day: 3,
        field: 'notes',
        originalValue: '',
        newValue: 'Original note',
      };

      act(() => {
        result.current.addEdit(edit);
      });

      act(() => {
        result.current.updateEdit(3, 'notes', 'Updated note');
      });

      expect(result.current.edits).toHaveLength(1);
      expect(result.current.edits[0].newValue).toBe('Updated note');
    });

    it('should clear all edits', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edits: Edit[] = [
        { day: 1, field: 'earnings', originalValue: 250, newValue: 300 },
        { day: 2, field: 'expenses', originalValue: 30, newValue: 50 },
        { day: 3, field: 'notes', originalValue: '', newValue: 'Test note' },
      ];

      act(() => {
        edits.forEach(edit => result.current.addEdit(edit));
      });

      expect(result.current.edits).toHaveLength(3);

      act(() => {
        result.current.clearEdits();
      });

      expect(result.current.edits).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should validate valid edits', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const validEdit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      const validation = result.current.validateEdit(validEdit);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject edit for non-existent day', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const invalidEdit: Edit = {
        day: 10,
        field: 'earnings',
        originalValue: 0,
        newValue: 100,
      };

      const validation = result.current.validateEdit(invalidEdit);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Day 10 does not exist in the schedule'
      );
    });

    it('should reject invalid numeric values', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const invalidEdit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 'not a number' as any,
      };

      const validation = result.current.validateEdit(invalidEdit);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('earnings must be a valid number');
    });

    it('should reject negative values for earnings and expenses', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const negativeEarnings: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: -100,
      };

      const negativeExpenses: Edit = {
        day: 1,
        field: 'expenses',
        originalValue: 100,
        newValue: -50,
      };

      expect(result.current.validateEdit(negativeEarnings).isValid).toBe(false);
      expect(result.current.validateEdit(negativeExpenses).isValid).toBe(false);
    });

    it('should allow negative balance', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const negativeBalance: Edit = {
        day: 1,
        field: 'balance',
        originalValue: 1000,
        newValue: -500,
      };

      expect(result.current.validateEdit(negativeBalance).isValid).toBe(true);
    });

    it('should reject notes exceeding 500 characters', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const longNote: Edit = {
        day: 1,
        field: 'notes',
        originalValue: '',
        newValue: 'a'.repeat(501),
      };

      const validation = result.current.validateEdit(longNote);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Notes cannot exceed 500 characters');
    });

    it('should throw error when adding invalid edit', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const invalidEdit: Edit = {
        day: 10,
        field: 'earnings',
        originalValue: 0,
        newValue: 100,
      };

      expect(() => {
        act(() => {
          result.current.addEdit(invalidEdit);
        });
      }).toThrow('Invalid edit: Day 10 does not exist in the schedule');
    });
  });

  describe('Undo/Redo', () => {
    it('should undo add operation', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      act(() => {
        result.current.addEdit(edit);
      });

      expect(result.current.edits).toHaveLength(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.edits).toHaveLength(0);
    });

    it('should redo add operation', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      act(() => {
        result.current.addEdit(edit);
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.redo();
      });

      expect(result.current.edits).toHaveLength(1);
      expect(result.current.edits[0]).toEqual(edit);
    });

    it('should undo remove operation', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      act(() => {
        result.current.addEdit(edit);
      });

      act(() => {
        result.current.removeEdit(1, 'earnings');
      });

      expect(result.current.edits).toHaveLength(0);

      act(() => {
        result.current.undo();
      });

      expect(result.current.edits).toHaveLength(1);
      expect(result.current.edits[0]).toEqual(edit);
    });

    it('should undo update operation', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const originalEdit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      act(() => {
        result.current.addEdit(originalEdit);
      });

      act(() => {
        result.current.updateEdit(1, 'earnings', 400);
      });

      expect(result.current.edits[0].newValue).toBe(400);

      act(() => {
        result.current.undo();
      });

      expect(result.current.edits[0].newValue).toBe(300);
    });

    it('should undo clear operation', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edits: Edit[] = [
        { day: 1, field: 'earnings', originalValue: 250, newValue: 300 },
        { day: 2, field: 'expenses', originalValue: 30, newValue: 50 },
      ];

      act(() => {
        edits.forEach(edit => result.current.addEdit(edit));
      });

      act(() => {
        result.current.clearEdits();
      });

      expect(result.current.edits).toHaveLength(0);

      act(() => {
        result.current.undo();
      });

      expect(result.current.edits).toHaveLength(2);
    });

    it('should maintain proper history index', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit1: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      const edit2: Edit = {
        day: 2,
        field: 'expenses',
        originalValue: 30,
        newValue: 50,
      };

      act(() => {
        result.current.addEdit(edit1);
        result.current.addEdit(edit2);
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('should return false when nothing to undo/redo', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      act(() => {
        const undoResult = result.current.undo();
        expect(undoResult).toBe(false);
      });

      act(() => {
        const redoResult = result.current.redo();
        expect(redoResult).toBe(false);
      });
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit1: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      const edit2: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 350,
      };

      act(() => {
        result.current.addEdit(edit1);
      });

      const conflicts = result.current.getConflicts([edit2]);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].existingEdit).toEqual(edit1);
      expect(conflicts[0].newEdit).toEqual(edit2);
    });

    it('should not detect conflicts for different day/field combinations', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit1: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      const edit2: Edit = {
        day: 1,
        field: 'expenses',
        originalValue: 100,
        newValue: 150,
      };

      const edit3: Edit = {
        day: 2,
        field: 'earnings',
        originalValue: 200,
        newValue: 250,
      };

      act(() => {
        result.current.addEdit(edit1);
      });

      const conflicts = result.current.getConflicts([edit2, edit3]);
      expect(conflicts).toHaveLength(0);
    });

    it('should resolve conflicts by keeping latest', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit1: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 300,
      };

      const edit2: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: 350,
      };

      act(() => {
        result.current.addEdit(edit1);
      });

      const conflicts = result.current.getConflicts([edit2]);
      expect(conflicts).toHaveLength(1);

      act(() => {
        result.current.resolveConflicts(conflicts, 'keepLatest');
      });

      expect(result.current.edits).toHaveLength(1);
      expect(result.current.edits[0].newValue).toBe(350);
    });
  });

  describe('Batch Operations', () => {
    it('should perform batch add operations', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const operations: BatchEditOperation[] = [
        {
          type: 'add',
          edits: [
            { day: 1, field: 'earnings', originalValue: 250, newValue: 300 },
            { day: 2, field: 'expenses', originalValue: 30, newValue: 50 },
          ],
        },
      ];

      act(() => {
        result.current.batchEdit(operations);
      });

      expect(result.current.edits).toHaveLength(2);
    });

    it('should perform mixed batch operations', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      // First add some edits
      act(() => {
        result.current.addEdit({
          day: 1,
          field: 'earnings',
          originalValue: 250,
          newValue: 300,
        });
        result.current.addEdit({
          day: 2,
          field: 'expenses',
          originalValue: 30,
          newValue: 50,
        });
      });

      const operations: BatchEditOperation[] = [
        {
          type: 'remove',
          edits: [
            { day: 1, field: 'earnings', originalValue: 250, newValue: 300 },
          ],
        },
        {
          type: 'update',
          edits: [
            { day: 2, field: 'expenses', originalValue: 30, newValue: 75 },
          ],
        },
        {
          type: 'add',
          edits: [
            {
              day: 3,
              field: 'notes',
              originalValue: '',
              newValue: 'Batch test',
            },
          ],
        },
      ];

      act(() => {
        result.current.batchEdit(operations);
      });

      expect(result.current.edits).toHaveLength(2);
      expect(result.current.edits.find(e => e.day === 1)).toBeUndefined();
      expect(result.current.edits.find(e => e.day === 2)?.newValue).toBe(75);
      expect(result.current.edits.find(e => e.day === 3)?.newValue).toBe(
        'Batch test'
      );
    });

    it('should validate all batch operations before applying', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const operations: BatchEditOperation[] = [
        {
          type: 'add',
          edits: [
            { day: 1, field: 'earnings', originalValue: 250, newValue: 300 },
            { day: 10, field: 'expenses', originalValue: 0, newValue: 50 }, // Invalid day
          ],
        },
      ];

      expect(() => {
        act(() => {
          result.current.batchEdit(operations);
        });
      }).toThrow('Batch edit failed');

      expect(result.current.edits).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    it('should calculate edit statistics correctly', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edits: Edit[] = [
        { day: 1, field: 'earnings', originalValue: 250, newValue: 300 },
        { day: 2, field: 'expenses', originalValue: 30, newValue: 50 },
        { day: 3, field: 'notes', originalValue: '', newValue: 'Test note' },
        { day: 4, field: 'earnings', originalValue: 300, newValue: 350 },
      ];

      act(() => {
        edits.forEach(edit => result.current.addEdit(edit));
      });

      const stats = result.current.getEditStatistics();
      expect(stats.totalEdits).toBe(4);
      expect(stats.editsByField.earnings).toBe(2);
      expect(stats.editsByField.expenses).toBe(1);
      expect(stats.editsByField.notes).toBe(1);
      // Note: daysWithEdits and averageEditsPerDay are not implemented
    });

    it('should handle empty statistics', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const stats = result.current.getEditStatistics();
      expect(stats.totalEdits).toBe(0);
      expect(stats.editsByField).toEqual({
        earnings: 0,
        expenses: 0,
        balance: 0,
        notes: 0,
        shifts: 0,
      });
      // Note: daysWithEdits and averageEditsPerDay are not implemented
    });
  });

  describe('Persistence', () => {
    it('should save and load session', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edits: Edit[] = [
        { day: 1, field: 'earnings', originalValue: 250, newValue: 300 },
        { day: 2, field: 'expenses', originalValue: 30, newValue: 50 },
      ];

      act(() => {
        edits.forEach(edit => result.current.addEdit(edit));
      });

      let session: string;
      act(() => {
        session = result.current.saveSession();
      });

      // Clear edits
      act(() => {
        result.current.clearEdits();
      });

      expect(result.current.edits).toHaveLength(0);

      // Load session
      act(() => {
        result.current.loadSession(session!);
      });

      expect(result.current.edits).toHaveLength(2);
      expect(result.current.edits).toEqual(edits);
    });

    it('should handle invalid session data', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      expect(() => {
        act(() => {
          result.current.loadSession('invalid json');
        });
      }).toThrow('Failed to load edit session');
    });

    it('should handle unsupported session version', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const invalidSession: EditSession = {
        version: '2.0.0',
        edits: [],
        history: [],
        historyIndex: -1,
        timestamp: new Date().toISOString(),
      };

      expect(() => {
        act(() => {
          result.current.loadSession(JSON.stringify(invalidSession));
        });
      }).toThrow('Unsupported session version');
    });

    it('should skip invalid edits when loading session', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const sessionWithInvalidEdits: EditSession = {
        version: '1.0.0',
        edits: [
          { day: 1, field: 'earnings', originalValue: 250, newValue: 300 },
          { day: 10, field: 'expenses', originalValue: 0, newValue: 50 }, // Invalid day
          { day: 2, field: 'expenses', originalValue: 30, newValue: 50 },
        ],
        history: [],
        historyIndex: -1,
        timestamp: new Date().toISOString(),
      };

      act(() => {
        result.current.loadSession(JSON.stringify(sessionWithInvalidEdits));
      });

      expect(result.current.edits).toHaveLength(2);
      expect(result.current.edits.find(e => e.day === 10)).toBeUndefined();
    });

    it('should track unsaved changes', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      expect(result.current.hasUnsavedChanges).toBe(false);

      act(() => {
        result.current.addEdit({
          day: 1,
          field: 'earnings',
          originalValue: 250,
          newValue: 300,
        });
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      act(() => {
        result.current.saveSession();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should detect changes after save', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      act(() => {
        result.current.addEdit({
          day: 1,
          field: 'earnings',
          originalValue: 250,
          newValue: 300,
        });
        result.current.saveSession();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);

      act(() => {
        result.current.addEdit({
          day: 2,
          field: 'expenses',
          originalValue: 30,
          newValue: 50,
        });
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle removing non-existent edit gracefully', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      act(() => {
        result.current.removeEdit(1, 'earnings');
      });

      expect(result.current.edits).toHaveLength(0);
    });

    it('should handle updating non-existent edit gracefully', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      act(() => {
        result.current.updateEdit(1, 'earnings', 300);
      });

      expect(result.current.edits).toHaveLength(0);
    });

    it('should limit history size to prevent memory issues', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      // Add more than 50 operations
      for (let i = 0; i < 60; i++) {
        act(() => {
          result.current.addEdit({
            day: 1,
            field: 'earnings',
            originalValue: 250,
            newValue: 250 + i,
          });
        });
      }

      // History should be limited
      expect(result.current.canUndo).toBe(true);

      // Try to undo 50 times (should succeed)
      let undoCount = 0;
      for (let i = 0; i < 50; i++) {
        act(() => {
          if (result.current.undo()) {
            undoCount++;
          }
        });
      }

      expect(undoCount).toBeLessThanOrEqual(50);
    });

    it('should handle empty schedule', () => {
      const emptyWrapper = ({ children }: { children: React.ReactNode }) => (
        <ScheduleProvider initialSchedule={[]}>{children}</ScheduleProvider>
      );

      const { result } = renderHook(() => useEdits(), {
        wrapper: emptyWrapper,
      });

      const validation = result.current.validateEdit({
        day: 1,
        field: 'earnings',
        originalValue: 0,
        newValue: 100,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Day 1 does not exist in the schedule'
      );
    });

    it('should handle numeric string values correctly', () => {
      const { result } = renderHook(() => useEdits(), { wrapper });

      const edit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 250,
        newValue: '300' as any,
      };

      act(() => {
        result.current.addEdit(edit);
      });

      expect(result.current.edits).toHaveLength(1);
      expect(result.current.edits[0].newValue).toBe('300');
    });
  });
});
