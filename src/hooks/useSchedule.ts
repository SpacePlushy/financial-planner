import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useScheduleContext } from '../context/ScheduleContext';
import { DaySchedule, Edit, Expense, Deposit } from '../types';

/**
 * Custom hook that provides schedule management utilities
 *
 * @returns Extended schedule context with utility functions
 */
export function useSchedule() {
  const context = useScheduleContext();
  const {
    currentSchedule,
    originalSchedule,
    edits,
    optimizationResult,
    shiftTypes,
    expenses,
    deposits,
    ...actions
  } = context;

  /**
   * Get a specific day's schedule
   */
  const getDaySchedule = useCallback(
    (day: number): DaySchedule | undefined => {
      return currentSchedule.find(d => d.day === day);
    },
    [currentSchedule]
  );

  /**
   * Check if a specific day has any edits
   */
  const hasEditsForDay = useCallback(
    (day: number): boolean => {
      return edits.some(edit => edit.day === day);
    },
    [edits]
  );

  /**
   * Get all edits for a specific day
   */
  const getEditsForDay = useCallback(
    (day: number): Edit[] => {
      return edits.filter(edit => edit.day === day);
    },
    [edits]
  );

  /**
   * Check if there are any unsaved edits
   */
  const hasUnsavedEdits = useMemo(() => edits.length > 0, [edits]);

  /**
   * Calculate total earnings for the current schedule
   */
  const totalEarnings = useMemo(
    () => currentSchedule.reduce((sum, day) => sum + day.earnings, 0),
    [currentSchedule]
  );

  /**
   * Calculate total expenses from the expenses array
   */
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  /**
   * Calculate total deposits from the deposits array
   */
  const totalDeposits = useMemo(
    () => deposits.reduce((sum, deposit) => sum + deposit.amount, 0),
    [deposits]
  );

  /**
   * Get the final balance from the last day
   */
  const finalBalance = useMemo(() => {
    if (currentSchedule.length === 0) return 0;
    return currentSchedule[currentSchedule.length - 1].endBalance;
  }, [currentSchedule]);

  /**
   * Get the minimum balance across all days
   */
  const minimumBalance = useMemo(() => {
    if (currentSchedule.length === 0) return 0;
    return Math.min(...currentSchedule.map(day => day.endBalance));
  }, [currentSchedule]);

  /**
   * Count days with balance violations (below minimum)
   */
  const countBalanceViolations = useCallback(
    (minBalance: number): number => {
      return currentSchedule.filter(day => day.endBalance < minBalance).length;
    },
    [currentSchedule]
  );

  /**
   * Get days with balance violations
   */
  const getViolationDays = useCallback(
    (minBalance: number): number[] => {
      return currentSchedule
        .filter(day => day.endBalance < minBalance)
        .map(day => day.day);
    },
    [currentSchedule]
  );

  /**
   * Count total work days
   */
  const workDayCount = useMemo(
    () => currentSchedule.filter(day => day.shifts.length > 0).length,
    [currentSchedule]
  );

  /**
   * Get list of work days
   */
  const workDays = useMemo(
    () =>
      currentSchedule.filter(day => day.shifts.length > 0).map(day => day.day),
    [currentSchedule]
  );

  /**
   * Add or update an expense
   */
  const addOrUpdateExpense = useCallback(
    (expense: Expense) => {
      const updatedExpenses = [...expenses];
      const existingIndex = updatedExpenses.findIndex(
        e => e.day === expense.day && e.name === expense.name
      );

      if (existingIndex >= 0) {
        updatedExpenses[existingIndex] = expense;
      } else {
        updatedExpenses.push(expense);
      }

      actions.setExpenses(updatedExpenses);
    },
    [expenses, actions]
  );

  /**
   * Remove an expense
   */
  const removeExpense = useCallback(
    (day: number, name: string) => {
      const updatedExpenses = expenses.filter(
        e => !(e.day === day && e.name === name)
      );
      actions.setExpenses(updatedExpenses);
    },
    [expenses, actions]
  );

  /**
   * Add or update a deposit
   */
  const addOrUpdateDeposit = useCallback(
    (deposit: Deposit) => {
      const updatedDeposits = [...deposits];
      const existingIndex = updatedDeposits.findIndex(
        d => d.day === deposit.day
      );

      if (existingIndex >= 0) {
        updatedDeposits[existingIndex] = deposit;
      } else {
        updatedDeposits.push(deposit);
      }

      actions.setDeposits(updatedDeposits);
    },
    [deposits, actions]
  );

  /**
   * Remove a deposit
   */
  const removeDeposit = useCallback(
    (day: number) => {
      const updatedDeposits = deposits.filter(d => d.day !== day);
      actions.setDeposits(updatedDeposits);
    },
    [deposits, actions]
  );

  /**
   * Get expenses for a specific day
   */
  const getExpensesForDay = useCallback(
    (day: number): Expense[] => {
      return expenses.filter(e => e.day === day);
    },
    [expenses]
  );

  /**
   * Get deposit for a specific day
   */
  const getDepositForDay = useCallback(
    (day: number): Deposit | undefined => {
      return deposits.find(d => d.day === day);
    },
    [deposits]
  );

  /**
   * Check if schedule has been modified from original
   */
  const isScheduleModified = useMemo(() => {
    if (currentSchedule.length !== originalSchedule.length) return true;

    return currentSchedule.some((day, index) => {
      const original = originalSchedule[index];
      return (
        day.earnings !== original.earnings ||
        day.expenses !== original.expenses ||
        day.startBalance !== original.startBalance ||
        day.shifts.join(',') !== original.shifts.join(',')
      );
    });
  }, [currentSchedule, originalSchedule]);

  /**
   * Apply optimization result to current schedule
   */
  const applyOptimizationResult = useCallback(() => {
    if (!optimizationResult) return;

    const formattedSchedule = optimizationResult.formattedSchedule;
    actions.setCurrentSchedule(formattedSchedule);
  }, [optimizationResult, actions]);

  // ========================================
  // Enhanced CRUD Operations
  // ========================================

  /**
   * Update a specific day's schedule with partial updates
   * @param day - The day number to update
   * @param updates - Partial updates to apply to the day
   */
  const updateDaySchedule = useCallback(
    (day: number, updates: Partial<DaySchedule>) => {
      const updatedSchedule = [...currentSchedule];
      const dayIndex = updatedSchedule.findIndex(d => d.day === day);

      if (dayIndex === -1) {
        return;
      }

      updatedSchedule[dayIndex] = {
        ...updatedSchedule[dayIndex],
        ...updates,
      };

      // Recalculate balances if needed
      if (
        updates.earnings !== undefined ||
        updates.expenses !== undefined ||
        updates.deposit !== undefined
      ) {
        // Recalculate from this day forward
        for (let i = dayIndex; i < updatedSchedule.length; i++) {
          const prevBalance =
            i === 0
              ? updatedSchedule[i].startBalance
              : updatedSchedule[i - 1].endBalance;
          updatedSchedule[i].startBalance = prevBalance;
          updatedSchedule[i].endBalance =
            prevBalance +
            updatedSchedule[i].earnings -
            updatedSchedule[i].expenses +
            updatedSchedule[i].deposit;
        }
      }

      actions.setCurrentSchedule(updatedSchedule);
    },
    [currentSchedule, actions]
  );

  /**
   * Batch update multiple days in the schedule
   * @param updates - Array of day updates
   */
  const batchUpdateSchedule = useCallback(
    (updates: Array<{ day: number; changes: Partial<DaySchedule> }>) => {
      let updatedSchedule = [...currentSchedule];
      const needsBalanceRecalc = new Set<number>();

      // Apply all updates
      updates.forEach(({ day, changes }) => {
        const dayIndex = updatedSchedule.findIndex(d => d.day === day);
        if (dayIndex === -1) {
          console.warn(`Day ${day} not found in schedule`);
          return;
        }

        updatedSchedule[dayIndex] = {
          ...updatedSchedule[dayIndex],
          ...changes,
        };

        // Track days that need balance recalculation
        if (
          changes.earnings !== undefined ||
          changes.expenses !== undefined ||
          changes.deposit !== undefined
        ) {
          needsBalanceRecalc.add(dayIndex);
        }
      });

      // Recalculate balances starting from the earliest changed day
      if (needsBalanceRecalc.size > 0) {
        const earliestDay = Math.min(...Array.from(needsBalanceRecalc));
        for (let i = earliestDay; i < updatedSchedule.length; i++) {
          const prevBalance =
            i === 0
              ? updatedSchedule[i].startBalance
              : updatedSchedule[i - 1].endBalance;
          updatedSchedule[i].startBalance = prevBalance;
          updatedSchedule[i].endBalance =
            prevBalance +
            updatedSchedule[i].earnings -
            updatedSchedule[i].expenses +
            updatedSchedule[i].deposit;
        }
      }

      actions.setCurrentSchedule(updatedSchedule);
    },
    [currentSchedule, actions]
  );

  /**
   * Revert a specific edit for a day and field
   * @param day - The day number
   * @param field - The field to revert
   */
  const revertEdit = useCallback(
    (day: number, field: string) => {
      const edit = edits.find(e => e.day === day && e.field === field);
      if (!edit) {
        console.warn(`No edit found for day ${day}, field ${field}`);
        return;
      }

      // Remove the edit
      actions.removeEdit(day, field as Edit['field']);

      // Find the original value from originalSchedule
      const originalDay = originalSchedule.find(d => d.day === day);
      if (!originalDay) return;

      // Update the current schedule with the original value
      const updates: Partial<DaySchedule> = {};
      if (field === 'earnings') updates.earnings = originalDay.earnings;
      else if (field === 'expenses') updates.expenses = originalDay.expenses;
      else if (field === 'balance') updates.endBalance = originalDay.endBalance;

      updateDaySchedule(day, updates);
    },
    [edits, originalSchedule, actions, updateDaySchedule]
  );

  /**
   * Revert all edits and restore original schedule
   */
  const revertAllEdits = useCallback(() => {
    actions.clearEdits();
    actions.resetSchedule();
  }, [actions]);

  // ========================================
  // Advanced Balance Calculations
  // ========================================

  /**
   * Get balance projection for a specific date range
   * @param fromDay - Start day (inclusive)
   * @param toDay - End day (inclusive)
   * @returns Object with balance statistics for the range
   */
  const getBalanceProjection = useCallback(
    (fromDay: number, toDay: number) => {
      const daysInRange = currentSchedule.filter(
        d => d.day >= fromDay && d.day <= toDay
      );

      if (daysInRange.length === 0) {
        return {
          startBalance: 0,
          endBalance: 0,
          minBalance: 0,
          maxBalance: 0,
          avgBalance: 0,
          totalEarnings: 0,
          totalExpenses: 0,
          totalDeposits: 0,
          netChange: 0,
        };
      }

      const balances = daysInRange.map(d => d.endBalance);
      const startBalance = daysInRange[0].startBalance;
      const endBalance = daysInRange[daysInRange.length - 1].endBalance;
      const totalEarnings = daysInRange.reduce((sum, d) => sum + d.earnings, 0);
      const totalExpenses = daysInRange.reduce((sum, d) => sum + d.expenses, 0);
      const totalDeposits = daysInRange.reduce((sum, d) => sum + d.deposit, 0);

      return {
        startBalance,
        endBalance,
        minBalance: Math.min(...balances),
        maxBalance: Math.max(...balances),
        avgBalance: balances.reduce((sum, b) => sum + b, 0) / balances.length,
        totalEarnings,
        totalExpenses,
        totalDeposits,
        netChange: endBalance - startBalance,
      };
    },
    [currentSchedule]
  );

  /**
   * Find days where balance falls below a threshold
   * @param threshold - The balance threshold
   * @returns Array of day numbers with critical balance
   */
  const findCriticalBalanceDays = useCallback(
    (threshold: number) => {
      return currentSchedule
        .filter(day => day.endBalance < threshold)
        .map(day => ({
          day: day.day,
          balance: day.endBalance,
          deficit: threshold - day.endBalance,
        }));
    },
    [currentSchedule]
  );

  /**
   * Calculate required earnings to reach a target balance on a specific day
   * @param day - The target day
   * @param targetBalance - The desired balance
   * @returns Required earnings amount
   */
  const calculateRequiredEarnings = useCallback(
    (day: number, targetBalance: number) => {
      const daySchedule = currentSchedule.find(d => d.day === day);
      if (!daySchedule) return 0;

      const requiredEndBalance = targetBalance;
      const currentEndBalance =
        daySchedule.startBalance +
        daySchedule.earnings -
        daySchedule.expenses +
        daySchedule.deposit;
      const deficit = requiredEndBalance - currentEndBalance;

      return Math.max(0, daySchedule.earnings + deficit);
    },
    [currentSchedule]
  );

  // ========================================
  // Performance Optimizations
  // ========================================

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Debounced version of updateDaySchedule for rapid updates
   */
  const debouncedUpdateDaySchedule = useCallback(
    (day: number, updates: Partial<DaySchedule>, delay: number = 300) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateDaySchedule(day, updates);
        debounceTimerRef.current = null;
      }, delay);
    },
    [updateDaySchedule]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Memoized balance statistics
   */
  const balanceStats = useMemo(() => {
    if (currentSchedule.length === 0) {
      return {
        average: 0,
        median: 0,
        standardDeviation: 0,
        volatility: 0,
      };
    }

    const balances = currentSchedule.map(d => d.endBalance);
    const sum = balances.reduce((a, b) => a + b, 0);
    const average = sum / balances.length;

    // Calculate median
    const sorted = [...balances].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    // Calculate standard deviation
    const squaredDiffs = balances.map(b => Math.pow(b - average, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / balances.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate volatility (coefficient of variation)
    const volatility =
      average !== 0 ? (standardDeviation / Math.abs(average)) * 100 : 0;

    return {
      average,
      median,
      standardDeviation,
      volatility,
    };
  }, [currentSchedule]);

  /**
   * Virtual scrolling helpers for large schedules
   */
  const virtualScrollingHelpers = useMemo(() => {
    const ITEMS_PER_PAGE = 50;

    return {
      /**
       * Get a page of schedule items
       */
      getPage: (pageNumber: number) => {
        const start = pageNumber * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return currentSchedule.slice(start, end);
      },

      /**
       * Get total number of pages
       */
      getTotalPages: () => Math.ceil(currentSchedule.length / ITEMS_PER_PAGE),

      /**
       * Get items in a specific range
       */
      getRange: (startIndex: number, endIndex: number) => {
        return currentSchedule.slice(startIndex, endIndex);
      },

      /**
       * Get visible items based on scroll position
       */
      getVisibleItems: (
        scrollTop: number,
        containerHeight: number,
        itemHeight: number
      ) => {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const endIndex = Math.min(
          startIndex + visibleCount + 1,
          currentSchedule.length
        );

        return {
          items: currentSchedule.slice(startIndex, endIndex),
          startIndex,
          endIndex,
        };
      },
    };
  }, [currentSchedule]);

  /**
   * Memoized work pattern analysis
   */
  const workPatternAnalysis = useMemo(() => {
    const workDaysSet = new Set(workDays);
    let currentStreak = 0;
    let maxStreak = 0;
    let totalStreaks = 0;
    let streakCount = 0;

    for (let i = 1; i <= currentSchedule.length; i++) {
      if (workDaysSet.has(i)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        if (currentStreak > 0) {
          totalStreaks += currentStreak;
          streakCount++;
          currentStreak = 0;
        }
      }
    }

    // Handle final streak
    if (currentStreak > 0) {
      totalStreaks += currentStreak;
      streakCount++;
    }

    return {
      maxConsecutiveWorkDays: maxStreak,
      averageWorkStreak: streakCount > 0 ? totalStreaks / streakCount : 0,
      workDensity: (workDays.length / currentSchedule.length) * 100,
    };
  }, [workDays, currentSchedule.length]);

  return {
    // State
    currentSchedule,
    originalSchedule,
    edits,
    optimizationResult,
    shiftTypes,
    expenses,
    deposits,

    // Actions
    ...actions,

    // Utility functions
    getDaySchedule,
    hasEditsForDay,
    getEditsForDay,
    hasUnsavedEdits,
    totalEarnings,
    totalExpenses,
    totalDeposits,
    finalBalance,
    minimumBalance,
    countBalanceViolations,
    getViolationDays,
    workDayCount,
    workDays,
    addOrUpdateExpense,
    removeExpense,
    addOrUpdateDeposit,
    removeDeposit,
    getExpensesForDay,
    getDepositForDay,
    isScheduleModified,
    applyOptimizationResult,

    // Enhanced CRUD operations
    updateDaySchedule,
    batchUpdateSchedule,
    revertEdit,
    revertAllEdits,
    debouncedUpdateDaySchedule,

    // Advanced balance calculations
    getBalanceProjection,
    findCriticalBalanceDays,
    calculateRequiredEarnings,

    // Performance optimizations
    balanceStats,
    virtualScrollingHelpers,
    workPatternAnalysis,
  };
}
