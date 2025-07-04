/**
 * User-editable configuration file for overriding default constants.
 *
 * This file allows you to customize algorithm behavior, UI settings, and other
 * application parameters without modifying the core code.
 *
 * To override a value:
 * 1. Uncomment the section you want to modify
 * 2. Change the values as needed
 * 3. The application will use your values instead of the defaults
 *
 * @module user-config
 */

import * as DEFAULT_CONSTANTS from './constants';

/**
 * User configuration overrides
 * Uncomment and modify any section you want to customize
 */
export const USER_CONFIG: Partial<typeof DEFAULT_CONSTANTS> = {
  // Example: Modify genetic algorithm parameters
  // GENETIC_ALGORITHM: {
  //   POPULATION_SIZE: 300,      // Increase population for better solutions
  //   GENERATIONS: 1000,         // Run more generations
  //   MUTATION_RATE: 0.1,        // Lower mutation rate
  //   TOURNAMENT_SIZE: 10,       // Larger tournament size
  // },
  // Example: Adjust fitness weights
  // FITNESS_WEIGHTS: {
  //   BALANCE: {
  //     VIOLATION_PENALTY: 10000,  // Increase penalty for balance violations
  //   },
  //   WORK_DAYS: {
  //     CONSECUTIVE_DAY_PENALTY: 1000,  // Increase penalty for consecutive days
  //   },
  // },
  // Example: Change UI settings
  // UI_CONSTANTS: {
  //   PANELS: {
  //     DEFAULT_WIDTHS: {
  //       left: 400,    // Wider configuration panel
  //       center: 500,  // Wider results panel
  //       right: 700,   // Wider schedule panel
  //     },
  //   },
  //   ANIMATIONS: {
  //     FAST: 100,      // Faster animations
  //     NORMAL: 200,
  //     SLOW: 400,
  //   },
  // },
  // Example: Modify shift values
  // SHIFT_VALUES: {
  //   large: {
  //     net: 90,       // Higher pay for large shifts
  //     gross: 100,
  //     value: 90,
  //   },
  //   medium: {
  //     net: 70,
  //     gross: 80,
  //     value: 70,
  //   },
  // },
  // Example: Adjust probabilities
  // PROBABILITIES: {
  //   NORMAL_MODE: {
  //     LARGE_SHIFT: 0.7,   // Prefer more large shifts
  //     MEDIUM_SHIFT: 0.2,
  //     SMALL_SHIFT: 0.1,
  //   },
  // },
};

/**
 * Simple merge utility to combine user config with defaults
 */
function mergeConfig<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  return { ...target, ...source };
}

/**
 * Merged configuration (defaults + user overrides)
 */
export const CONFIG = mergeConfig(DEFAULT_CONSTANTS, USER_CONFIG as any);

// Re-export individual merged constants for convenience
export const SCHEDULE_CONSTANTS = CONFIG.SCHEDULE_CONSTANTS;
export const SHIFT_VALUES = CONFIG.SHIFT_VALUES;
export const GENETIC_ALGORITHM = CONFIG.GENETIC_ALGORITHM;
export const FITNESS_WEIGHTS = CONFIG.FITNESS_WEIGHTS;
export const PROBABILITIES = CONFIG.PROBABILITIES;
export const CRITICAL_DAY_PARAMS = CONFIG.CRITICAL_DAY_PARAMS;
export const SERVER_OPTIMIZATION = CONFIG.SERVER_OPTIMIZATION;
export const UI_CONSTANTS = CONFIG.UI_CONSTANTS;
export const STORAGE_CONSTANTS = CONFIG.STORAGE_CONSTANTS;
export const EXPORT_FORMATS = CONFIG.EXPORT_FORMATS;
export const VALIDATION = CONFIG.VALIDATION;
export const TEST_CONSTANTS = CONFIG.TEST_CONSTANTS;
export const DEBUG_CONSTANTS = CONFIG.DEBUG_CONSTANTS;
export const PERFORMANCE_CONSTANTS = CONFIG.PERFORMANCE_CONSTANTS;
export const CURRENCY_CONSTANTS = CONFIG.CURRENCY_CONSTANTS;
export const DATE_CONSTANTS = CONFIG.DATE_CONSTANTS;
export const API_CONSTANTS = CONFIG.API_CONSTANTS;
