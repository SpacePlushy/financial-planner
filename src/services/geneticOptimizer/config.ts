// Configuration constants for the genetic optimizer

export const SCHEDULE_CONSTANTS = {
  MIN_DAY: 1,
  MAX_DAY: 30,
  DAY_ARRAY_SIZE: 31, // Array size includes index 0 which is unused
} as const;

export const FITNESS_WEIGHTS = {
  BALANCE: {
    CRITICAL_DAY_BUFFER: 200,
    TARGET_TOLERANCE: 5,
  },
  VIOLATIONS: {
    PENALTY: 1000,
  },
  WORK_DAYS: {
    PENALTY: 100,
  },
  EARNINGS: {
    PENALTY: 1,
  },
  SPACING: {
    PENALTY: 50,
  },
} as const;

export const CRITICAL_DAY_PARAMS = {
  RANDOM_RANGE: 4,
  MIN_DAYS_BEFORE: 2,
} as const;

export const PROBABILITIES = {
  CRISIS_MODE: {
    LARGE_LARGE: 0.4,
    MIXED_SHIFTS: 0.8,
    MIN_WORK_DAYS_RATIO: 0.9,
    LARGE_LARGE_MUTATE: 0.3,
    MIXED_SHIFTS_MUTATE: 0.7,
  },
  NORMAL_MODE: {
    LARGE: 0.6,
    MEDIUM: 0.8,
    SMALL_INITIAL: 0.2,
    MEDIUM_MUTATE: 0.5,
    MEDIUM_DOUBLE_MUTATE: 0.7,
    LARGE_MUTATE: 0.85,
    DOUBLE_SHIFT: 0.3,
  },
  MUTATION: {
    KEEP_WELL_SPACED: 0.8,
    ADD_ADJACENT: 0.2,
    REMOVE_WORK_DAY: 0.2,
  },
} as const;

export const GENETIC_ALGORITHM_PARAMS = {
  ELITE_SIZE_RATIO: 0.1,
  TOURNAMENT_SIZE_RATIO: 0.05,
  MIN_TOURNAMENT_SIZE: 3,
  CONVERGENCE_THRESHOLD: 0.99,
  MIN_GENERATIONS_BEFORE_TERMINATION: 300,
  MAX_GENERATIONS_WITHOUT_IMPROVEMENT: 150,
  PROGRESS_UPDATE_INTERVAL: 50,
  PROGRESS_UPDATE_DELAY: 10,
} as const;

// Double shift net values (for calculating averages)
export const DOUBLE_SHIFT_NET_VALUES = {
  large_large: 173,
  medium_large: 154,
  large_medium: 154,
  medium_medium: 135,
} as const;

// Constraint penalty multipliers
export const CONSTRAINT_PENALTY_MULTIPLIERS = {
  CRISIS_MODE: 0.01,
  NORMAL_MODE: 10000,
} as const;
