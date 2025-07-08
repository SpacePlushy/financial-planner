import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ScheduleProvider, useScheduleContext } from './ScheduleContext';
import {
  DaySchedule,
  Edit,
  ShiftTypes,
  Expense,
  Deposit,
  OptimizationResult,
} from '../types';

// Mock data
const mockSchedule: DaySchedule[] = [
  {
    day: 1,
    shifts: ['large'],
    earnings: 175,
    expenses: 50,
    deposit: 0,
    startBalance: 1000,
    endBalance: 1125,
  },
  {
    day: 2,
    shifts: ['medium'],
    earnings: 140,
    expenses: 30,
    deposit: 0,
    startBalance: 1125,
    endBalance: 1235,
  },
  {
    day: 3,
    shifts: [],
    earnings: 0,
    expenses: 200,
    deposit: 100,
    startBalance: 1235,
    endBalance: 1135,
  },
];

const mockShiftTypes: ShiftTypes = {
  large: { gross: 250, net: 175 },
  medium: { gross: 200, net: 140 },
  small: { gross: 150, net: 105 },
};

const mockExpenses: Expense[] = [
  { day: 1, name: 'Groceries', amount: 50 },
  { day: 3, name: 'Rent', amount: 200 },
];

const mockDeposits: Deposit[] = [{ day: 3, amount: 100 }];

const mockOptimizationResult: OptimizationResult = {
  schedule: ['large', 'medium', null],
  workDays: [1, 2],
  totalEarnings: 315,
  finalBalance: 1135,
  minBalance: 1000,
  violations: 0,
  computationTime: '1.5s',
  formattedSchedule: mockSchedule,
};

// Helper to render hook with provider
const renderScheduleHook = (initialProps?: {
  initialSchedule?: DaySchedule[];
  initialShiftTypes?: ShiftTypes;
  initialExpenses?: Expense[];
  initialDeposits?: Deposit[];
}) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ScheduleProvider {...initialProps}>{children}</ScheduleProvider>
  );

  return renderHook(() => useScheduleContext(), { wrapper });
};

describe('ScheduleContext', () => {
  describe('Initial State', () => {
    it('should have empty initial state by default', () => {
      const { result } = renderScheduleHook();

      expect(result.current.currentSchedule).toEqual([]);
      expect(result.current.originalSchedule).toEqual([]);
      expect(result.current.edits).toEqual([]);
      expect(result.current.optimizationResult).toBeNull();
      expect(result.current.expenses).toEqual([]);
      expect(result.current.deposits).toEqual([]);
    });

    it('should initialize with provided values', () => {
      const { result } = renderScheduleHook({
        initialSchedule: mockSchedule,
        initialShiftTypes: mockShiftTypes,
        initialExpenses: mockExpenses,
        initialDeposits: mockDeposits,
      });

      expect(result.current.currentSchedule).toEqual(mockSchedule);
      expect(result.current.originalSchedule).toEqual(mockSchedule);
      expect(result.current.shiftTypes).toEqual(mockShiftTypes);
      expect(result.current.expenses).toEqual(mockExpenses);
      expect(result.current.deposits).toEqual(mockDeposits);
    });
  });

  describe('Schedule Manipulation', () => {
    it('should set current schedule', () => {
      const { result } = renderScheduleHook();

      act(() => {
        result.current.setCurrentSchedule(mockSchedule);
      });

      expect(result.current.currentSchedule).toEqual(mockSchedule);
      expect(result.current.originalSchedule).toEqual(mockSchedule);
    });

    it('should not update original schedule if already set', () => {
      const { result } = renderScheduleHook({ initialSchedule: mockSchedule });

      const newSchedule = [...mockSchedule];
      newSchedule[0] = { ...newSchedule[0], earnings: 200 };

      act(() => {
        result.current.setCurrentSchedule(newSchedule);
      });

      expect(result.current.currentSchedule).toEqual(newSchedule);
      expect(result.current.originalSchedule).toEqual(mockSchedule);
    });

    it('should reset schedule to original', () => {
      const { result } = renderScheduleHook({ initialSchedule: mockSchedule });

      // Modify schedule
      const newSchedule = [...mockSchedule];
      newSchedule[0] = { ...newSchedule[0], earnings: 200 };

      act(() => {
        result.current.setCurrentSchedule(newSchedule);
      });

      // Reset
      act(() => {
        result.current.resetSchedule();
      });

      expect(result.current.currentSchedule).toEqual(mockSchedule);
      expect(result.current.edits).toEqual([]);
    });
  });

  describe('Edit Management', () => {
    it('should add new edit', () => {
      const { result } = renderScheduleHook();

      const edit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 175,
        newValue: 200,
      };

      act(() => {
        result.current.addEdit(edit);
      });

      expect(result.current.edits).toEqual([edit]);
    });

    it('should replace existing edit for same day and field', () => {
      const { result } = renderScheduleHook();

      const edit1: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 175,
        newValue: 200,
      };

      const edit2: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 175,
        newValue: 250,
      };

      act(() => {
        result.current.addEdit(edit1);
        result.current.addEdit(edit2);
      });

      expect(result.current.edits).toEqual([edit2]);
    });

    it('should remove specific edit', () => {
      const { result } = renderScheduleHook();

      const edit1: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 175,
        newValue: 200,
      };

      const edit2: Edit = {
        day: 1,
        field: 'expenses',
        originalValue: 50,
        newValue: 75,
      };

      act(() => {
        result.current.addEdit(edit1);
        result.current.addEdit(edit2);
      });

      act(() => {
        result.current.removeEdit(1, 'earnings');
      });

      expect(result.current.edits).toEqual([edit2]);
    });

    it('should clear all edits', () => {
      const { result } = renderScheduleHook();

      const edit1: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 175,
        newValue: 200,
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

      act(() => {
        result.current.clearEdits();
      });

      expect(result.current.edits).toEqual([]);
    });

    it('should apply edits to schedule', () => {
      const { result } = renderScheduleHook({ initialSchedule: mockSchedule });

      const earningsEdit: Edit = {
        day: 1,
        field: 'earnings',
        originalValue: 175,
        newValue: 200,
      };

      const expensesEdit: Edit = {
        day: 2,
        field: 'expenses',
        originalValue: 30,
        newValue: 50,
      };

      const balanceEdit: Edit = {
        day: 3,
        field: 'balance',
        originalValue: 1235,
        newValue: 1300,
      };

      act(() => {
        result.current.addEdit(earningsEdit);
        result.current.addEdit(expensesEdit);
        result.current.addEdit(balanceEdit);
      });

      act(() => {
        result.current.applyEdits();
      });

      const updatedSchedule = result.current.currentSchedule;

      // Check day 1 changes
      expect(updatedSchedule[0].earnings).toBe(200);
      expect(updatedSchedule[0].endBalance).toBe(1150); // 1000 + 200 - 50

      // Check day 2 changes with cascading balance
      expect(updatedSchedule[1].startBalance).toBe(1150);
      expect(updatedSchedule[1].expenses).toBe(50);
      expect(updatedSchedule[1].endBalance).toBe(1240); // 1150 + 140 - 50

      // Check day 3 changes
      expect(updatedSchedule[2].startBalance).toBe(1300); // Manual balance edit
      expect(updatedSchedule[2].endBalance).toBe(1200); // 1300 + 0 - 200 + 100

      // Edits should be cleared after applying
      expect(result.current.edits).toEqual([]);
    });

    it('should handle applying empty edits', () => {
      const { result } = renderScheduleHook({ initialSchedule: mockSchedule });

      const originalSchedule = [...result.current.currentSchedule];

      act(() => {
        result.current.applyEdits();
      });

      expect(result.current.currentSchedule).toEqual(originalSchedule);
    });
  });

  describe('Optimization', () => {
    it('should set optimization result', () => {
      const { result } = renderScheduleHook();

      act(() => {
        result.current.setOptimizationResult(mockOptimizationResult);
      });

      expect(result.current.optimizationResult).toEqual(mockOptimizationResult);
    });

    it('should clear optimization result', () => {
      const { result } = renderScheduleHook();

      act(() => {
        result.current.setOptimizationResult(mockOptimizationResult);
      });

      act(() => {
        result.current.setOptimizationResult(null);
      });

      expect(result.current.optimizationResult).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should update shift types', () => {
      const { result } = renderScheduleHook();

      const newShiftTypes: ShiftTypes = {
        large: { gross: 300, net: 210 },
        medium: { gross: 250, net: 175 },
        small: { gross: 200, net: 140 },
      };

      act(() => {
        result.current.updateShiftTypes(newShiftTypes);
      });

      expect(result.current.shiftTypes).toEqual(newShiftTypes);
    });

    it('should set expenses', () => {
      const { result } = renderScheduleHook();

      act(() => {
        result.current.setExpenses(mockExpenses);
      });

      expect(result.current.expenses).toEqual(mockExpenses);
    });

    it('should set deposits', () => {
      const { result } = renderScheduleHook();

      act(() => {
        result.current.setDeposits(mockDeposits);
      });

      expect(result.current.deposits).toEqual(mockDeposits);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      const { result } = renderHook(() => {
        try {
          return useScheduleContext();
        } catch (error) {
          return error;
        }
      });

      expect(result.current).toEqual(
        new Error('useScheduleContext must be used within a ScheduleProvider')
      );
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple edits and balance cascading correctly', () => {
      const { result } = renderScheduleHook({ initialSchedule: mockSchedule });

      // Add multiple edits that affect balances
      act(() => {
        result.current.addEdit({
          day: 1,
          field: 'earnings',
          originalValue: 175,
          newValue: 300,
        });

        result.current.addEdit({
          day: 2,
          field: 'balance',
          originalValue: 1125,
          newValue: 1500,
        });

        result.current.addEdit({
          day: 3,
          field: 'expenses',
          originalValue: 200,
          newValue: 100,
        });
      });

      act(() => {
        result.current.applyEdits();
      });

      const updatedSchedule = result.current.currentSchedule;

      // Day 1: earnings changed
      expect(updatedSchedule[0].earnings).toBe(300);
      expect(updatedSchedule[0].endBalance).toBe(1250); // 1000 + 300 - 50

      // Day 2: balance manually set, but start balance should be from day 1
      expect(updatedSchedule[1].startBalance).toBe(1500); // Manual balance edit
      expect(updatedSchedule[1].endBalance).toBe(1610); // 1500 + 140 - 30

      // Day 3: expenses changed, balance cascades from day 2
      expect(updatedSchedule[2].startBalance).toBe(1610);
      expect(updatedSchedule[2].expenses).toBe(100);
      expect(updatedSchedule[2].endBalance).toBe(1610); // 1610 + 0 - 100 + 100
    });

    it('should maintain edit history when adding and removing edits', () => {
      const { result } = renderScheduleHook();

      // Add several edits
      act(() => {
        result.current.addEdit({
          day: 1,
          field: 'earnings',
          originalValue: 175,
          newValue: 200,
        });

        result.current.addEdit({
          day: 1,
          field: 'expenses',
          originalValue: 50,
          newValue: 75,
        });

        result.current.addEdit({
          day: 2,
          field: 'earnings',
          originalValue: 140,
          newValue: 160,
        });
      });

      expect(result.current.edits).toHaveLength(3);

      // Remove one edit
      act(() => {
        result.current.removeEdit(1, 'expenses');
      });

      expect(result.current.edits).toHaveLength(2);
      expect(
        result.current.edits.find(e => e.day === 1 && e.field === 'expenses')
      ).toBeUndefined();

      // Add a new edit for the same field
      act(() => {
        result.current.addEdit({
          day: 1,
          field: 'expenses',
          originalValue: 50,
          newValue: 100,
        });
      });

      expect(result.current.edits).toHaveLength(3);
    });
  });
});
