import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';
import { UIState, UIActions, UIContextValue } from './types';
import { createLoggingMiddleware } from './middleware/loggingMiddleware';
import { logger } from '../utils/logger';

/**
 * Action types for the UI reducer
 */
type UIActionType =
  | { type: 'SET_VIEW_MODE'; payload: 'table' | 'calendar' }
  | { type: 'TOGGLE_WEEKENDS' }
  | { type: 'TOGGLE_HIGHLIGHT_VIOLATIONS' }
  | { type: 'SET_ACTIVE_MODAL'; payload: UIState['activeModal'] }
  | { type: 'SET_SELECTED_DAY'; payload: number | null }
  | { type: 'SET_SELECTED_FIELD'; payload: string | null }
  | { type: 'SET_FILTER'; payload: Partial<UIState['filters']> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_SORT'; payload: { field: string; direction: 'asc' | 'desc' } }
  | {
      type: 'SET_ERROR';
      payload: { message: string; details?: unknown } | null;
    }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'TOGGLE_DEBUG_MODE' };

/**
 * Initial state for the UI context
 */
const initialState: UIState = {
  viewMode: 'calendar',
  showWeekends: true,
  highlightViolations: true,
  activeModal: null,
  selectedDay: null,
  selectedField: null,
  filters: {
    showWorkDaysOnly: false,
    showEditsOnly: false,
    showViolationsOnly: false,
    dateRange: null,
  },
  sort: {
    field: 'day',
    direction: 'asc',
  },
  error: null,
  isLoading: false,
  theme: 'light',
  debugMode: false,
};

/**
 * UI reducer to handle state updates
 */
function uiReducer(state: UIState, action: UIActionType): UIState {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      };

    case 'TOGGLE_WEEKENDS':
      return {
        ...state,
        showWeekends: !state.showWeekends,
      };

    case 'TOGGLE_HIGHLIGHT_VIOLATIONS':
      return {
        ...state,
        highlightViolations: !state.highlightViolations,
      };

    case 'SET_ACTIVE_MODAL':
      return {
        ...state,
        activeModal: action.payload,
        // Clear selection when closing modal
        selectedDay: action.payload ? state.selectedDay : null,
        selectedField: action.payload ? state.selectedField : null,
      };

    case 'SET_SELECTED_DAY':
      return {
        ...state,
        selectedDay: action.payload,
      };

    case 'SET_SELECTED_FIELD':
      return {
        ...state,
        selectedField: action.payload,
      };

    case 'SET_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
      };

    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: initialState.filters,
      };

    case 'SET_SORT':
      return {
        ...state,
        sort: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };

    case 'TOGGLE_DEBUG_MODE':
      return {
        ...state,
        debugMode: !state.debugMode,
      };

    default:
      return state;
  }
}

/**
 * UI context
 */
const UIContext = createContext<UIContextValue | undefined>(undefined);

/**
 * UI context provider props
 */
interface UIProviderProps {
  children: ReactNode;
  initialTheme?: 'light' | 'dark';
  initialDebugMode?: boolean;
}

/**
 * UI context provider component
 */
export function UIProvider({
  children,
  initialTheme,
  initialDebugMode = false,
}: UIProviderProps) {
  // Detect system theme preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  };

  // Use system theme if no initial theme is provided
  const effectiveInitialTheme = initialTheme || getSystemTheme();

  // Track if user has manually overridden the theme
  const hasUserOverride = React.useRef(false);

  // Create wrapped reducer with logging middleware
  const wrappedReducer = React.useMemo(
    () =>
      createLoggingMiddleware(uiReducer, {
        contextName: 'UIContext',
        enabled:
          process.env.NODE_ENV !== 'test' &&
          (process.env.NODE_ENV !== 'production' ||
            process.env.REACT_APP_ENABLE_LOGGING === 'true'),
        logStateDiff: process.env.REACT_APP_LOG_STATE_DIFF === 'true',
      }),
    []
  );

  const [state, dispatch] = useReducer(wrappedReducer, {
    ...initialState,
    theme: effectiveInitialTheme,
    debugMode: initialDebugMode,
  });

  // Log provider mount/unmount
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'test') {
      logger.info('UIContext', 'UIProvider mounted', {
        initialTheme,
        effectiveInitialTheme,
        systemTheme: getSystemTheme(),
        initialDebugMode,
      });
    }

    return () => {
      if (process.env.NODE_ENV !== 'test') {
        logger.info('UIContext', 'UIProvider unmounted');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme to document
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Listen for system theme changes
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (!hasUserOverride.current) {
        dispatch({ type: 'SET_THEME', payload: e.matches ? 'dark' : 'light' });
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleThemeChange);
      return () => mediaQuery.removeEventListener('change', handleThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleThemeChange);
      return () => mediaQuery.removeListener(handleThemeChange);
    }
  }, []);

  // View mode actions
  const setViewMode = useCallback((mode: 'table' | 'calendar') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const toggleWeekends = useCallback(() => {
    dispatch({ type: 'TOGGLE_WEEKENDS' });
  }, []);

  const toggleHighlightViolations = useCallback(() => {
    dispatch({ type: 'TOGGLE_HIGHLIGHT_VIOLATIONS' });
  }, []);

  // Modal actions
  const openModal = useCallback((modal: UIState['activeModal']) => {
    dispatch({ type: 'SET_ACTIVE_MODAL', payload: modal });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_MODAL', payload: null });
  }, []);

  // Selection actions
  const selectDay = useCallback((day: number | null) => {
    dispatch({ type: 'SET_SELECTED_DAY', payload: day });
  }, []);

  const selectField = useCallback((field: string | null) => {
    dispatch({ type: 'SET_SELECTED_FIELD', payload: field });
  }, []);

  const selectCell = useCallback((day: number, field: string) => {
    dispatch({ type: 'SET_SELECTED_DAY', payload: day });
    dispatch({ type: 'SET_SELECTED_FIELD', payload: field });
  }, []);

  // Filter actions
  const setFilter = useCallback((filter: Partial<UIState['filters']>) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  // Sort actions
  const setSort = useCallback(
    (field: string, direction: 'asc' | 'desc' = 'asc') => {
      dispatch({ type: 'SET_SORT', payload: { field, direction } });
    },
    []
  );

  const toggleSortDirection = useCallback(() => {
    dispatch({
      type: 'SET_SORT',
      payload: {
        field: state.sort.field,
        direction: state.sort.direction === 'asc' ? 'desc' : 'asc',
      },
    });
  }, [state.sort]);

  // Error and loading actions
  const setError = useCallback((message: string | null, details?: unknown) => {
    dispatch({
      type: 'SET_ERROR',
      payload: message ? { message, details } : null,
    });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  // Theme actions
  const setTheme = useCallback((theme: 'light' | 'dark') => {
    hasUserOverride.current = true;
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const toggleTheme = useCallback(() => {
    hasUserOverride.current = true;
    dispatch({
      type: 'SET_THEME',
      payload: state.theme === 'light' ? 'dark' : 'light',
    });
  }, [state.theme]);

  // Debug actions
  const toggleDebugMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_DEBUG_MODE' });
  }, []);

  const actions: UIActions = {
    setViewMode,
    toggleWeekends,
    toggleHighlightViolations,
    openModal,
    closeModal,
    selectDay,
    selectField,
    selectCell,
    setFilter,
    clearFilters,
    setSort,
    toggleSortDirection,
    setError,
    clearError,
    setLoading,
    setTheme,
    toggleTheme,
    toggleDebugMode,
  };

  const value: UIContextValue = {
    ...state,
    ...actions,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/**
 * Custom hook to use the UI context
 */
export function useUIContext(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  return context;
}

/**
 * Custom hook for UI state management with utilities
 */
export function useUI() {
  const context = useUIContext();

  // Utility functions
  const isWeekend = useCallback((day: number) => {
    // Assuming day 1 is Monday, 6 and 7 are weekend
    const dayOfWeek = ((day - 1) % 7) + 1;
    return dayOfWeek === 6 || dayOfWeek === 7;
  }, []);

  const shouldShowDay = useCallback(
    (day: number, hasShifts: boolean) => {
      if (!context.showWeekends && isWeekend(day)) {
        return false;
      }
      if (context.filters.showWorkDaysOnly && !hasShifts) {
        return false;
      }
      if (context.filters.dateRange) {
        const { start, end } = context.filters.dateRange;
        if (day < start || day > end) {
          return false;
        }
      }
      return true;
    },
    [context.showWeekends, context.filters, isWeekend]
  );

  const getModalTitle = useCallback(() => {
    switch (context.activeModal) {
      case 'edit':
        return `Edit Day ${context.selectedDay} - ${context.selectedField}`;
      case 'config':
        return 'Configuration';
      case 'export':
        return 'Export Data';
      case 'import':
        return 'Import Data';
      case 'help':
        return 'Help';
      default:
        return '';
    }
  }, [context.activeModal, context.selectedDay, context.selectedField]);

  return {
    ...context,
    // Utility functions
    isWeekend,
    shouldShowDay,
    getModalTitle,
  };
}
