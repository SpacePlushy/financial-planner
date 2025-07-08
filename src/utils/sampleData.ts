import { Expense, Deposit, ShiftTypes } from '../types';

/**
 * Default shift types for the schedule optimizer
 */
export const DEFAULT_SHIFT_TYPES: ShiftTypes = {
  large: { gross: 94.5, net: 86.5 },
  medium: { gross: 75.5, net: 67.5 },
  small: { gross: 64.0, net: 56.0 },
};

/**
 * Sample expenses for demonstration purposes
 * Contains detailed fixed expenses and recurring payments
 */
export const SAMPLE_EXPENSES: Expense[] = [
  // Fixed Expenses
  { day: 1, name: 'Auto Insurance', amount: 177 },
  { day: 2, name: 'YouTube Premium', amount: 8 },
  { day: 8, name: 'Paramount Plus', amount: 12 },
  { day: 8, name: 'iPad AppleCare', amount: 8.49 },
  { day: 10, name: 'Streaming Services', amount: 230 },
  { day: 11, name: 'Cat Food', amount: 40 },
  { day: 14, name: 'iPad AppleCare', amount: 8.49 },
  { day: 16, name: 'Cat Food', amount: 40 },
  { day: 17, name: 'Car Payment', amount: 463 },
  { day: 22, name: 'Cell Phone', amount: 177 },
  { day: 23, name: 'Cat Food', amount: 40 },
  { day: 24, name: 'AI Subscription', amount: 220 },
  { day: 25, name: 'Electric', amount: 139 },
  { day: 25, name: 'Ring Subscription', amount: 10 },
  { day: 28, name: 'iPhone AppleCare', amount: 13.49 },
  { day: 29, name: 'Internet', amount: 30 },
  { day: 29, name: 'Cat Food', amount: 40 },
  { day: 30, name: 'Rent', amount: 1636 },

  // Recurring Payments
  { day: 5, name: 'Groceries', amount: 112.5 },
  { day: 5, name: 'Weed', amount: 20 },
  { day: 12, name: 'Groceries', amount: 112.5 },
  { day: 12, name: 'Weed', amount: 20 },
  { day: 19, name: 'Groceries', amount: 112.5 },
  { day: 19, name: 'Weed', amount: 20 },
  { day: 26, name: 'Groceries', amount: 112.5 },
  { day: 26, name: 'Weed', amount: 20 },
];

/**
 * Sample deposits for demonstration purposes
 * Includes mom's biweekly income deposits
 */
export const SAMPLE_DEPOSITS: Deposit[] = [
  // Mom's Biweekly Deposits
  { day: 11, amount: 1356 },
  { day: 25, amount: 1356 },
];

/**
 * Get default configuration data
 */
export function getDefaultData() {
  return {
    shiftTypes: DEFAULT_SHIFT_TYPES,
    expenses: SAMPLE_EXPENSES,
    deposits: SAMPLE_DEPOSITS,
  };
}

/**
 * Get empty data (for users who want to start fresh)
 */
export function getEmptyData() {
  return {
    shiftTypes: DEFAULT_SHIFT_TYPES,
    expenses: [] as Expense[],
    deposits: [] as Deposit[],
  };
}

/**
 * Calculate total monthly expenses
 */
export function calculateTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

/**
 * Calculate total monthly deposits
 */
export function calculateTotalDeposits(deposits: Deposit[]): number {
  return deposits.reduce((total, deposit) => total + deposit.amount, 0);
}

/**
 * Get expenses for a specific day
 */
export function getExpensesForDay(expenses: Expense[], day: number): Expense[] {
  return expenses.filter(expense => expense.day === day);
}

/**
 * Get deposits for a specific day
 */
export function getDepositsForDay(deposits: Deposit[], day: number): Deposit[] {
  return deposits.filter(deposit => deposit.day === day);
}

/**
 * Validate expense data
 */
export function validateExpense(expense: Expense): string[] {
  const errors: string[] = [];

  if (expense.day < 1 || expense.day > 31) {
    errors.push('Day must be between 1 and 31');
  }

  if (!expense.name.trim()) {
    errors.push('Expense name is required');
  }

  if (expense.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  return errors;
}

/**
 * Validate deposit data
 */
export function validateDeposit(deposit: Deposit): string[] {
  const errors: string[] = [];

  if (deposit.day < 1 || deposit.day > 31) {
    errors.push('Day must be between 1 and 31');
  }

  if (deposit.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  return errors;
}
