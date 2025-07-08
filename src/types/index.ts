export interface Shift {
  gross: number;
  net: number;
}

export interface ShiftTypes {
  large: Shift;
  medium: Shift;
  small: Shift;
}

export interface Expense {
  day: number;
  name: string;
  amount: number;
}

export interface Deposit {
  day: number;
  amount: number;
}

export interface DaySchedule {
  day: number;
  shifts: string[];
  earnings: number;
  expenses: number;
  deposit: number;
  startBalance: number;
  endBalance: number;
}

export interface ManualConstraint {
  shifts?: string | null;
  fixedEarnings?: number;
  fixedExpenses?: number;
  fixedBalance?: number;
}

export interface OptimizationConfig {
  startingBalance: number;
  targetEndingBalance: number;
  minimumBalance: number;
  populationSize: number;
  generations: number;
  manualConstraints?: Record<number, ManualConstraint>;
  balanceEditDay?: number;
  newStartingBalance?: number;
  debugFitness?: boolean;
}

export interface OptimizationProgress {
  generation: number;
  progress: number;
  bestFitness: number;
  workDays: number;
  balance: number;
  violations: number;
  message?: string;
}

export interface OptimizationResult {
  schedule: (string | null)[];
  workDays: number[];
  totalEarnings: number;
  finalBalance: number;
  minBalance: number;
  violations: number;
  computationTime?: string;
  formattedSchedule: DaySchedule[];
}

export interface ChromosomeFitness {
  fitness: number;
  balance: number;
  workDays: number;
  violations: number;
  totalEarnings: number;
  minBalance: number;
  workDaysList: number[];
}

export interface Individual {
  chromosome: (string | null)[];
  fitness: ChromosomeFitness;
}

export interface FitnessContext {
  balance: number;
  workDays: number;
  violations: number;
  totalEarnings: number;
  minBalance: number;
  workDaysList: number[];
  inCrisisMode: boolean;
  targetEndingBalance: number;
  minimumBalance: number;
  requiredFlexNet: number;
  balanceEditDay?: number | null;
}

export interface Edit {
  day: number;
  field: 'earnings' | 'expenses' | 'balance' | 'notes' | 'shifts' | 'deposit';
  originalValue: string | number | string[];
  newValue: string | number | string[];
}

export interface GenerationStatistics {
  generation: number;
  timestamp: number;
  fitness: number;
  workDays: number;
  violations: number;
  balance: number;
}
