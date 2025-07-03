import {
  DaySchedule,
  Edit,
  OptimizationConfig,
  OptimizationProgress,
  OptimizationResult,
  ShiftTypes,
  Expense,
  Deposit,
} from '../types';

// ========================================
// Schedule Context Types
// ========================================

export interface ScheduleState {
  // Current schedule data
  currentSchedule: DaySchedule[];

  // Original schedule (before edits)
  originalSchedule: DaySchedule[];

  // List of edits applied to the schedule
  edits: Edit[];

  // Optimization results
  optimizationResult: OptimizationResult | null;

  // Shift types configuration
  shiftTypes: ShiftTypes;

  // Fixed expenses and deposits
  expenses: Expense[];
  deposits: Deposit[];
}

export interface ScheduleActions {
  // Schedule manipulation
  setCurrentSchedule: (schedule: DaySchedule[]) => void;
  resetSchedule: () => void;

  // Edit management
  addEdit: (edit: Edit) => void;
  removeEdit: (day: number, field: Edit['field']) => void;
  clearEdits: () => void;
  applyEdits: () => void;

  // Optimization
  setOptimizationResult: (result: OptimizationResult | null) => void;

  // Configuration
  updateShiftTypes: (shiftTypes: ShiftTypes) => void;
  setExpenses: (expenses: Expense[]) => void;
  setDeposits: (deposits: Deposit[]) => void;
}

export interface ScheduleContextValue extends ScheduleState, ScheduleActions {}

// ========================================
// Configuration Context Types
// ========================================

export interface ConfigurationState {
  // Main configuration
  config: OptimizationConfig;

  // Presets for quick configuration
  presets: ConfigurationPreset[];

  // Currently selected preset (if any)
  selectedPresetId: string | null;
}

export interface ConfigurationPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<OptimizationConfig>;
  isDefault?: boolean;
}

export interface ConfigurationActions {
  // Configuration updates
  updateConfig: (updates: Partial<OptimizationConfig>) => void;
  resetConfig: () => void;

  // Preset management
  selectPreset: (presetId: string) => void;
  clearPreset: () => void;
  saveAsPreset: (name: string, description: string) => void;
  deletePreset: (presetId: string) => void;

  // Balance adjustments
  setBalanceEdit: (day: number | null, newBalance?: number) => void;
}

export interface ConfigurationContextValue
  extends ConfigurationState,
    ConfigurationActions {}

// ========================================
// UI State Context Types
// ========================================

export interface UIState {
  // View preferences
  viewMode: 'table' | 'calendar';
  showWeekends: boolean;
  highlightViolations: boolean;

  // Modal states
  activeModal: 'edit' | 'config' | 'export' | 'import' | 'help' | null;
  selectedDay: number | null;
  selectedField: string | null;

  // Filters
  filters: {
    showWorkDaysOnly: boolean;
    showEditsOnly: boolean;
    showViolationsOnly: boolean;
    dateRange: { start: number; end: number } | null;
  };

  // Sorting
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };

  // Error handling
  error: { message: string; details?: any } | null;

  // Loading states
  isLoading: boolean;

  // Theme
  theme: 'light' | 'dark';

  // Debug mode
  debugMode: boolean;
}

export interface UIActions {
  // View mode actions
  setViewMode: (mode: 'table' | 'calendar') => void;
  toggleWeekends: () => void;
  toggleHighlightViolations: () => void;

  // Modal actions
  openModal: (modal: UIState['activeModal']) => void;
  closeModal: () => void;

  // Selection actions
  selectDay: (day: number | null) => void;
  selectField: (field: string | null) => void;
  selectCell: (day: number, field: string) => void;

  // Filter actions
  setFilter: (filter: Partial<UIState['filters']>) => void;
  clearFilters: () => void;

  // Sort actions
  setSort: (field: string, direction?: 'asc' | 'desc') => void;
  toggleSortDirection: () => void;

  // Error and loading actions
  setError: (message: string | null, details?: any) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;

  // Theme actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Debug actions
  toggleDebugMode: () => void;
}

export interface UIContextValue extends UIState, UIActions {}

// ========================================
// Optimization Progress Context Types
// ========================================

export interface OptimizationProgressState {
  // Current optimization progress
  currentProgress: OptimizationProgress | null;

  // Progress history for the current optimization
  progressHistory: OptimizationProgress[];

  // Optimization status
  status: OptimizationStatus;

  // Performance metrics
  startTime: number | null;
  endTime: number | null;

  // Best result so far
  bestIntermediateResult: OptimizationResult | null;
}

export type OptimizationStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface OptimizationProgressActions {
  // Progress updates
  updateProgress: (progress: OptimizationProgress) => void;

  // Status management
  startOptimization: () => void;
  completeOptimization: (result: OptimizationResult) => void;
  cancelOptimization: () => void;
  setOptimizationError: (error: Error) => void;

  // Reset
  resetProgress: () => void;

  // Intermediate results
  updateBestResult: (result: OptimizationResult) => void;
}

export interface OptimizationProgressContextValue
  extends OptimizationProgressState,
    OptimizationProgressActions {}

// ========================================
// Persistence Context Types
// ========================================

export interface PersistenceState {
  // Auto-save configuration
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in seconds
  lastSaveTime: Date | null;

  // Persistence status
  hasUnsavedChanges: boolean;
  isRestoring: boolean;

  // Version tracking
  dataVersion: string;
}

export interface PersistenceActions {
  // Save/load operations
  saveToLocalStorage: () => Promise<void>;
  loadFromLocalStorage: () => Promise<void>;
  clearLocalStorage: () => Promise<void>;

  // Export/import
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;

  // Auto-save management
  toggleAutoSave: () => void;
  setAutoSaveInterval: (seconds: number) => void;

  // Change tracking
  markAsChanged: () => void;
  markAsSaved: () => void;
}

export interface PersistenceContextValue
  extends PersistenceState,
    PersistenceActions {}

// ========================================
// Combined App State Type
// ========================================

export interface AppState {
  schedule: ScheduleState;
  configuration: ConfigurationState;
  ui: UIState;
  optimizationProgress: OptimizationProgressState;
  persistence: PersistenceState;
}

// ========================================
// Storage Types
// ========================================

export interface StoredAppData {
  version: string;
  timestamp: string;
  schedule: {
    currentSchedule: DaySchedule[];
    edits: Edit[];
    shiftTypes: ShiftTypes;
    expenses: Expense[];
    deposits: Deposit[];
  };
  configuration: {
    config: OptimizationConfig;
    presets: ConfigurationPreset[];
    selectedPresetId: string | null;
  };
  ui: {
    viewMode: 'table' | 'calendar';
    showWeekends: boolean;
    highlightViolations: boolean;
  };
}
