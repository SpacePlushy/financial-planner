/**
 * Central configuration file for all constants and magic numbers in the application.
 * This file allows easy modification of algorithm parameters, UI settings, and business logic constants.
 *
 * @module constants
 */

/**
 * Schedule and calendar constants
 */
export const SCHEDULE_CONSTANTS = {
  /** Minimum day number (1-indexed) */
  MIN_DAY: 1,
  /** Maximum day number for a month */
  MAX_DAY: 30,
  /** Array size for day arrays (includes 0 index) */
  DAY_ARRAY_SIZE: 31,
  /** Starting day of the week (0 = Sunday) */
  WEEK_START_DAY: 0,
  /** Number of days in a week */
  DAYS_IN_WEEK: 7,
} as const;

/**
 * Default shift type values (in dollars)
 */
export const SHIFT_VALUES = {
  large: {
    net: 86.5,
    gross: 94.5,
    value: 86.5, // Legacy support
  },
  medium: {
    net: 67.5,
    gross: 75.5,
    value: 67.5,
  },
  small: {
    net: 56.0,
    gross: 64.0,
    value: 56.0,
  },
} as const;

/**
 * Genetic algorithm parameters
 */
export const GENETIC_ALGORITHM = {
  /** Population size for genetic algorithm */
  POPULATION_SIZE: 200,
  /** Number of generations to evolve */
  GENERATIONS: 500,
  /** Mutation rate (0-1) */
  MUTATION_RATE: 0.15,
  /** Crossover rate (0-1) */
  CROSSOVER_RATE: 0.7,
  /** Elite population percentage to carry forward */
  ELITE_PERCENTAGE: 0.2,
  /** Minimum elite size */
  MIN_ELITE_SIZE: 30,
  /** Tournament size for selection */
  TOURNAMENT_SIZE: 7,
  /** Maximum consecutive generations without improvement before stopping */
  STAGNATION_LIMIT: 150,
  /** Fitness improvement threshold to reset stagnation counter */
  IMPROVEMENT_THRESHOLD: 0.99,
  /** Early termination thresholds */
  EARLY_TERMINATION: {
    /** Generations for first check */
    FIRST_CHECK: 300,
    /** Generations for second check */
    SECOND_CHECK: 100,
    /** Generations for final check */
    FINAL_CHECK: 50,
    /** Fitness threshold for termination */
    FITNESS_THRESHOLD: 1000,
    /** Fitness threshold for extended search */
    EXTENDED_THRESHOLD: 100,
    /** Balance tolerance for perfect solution */
    BALANCE_TOLERANCE: 5,
  },
  /** Progress reporting interval */
  PROGRESS_INTERVAL: 50,
  /** Debug log interval */
  LOG_INTERVAL: 100,
  /** Worker timeout in milliseconds */
  WORKER_TIMEOUT: 10,
} as const;

/**
 * Fitness function weights and penalties
 */
export const FITNESS_WEIGHTS = {
  /** Balance-related penalties */
  BALANCE: {
    /** Penalty per dollar of final balance difference from target */
    FINAL_BALANCE_PENALTY: 100,
    /** Penalty for each day below minimum balance */
    VIOLATION_PENALTY: 5000,
    /** Buffer amount above minimum balance for critical days */
    CRITICAL_DAY_BUFFER: 200,
    /** Multiplier for overshoot penalty */
    OVERSHOOT_MULTIPLIER: 2,
  },
  /** Work day distribution penalties */
  WORK_DAYS: {
    /** Penalty per work day difference from ideal */
    WORK_DAY_DIFF_PENALTY: 200,
    /** Penalty for each consecutive day beyond threshold */
    CONSECUTIVE_DAY_PENALTY: 500,
    /** Maximum consecutive days before penalty */
    MAX_CONSECUTIVE_DAYS: 5,
    /** Penalty for gaps smaller than minimum */
    SMALL_GAP_PENALTY: 150,
    /** Minimum gap between work days */
    MIN_GAP_DAYS: 2,
    /** Gap variance weight */
    GAP_VARIANCE_WEIGHT: 150,
  },
  /** Clustering penalties */
  CLUSTERING: {
    /** Window size for clustering check */
    WINDOW_SIZE: 5,
    /** Maximum work days in window before penalty */
    MAX_WORK_DAYS_IN_WINDOW: 3,
    /** Penalty per extra work day in window */
    CLUSTERING_PENALTY: 300,
  },
} as const;

/**
 * Probability distributions for random schedule generation
 */
export const PROBABILITIES = {
  /** Crisis mode shift distributions */
  CRISIS_MODE: {
    /** Probability of double large shifts */
    DOUBLE_LARGE: 0.4,
    /** Probability of mixed large shifts */
    MIXED_LARGE: 0.4, // 0.8 - 0.4
    /** Probability of double medium shifts */
    DOUBLE_MEDIUM: 0.2, // 1.0 - 0.8
    /** In second pass */
    SECOND_PASS: {
      DOUBLE_LARGE: 0.3,
      MIXED_LARGE: 0.4, // 0.7 - 0.3
      DOUBLE_MEDIUM: 0.3, // 1.0 - 0.7
    },
  },
  /** Normal mode shift distributions */
  NORMAL_MODE: {
    /** Probability of large shift */
    LARGE_SHIFT: 0.6,
    /** Probability of medium shift */
    MEDIUM_SHIFT: 0.2, // 0.8 - 0.6
    /** Probability of small shift */
    SMALL_SHIFT: 0.2, // 1.0 - 0.8
  },
  /** Additional shift placement probabilities */
  SHIFT_PLACEMENT: {
    /** Probability of large shift when filling remaining days */
    FILL_LARGE: 0.5,
    /** Probability of medium shift when filling remaining days */
    FILL_MEDIUM: 0.3, // 0.8 - 0.5
    /** Probability of small shift when filling remaining days */
    FILL_SMALL: 0.2, // 1.0 - 0.8
  },
  /** Mutation probabilities */
  MUTATION: {
    /** Remove shift */
    REMOVE: 0.2,
    /** Change to small shift */
    TO_SMALL: 0.3, // 0.5 - 0.2
    /** Change to medium shift */
    TO_MEDIUM: 0.2, // 0.7 - 0.5
    /** Change to large shift */
    TO_LARGE: 0.15, // 0.85 - 0.7
    /** Add shift to empty day */
    ADD_SHIFT: 0.5,
    /** Probability to keep a well-spaced work day */
    KEEP_WELL_SPACED: 0.8,
    /** Probability to add work day adjacent to existing */
    ADD_ADJACENT: 0.2,
    /** Probability to remove a work day */
    REMOVE_WORK_DAY: 0.3,
  },
} as const;

/**
 * Critical day parameters
 */
export const CRITICAL_DAY_PARAMS = {
  /** Minimum days before critical day to schedule work */
  MIN_DAYS_BEFORE: 2,
  /** Maximum days before critical day to schedule work */
  MAX_DAYS_BEFORE: 5, // 4 + 2 - 1
  /** Random range for days before critical */
  RANDOM_RANGE: 4,
  /** Percentage of available days to use in crisis mode */
  CRISIS_MODE_USAGE: 0.9,
} as const;

/**
 * Server optimization constants
 */
export const SERVER_OPTIMIZATION = {
  /** Average earnings for double shift estimation */
  AVG_DOUBLE_SHIFT_EARNINGS: 150,
  /** Maximum request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000,
  /** Server endpoint */
  ENDPOINT: '/api/optimize',
  /** Retry attempts for failed requests */
  MAX_RETRIES: 2,
  /** Delay between retries in milliseconds */
  RETRY_DELAY: 1000,
} as const;

/**
 * UI/UX constants
 */
export const UI_CONSTANTS = {
  /** Panel resize constraints */
  PANELS: {
    /** Minimum panel width in pixels */
    MIN_WIDTH: 280,
    /** Default panel widths */
    DEFAULT_WIDTHS: {
      left: 320,
      center: 400,
      right: 600,
    },
    /** Gap between panels in pixels */
    PANEL_GAP: 16,
    /** Total gaps (2 gaps for 3 panels) */
    TOTAL_GAPS: 32,
    /** Resize handle dimensions */
    RESIZE_HANDLE: {
      WIDTH: 4,
      HEIGHT: 60,
      DIVIDER_WIDTH: 16,
      DIVIDER_WIDTH_MOBILE: 12,
      OFFSET_MOBILE: 6,
    },
  },
  /** Layout dimensions */
  LAYOUT: {
    /** Header height */
    HEADER_HEIGHT: 56,
    /** Mobile header height */
    HEADER_HEIGHT_MOBILE: 48,
    /** Mobile action bar height */
    ACTION_BAR_HEIGHT_MOBILE: 110,
    /** Minimum schedule panel height */
    MIN_SCHEDULE_HEIGHT: 400,
    /** Grid columns for different breakpoints */
    GRID_COLUMNS: {
      DESKTOP_LARGE: [300, 1.2, 2], // fr units
      DESKTOP: [280, 1, 1.8],
      TABLET: [260, 1, 1.5],
      MOBILE: '1fr', // Single column
    },
  },
  /** Responsive breakpoints */
  BREAKPOINTS: {
    /** Extra small devices */
    XS: 400,
    /** Small devices */
    SM: 640,
    /** Mobile breakpoint */
    MOBILE: 768,
    /** Tablet breakpoint */
    TABLET: 1024,
    /** Desktop breakpoint */
    DESKTOP: 1200,
    /** Large desktop */
    DESKTOP_LARGE: 1400,
  },
  /** Animation durations in milliseconds */
  ANIMATIONS: {
    /** Fast transitions */
    FAST: 200,
    /** Normal transitions */
    NORMAL: 300,
    /** Slow transitions */
    SLOW: 500,
    /** Panel resize transition */
    PANEL_RESIZE: 100,
    /** Modal fade in/out */
    MODAL_FADE: 200,
    /** Toast notification */
    TOAST_DURATION: 3000,
    /** Header show/hide */
    HEADER_TRANSITION: 400,
    /** Schedule table animations */
    SCHEDULE_FADE: 600,
    /** Loading spinner */
    SPINNER_ROTATION: 1000,
    /** Optimization progress delay */
    PROGRESS_DELAY: 500,
  },
  /** Z-index layers */
  Z_INDEX: {
    /** Resize divider */
    RESIZE_DIVIDER: 10,
    /** Sticky elements */
    STICKY: 100,
    /** Modal backdrop */
    MODAL_BACKDROP: 100,
    /** Modal content */
    MODAL_CONTENT: 1000,
    /** Toast notifications */
    TOAST: 1000,
  },
  /** Spacing scale (in pixels) */
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
  /** Font sizes (in rem) */
  FONT_SIZES: {
    XS: '0.7rem',
    SM: '0.75rem',
    BASE: '0.875rem',
    MD: '1rem',
    LG: '1.25rem',
    XL: '1.5rem',
  },
  /** Border radius values (in pixels) */
  BORDER_RADIUS: {
    SM: 4,
    MD: 6,
    LG: 8,
  },
  /** Shadow values */
  SHADOWS: {
    SM: '0 2px 4px',
    MD: '0 4px 8px',
    LG: '0 8px 16px',
    FOCUS: '0 0 0 3px',
  },
  /** Opacity values */
  OPACITY: {
    DISABLED: 0.5,
    HOVER: 0.8,
    SUBTLE: 0.6,
    HANDLE_DEFAULT: 0.3,
    HANDLE_HOVER: 1,
  },
  /** Component-specific dimensions */
  COMPONENTS: {
    /** Button dimensions */
    BUTTON: {
      HEIGHT: 40,
      HEIGHT_SM: 32,
      HEIGHT_LG: 48,
      MIN_WIDTH: 120,
      PADDING_X: 16,
      PADDING_Y: 8,
    },
    /** Input dimensions */
    INPUT: {
      HEIGHT: 36,
      PADDING_X: 10,
      PADDING_Y: 6,
    },
    /** Loading spinner */
    SPINNER: {
      SIZE: 40,
      BORDER_WIDTH: 3,
    },
    /** Table dimensions */
    TABLE: {
      CELL_HEIGHT: 44,
      HEADER_HEIGHT: 48,
    },
  },
} as const;

/**
 * Persistence and storage constants
 */
export const STORAGE_CONSTANTS = {
  /** localStorage keys */
  KEYS: {
    /** Panel sizes */
    PANEL_SIZES: 'panel-sizes',
    /** Schedule data */
    SCHEDULE_DATA: 'schedule-data',
    /** Configuration */
    CONFIGURATION: 'configuration',
    /** UI preferences */
    UI_PREFERENCES: 'ui-preferences',
  },
  /** Auto-save delay in milliseconds */
  AUTO_SAVE_DELAY: 1000,
  /** Maximum storage retries */
  MAX_STORAGE_RETRIES: 3,
} as const;

/**
 * Export formats and file extensions
 */
export const EXPORT_FORMATS = {
  /** CSV export settings */
  CSV: {
    EXTENSION: '.csv',
    MIME_TYPE: 'text/csv',
    DELIMITER: ',',
    LINE_ENDING: '\\n',
  },
  /** JSON export settings */
  JSON: {
    EXTENSION: '.json',
    MIME_TYPE: 'application/json',
    INDENT: 2,
  },
} as const;

/**
 * Validation constants
 */
export const VALIDATION = {
  /** Balance constraints */
  BALANCE: {
    MIN_STARTING: 0,
    MAX_STARTING: 1000000,
    MIN_TARGET: 0,
    MAX_TARGET: 1000000,
    MIN_MINIMUM: 0,
    MAX_MINIMUM: 1000000,
  },
  /** Expense/deposit constraints */
  TRANSACTIONS: {
    MIN_AMOUNT: 0,
    MAX_AMOUNT: 100000,
    MIN_DAY: SCHEDULE_CONSTANTS.MIN_DAY,
    MAX_DAY: SCHEDULE_CONSTANTS.MAX_DAY,
  },
} as const;

/**
 * Test configuration constants
 */
export const TEST_CONSTANTS = {
  /** Test timeouts in milliseconds */
  TIMEOUTS: {
    DEFAULT: 100,
    INTEGRATION: 1000,
    E2E: 5000,
  },
  /** Test viewport sizes */
  VIEWPORTS: {
    DESKTOP: { width: 1920, height: 1080 },
    TABLET: { width: 768, height: 1024 },
    MOBILE: { width: 375, height: 667 },
  },
} as const;

/**
 * Logging and debugging constants
 */
export const DEBUG_CONSTANTS = {
  /** Log viewer refresh interval */
  LOG_REFRESH_INTERVAL: 1000,
  /** Maximum number of logs to store in memory */
  MAX_STORED_LOGS: 1000,
  /** Console log colors */
  LOG_COLORS: {
    INFO: 'blue',
    WARN: 'orange',
    ERROR: 'red',
    SUCCESS: 'green',
  },
} as const;

/**
 * Performance and optimization constants
 */
export const PERFORMANCE_CONSTANTS = {
  /** Debounce delays in milliseconds */
  DEBOUNCE: {
    INPUT: 300,
    RESIZE: 100,
    SCROLL: 50,
  },
  /** Throttle limits in milliseconds */
  THROTTLE: {
    PROGRESS_UPDATE: 100,
    SAVE: 1000,
  },
  /** Worker configuration */
  WORKER: {
    /** Maximum concurrent workers */
    MAX_WORKERS: navigator.hardwareConcurrency || 4,
    /** Worker message timeout */
    MESSAGE_TIMEOUT: 30000,
  },
} as const;

/**
 * Currency formatting constants
 */
export const CURRENCY_CONSTANTS = {
  /** Default currency code */
  DEFAULT_CURRENCY: 'USD',
  /** Currency display options */
  DISPLAY: {
    SYMBOL: '$',
    DECIMAL_PLACES: 2,
    THOUSANDS_SEPARATOR: ',',
    DECIMAL_SEPARATOR: '.',
  },
} as const;

/**
 * Date and time constants
 */
export const DATE_CONSTANTS = {
  /** Date format patterns */
  FORMATS: {
    SHORT: 'MM/DD',
    LONG: 'MM/DD/YYYY',
    TIME: 'HH:mm:ss',
    DATETIME: 'MM/DD/YYYY HH:mm:ss',
  },
  /** Time conversion factors */
  TIME_UNITS: {
    MS_PER_SECOND: 1000,
    MS_PER_MINUTE: 60000,
    MS_PER_HOUR: 3600000,
    MS_PER_DAY: 86400000,
  },
} as const;

/**
 * Server and API constants
 */
export const API_CONSTANTS = {
  /** API endpoints */
  ENDPOINTS: {
    OPTIMIZE: '/api/optimize',
    HEALTH: '/api/health',
  },
  /** HTTP methods */
  METHODS: {
    GET: 'GET',
    POST: 'POST',
    OPTIONS: 'OPTIONS',
  },
  /** Response codes */
  STATUS_CODES: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
  /** Server configuration */
  SERVER: {
    PORT: 3001,
    HOST: 'localhost',
  },
} as const;

/**
 * Type exports for better type safety
 */
export type ScheduleConstants = typeof SCHEDULE_CONSTANTS;
export type ShiftValues = typeof SHIFT_VALUES;
export type GeneticAlgorithmParams = typeof GENETIC_ALGORITHM;
export type FitnessWeights = typeof FITNESS_WEIGHTS;
export type Probabilities = typeof PROBABILITIES;
export type CriticalDayParams = typeof CRITICAL_DAY_PARAMS;
export type ServerOptimization = typeof SERVER_OPTIMIZATION;
export type UIConstants = typeof UI_CONSTANTS;
export type StorageConstants = typeof STORAGE_CONSTANTS;
export type ExportFormats = typeof EXPORT_FORMATS;
export type ValidationConstants = typeof VALIDATION;
export type TestConstants = typeof TEST_CONSTANTS;
export type DebugConstants = typeof DEBUG_CONSTANTS;
export type PerformanceConstants = typeof PERFORMANCE_CONSTANTS;
export type CurrencyConstants = typeof CURRENCY_CONSTANTS;
export type DateConstants = typeof DATE_CONSTANTS;
export type ApiConstants = typeof API_CONSTANTS;
