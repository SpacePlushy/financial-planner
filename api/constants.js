/**
 * Constants for the API optimize function
 * This is a CommonJS module compatible with Vercel serverless functions
 */

// Schedule and calendar constants
const SCHEDULE_CONSTANTS = {
  MIN_DAY: 1,
  MAX_DAY: 30,
  DAY_ARRAY_SIZE: 31,
  WEEK_START_DAY: 0,
  DAYS_IN_WEEK: 7,
};

// Default shift type values (in dollars)
const SHIFT_VALUES = {
  large: {
    net: 86.5,
    gross: 94.5,
    value: 86.5,
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
};

// Genetic algorithm parameters
const GENETIC_ALGORITHM = {
  POPULATION_SIZE: 200,
  GENERATIONS: 500,
  MUTATION_RATE: 0.15,
  CROSSOVER_RATE: 0.7,
  ELITE_PERCENTAGE: 0.2,
  MIN_ELITE_SIZE: 30,
  TOURNAMENT_SIZE: 7,
  STAGNATION_LIMIT: 150,
  IMPROVEMENT_THRESHOLD: 0.99,
  EARLY_TERMINATION: {
    FIRST_CHECK: 300,
    SECOND_CHECK: 100,
    FINAL_CHECK: 50,
    FITNESS_THRESHOLD: 1000,
    EXTENDED_THRESHOLD: 100,
    BALANCE_TOLERANCE: 5,
  },
  PROGRESS_INTERVAL: 50,
  LOG_INTERVAL: 100,
  WORKER_TIMEOUT: 10,
};

// Fitness function weights and penalties
const FITNESS_WEIGHTS = {
  BALANCE: {
    FINAL_BALANCE_PENALTY: 100,
    VIOLATION_PENALTY: 5000,
    CRITICAL_DAY_BUFFER: 200,
    OVERSHOOT_MULTIPLIER: 2,
  },
  WORK_DAYS: {
    WORK_DAY_DIFF_PENALTY: 200,
    CONSECUTIVE_DAY_PENALTY: 500,
    MAX_CONSECUTIVE_DAYS: 5,
    SMALL_GAP_PENALTY: 150,
    MIN_GAP_DAYS: 2,
    GAP_VARIANCE_WEIGHT: 150,
  },
  CLUSTERING: {
    WINDOW_SIZE: 5,
    MAX_WORK_DAYS_IN_WINDOW: 3,
    CLUSTERING_PENALTY: 300,
  },
};

// Probability distributions
const PROBABILITIES = {
  CRISIS_MODE: {
    DOUBLE_LARGE: 0.4,
    MIXED_LARGE: 0.4,
    DOUBLE_MEDIUM: 0.2,
    SECOND_PASS: {
      DOUBLE_LARGE: 0.3,
      MIXED_LARGE: 0.4,
      DOUBLE_MEDIUM: 0.3,
    },
  },
  NORMAL_MODE: {
    LARGE_SHIFT: 0.6,
    MEDIUM_SHIFT: 0.2,
    SMALL_SHIFT: 0.2,
  },
  SHIFT_PLACEMENT: {
    FILL_LARGE: 0.5,
    FILL_MEDIUM: 0.3,
    FILL_SMALL: 0.2,
  },
  MUTATION: {
    REMOVE: 0.2,
    TO_SMALL: 0.3,
    TO_MEDIUM: 0.2,
    TO_LARGE: 0.15,
    ADD_SHIFT: 0.5,
  },
};

// Critical day parameters
const CRITICAL_DAY_PARAMS = {
  MIN_DAYS_BEFORE: 2,
  MAX_DAYS_BEFORE: 5,
  RANDOM_RANGE: 4,
  CRISIS_MODE_USAGE: 0.9,
};

// Server optimization constants
const SERVER_OPTIMIZATION = {
  AVG_DOUBLE_SHIFT_EARNINGS: 150,
  REQUEST_TIMEOUT: 30000,
  ENDPOINT: '/api/optimize',
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000,
};

// API constants
const API_CONSTANTS = {
  ENDPOINTS: {
    OPTIMIZE: '/api/optimize',
    HEALTH: '/api/health',
  },
  METHODS: {
    GET: 'GET',
    POST: 'POST',
    OPTIONS: 'OPTIONS',
  },
  STATUS_CODES: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
  SERVER: {
    PORT: 3001,
    HOST: 'localhost',
  },
};

module.exports = {
  SCHEDULE_CONSTANTS,
  SHIFT_VALUES,
  GENETIC_ALGORITHM,
  FITNESS_WEIGHTS,
  PROBABILITIES,
  CRITICAL_DAY_PARAMS,
  SERVER_OPTIMIZATION,
  API_CONSTANTS,
};