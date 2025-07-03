import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import {
  DaySchedule,
  Edit,
  OptimizationResult,
  ShiftTypes,
  Expense,
  Deposit,
} from '../types';
import { ScheduleState, ScheduleActions, ScheduleContextValue } from './types';
import {
  createLoggingMiddleware,
  defaultStateSanitizer,
  defaultActionSanitizer,
} from './middleware/loggingMiddleware';
import { logger } from '../utils/logger';
import { getDefaultData } from '../utils/sampleData';

/**
 * Actions types for the schedule reducer
 */
type ScheduleActionType =
  | { type: 'SET_CURRENT_SCHEDULE'; payload: DaySchedule[] }
  | { type: 'RESET_SCHEDULE' }
  | { type: 'ADD_EDIT'; payload: Edit }
  | { type: 'REMOVE_EDIT'; payload: { day: number; field: Edit['field'] } }
  | { type: 'CLEAR_EDITS' }
  | { type: 'APPLY_EDITS' }
  | { type: 'SET_OPTIMIZATION_RESULT'; payload: OptimizationResult | null }
  | { type: 'UPDATE_SHIFT_TYPES'; payload: ShiftTypes }
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'SET_DEPOSITS'; payload: Deposit[] };

/**
 * Get initial state with clean sample data
 */
function createInitialState(): ScheduleState {
  const defaultData = getDefaultData();
  return {
    currentSchedule: [],
    originalSchedule: [],
    edits: [],
    optimizationResult: null,
    shiftTypes: defaultData.shiftTypes,
    expenses: defaultData.expenses,
    deposits: defaultData.deposits,
  };
}

const initialState: ScheduleState = createInitialState();

/**
 * Schedule reducer to handle state updates
 */
function scheduleReducer(
  state: ScheduleState,
  action: ScheduleActionType
): ScheduleState {
  switch (action.type) {
    case 'SET_CURRENT_SCHEDULE':
      return {
        ...state,
        currentSchedule: action.payload,
        originalSchedule:
          state.originalSchedule.length === 0
            ? action.payload
            : state.originalSchedule,
      };

    case 'RESET_SCHEDULE':
      return {
        ...state,
        currentSchedule: [...state.originalSchedule],
        edits: [],
      };

    case 'ADD_EDIT': {
      const newEdit = action.payload;
      const existingEditIndex = state.edits.findIndex(
        edit => edit.day === newEdit.day && edit.field === newEdit.field
      );

      if (existingEditIndex >= 0) {
        // Replace existing edit
        const updatedEdits = [...state.edits];
        updatedEdits[existingEditIndex] = newEdit;
        return { ...state, edits: updatedEdits };
      }

      // Add new edit
      return { ...state, edits: [...state.edits, newEdit] };
    }

    case 'REMOVE_EDIT': {
      const { day, field } = action.payload;
      return {
        ...state,
        edits: state.edits.filter(
          edit => !(edit.day === day && edit.field === field)
        ),
      };
    }

    case 'CLEAR_EDITS':
      return { ...state, edits: [] };

    case 'APPLY_EDITS': {
      if (state.edits.length === 0) {
        return state;
      }

      const updatedSchedule = [...state.currentSchedule];

      state.edits.forEach(edit => {
        const dayIndex = updatedSchedule.findIndex(d => d.day === edit.day);
        if (dayIndex >= 0) {
          const daySchedule = { ...updatedSchedule[dayIndex] };

          switch (edit.field) {
            case 'earnings':
              daySchedule.earnings = Number(edit.newValue);
              break;
            case 'expenses':
              daySchedule.expenses = Number(edit.newValue);
              break;
            case 'balance':
              daySchedule.startBalance = Number(edit.newValue);
              break;
            // Notes field would be handled here if DaySchedule had a notes property
          }

          // Recalculate end balance
          daySchedule.endBalance =
            daySchedule.startBalance +
            daySchedule.earnings -
            daySchedule.expenses +
            daySchedule.deposit;

          updatedSchedule[dayIndex] = daySchedule;

          // Update subsequent days' balances
          for (let i = dayIndex + 1; i < updatedSchedule.length; i++) {
            const prevDay = updatedSchedule[i - 1];
            const currentDay = { ...updatedSchedule[i] };
            currentDay.startBalance = prevDay.endBalance;
            currentDay.endBalance =
              currentDay.startBalance +
              currentDay.earnings -
              currentDay.expenses +
              currentDay.deposit;
            updatedSchedule[i] = currentDay;
          }
        }
      });

      return {
        ...state,
        currentSchedule: updatedSchedule,
        edits: [], // Clear edits after applying
      };
    }

    case 'SET_OPTIMIZATION_RESULT':
      return { ...state, optimizationResult: action.payload };

    case 'UPDATE_SHIFT_TYPES':
      return { ...state, shiftTypes: action.payload };

    case 'SET_EXPENSES':
      return { ...state, expenses: action.payload };

    case 'SET_DEPOSITS':
      return { ...state, deposits: action.payload };

    default:
      return state;
  }
}

/**
 * Schedule context
 */
const ScheduleContext = createContext<ScheduleContextValue | undefined>(
  undefined
);

/**
 * Schedule context provider props
 */
interface ScheduleProviderProps {
  children: ReactNode;
  initialSchedule?: DaySchedule[];
  initialShiftTypes?: ShiftTypes;
  initialExpenses?: Expense[];
  initialDeposits?: Deposit[];
}

/**
 * Schedule context provider component
 *
 * @param props - Provider props
 * @returns Provider component
 */
export function ScheduleProvider({
  children,
  initialSchedule = [],
  initialShiftTypes,
  initialExpenses = [],
  initialDeposits = [],
}: ScheduleProviderProps) {
  // Create wrapped reducer with logging middleware
  const wrappedReducer = useMemo(
    () =>
      createLoggingMiddleware(scheduleReducer, {
        contextName: 'ScheduleContext',
        enabled:
          process.env.NODE_ENV !== 'production' ||
          process.env.REACT_APP_ENABLE_LOGGING === 'true',
        logStateDiff: process.env.REACT_APP_LOG_STATE_DIFF === 'true',
        sanitizeState: (state: ScheduleState) => {
          // Custom sanitization for schedule state
          const sanitized = defaultStateSanitizer(state);
          // Limit schedule arrays to first 5 items in logs
          if (sanitized.currentSchedule?.length > 5) {
            sanitized.currentSchedule = [
              ...sanitized.currentSchedule.slice(0, 5),
              `... and ${sanitized.currentSchedule.length - 5} more days`,
            ];
          }
          if (sanitized.originalSchedule?.length > 5) {
            sanitized.originalSchedule = [
              ...sanitized.originalSchedule.slice(0, 5),
              `... and ${sanitized.originalSchedule.length - 5} more days`,
            ];
          }
          return sanitized;
        },
        sanitizeAction: defaultActionSanitizer,
      }),
    []
  );

  const [state, dispatch] = useReducer(wrappedReducer, {
    ...initialState,
    currentSchedule: initialSchedule,
    originalSchedule: initialSchedule,
    shiftTypes: initialShiftTypes || initialState.shiftTypes,
    expenses: initialExpenses,
    deposits: initialDeposits,
  });

  // Log provider mount/unmount
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'test') {
      logger.info('ScheduleContext', 'ScheduleProvider mounted', {
        initialScheduleLength: initialSchedule.length,
        hasInitialShiftTypes: !!initialShiftTypes,
        expensesCount: initialExpenses.length,
        depositsCount: initialDeposits.length,
      });
    }

    return () => {
      if (process.env.NODE_ENV !== 'test') {
        logger.info('ScheduleContext', 'ScheduleProvider unmounted');
      }
    };
  }, []);

  // Schedule manipulation actions
  const setCurrentSchedule = useCallback((schedule: DaySchedule[]) => {
    dispatch({ type: 'SET_CURRENT_SCHEDULE', payload: schedule });
  }, []);

  const resetSchedule = useCallback(() => {
    dispatch({ type: 'RESET_SCHEDULE' });
  }, []);

  // Edit management actions
  const addEdit = useCallback((edit: Edit) => {
    dispatch({ type: 'ADD_EDIT', payload: edit });
  }, []);

  const removeEdit = useCallback((day: number, field: Edit['field']) => {
    dispatch({ type: 'REMOVE_EDIT', payload: { day, field } });
  }, []);

  const clearEdits = useCallback(() => {
    dispatch({ type: 'CLEAR_EDITS' });
  }, []);

  const applyEdits = useCallback(() => {
    dispatch({ type: 'APPLY_EDITS' });
  }, []);

  // Optimization actions
  const setOptimizationResult = useCallback(
    (result: OptimizationResult | null) => {
      dispatch({ type: 'SET_OPTIMIZATION_RESULT', payload: result });
    },
    []
  );

  // Configuration actions
  const updateShiftTypes = useCallback((shiftTypes: ShiftTypes) => {
    dispatch({ type: 'UPDATE_SHIFT_TYPES', payload: shiftTypes });
  }, []);

  const setExpenses = useCallback((expenses: Expense[]) => {
    dispatch({ type: 'SET_EXPENSES', payload: expenses });
  }, []);

  const setDeposits = useCallback((deposits: Deposit[]) => {
    dispatch({ type: 'SET_DEPOSITS', payload: deposits });
  }, []);

  const actions: ScheduleActions = {
    setCurrentSchedule,
    resetSchedule,
    addEdit,
    removeEdit,
    clearEdits,
    applyEdits,
    setOptimizationResult,
    updateShiftTypes,
    setExpenses,
    setDeposits,
  };

  const value: ScheduleContextValue = {
    ...state,
    ...actions,
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

/**
 * Custom hook to use the schedule context
 *
 * @returns Schedule context value
 * @throws Error if used outside of ScheduleProvider
 */
export function useScheduleContext(): ScheduleContextValue {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error(
      'useScheduleContext must be used within a ScheduleProvider'
    );
  }
  return context;
}
