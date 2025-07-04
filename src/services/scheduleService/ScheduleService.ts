import {
  DaySchedule,
  Edit,
  ManualConstraint,
  OptimizationConfig,
  ShiftTypes,
} from '../../types';
import { logger } from '../../utils/logger';

export class ScheduleService {
  private shifts: ShiftTypes = {
    large: { gross: 94.5, net: 86.5 },
    medium: { gross: 75.5, net: 67.5 },
    small: { gross: 64.0, net: 56.0 },
  };

  applyEditsToSchedule(
    schedule: DaySchedule[],
    edits: Edit[],
    config: OptimizationConfig
  ): DaySchedule[] {
    logger.info('ScheduleService', 'Applying edits to schedule', {
      editsCount: edits.length,
      scheduleLength: schedule.length,
    });

    const updatedSchedule = [...schedule];
    let recalculateFrom = 31;

    // Apply edits
    for (const edit of edits) {
      const dayIndex = edit.day - 1;
      if (dayIndex < 0 || dayIndex >= updatedSchedule.length) {
        logger.warn('ScheduleService', 'Edit day out of range', { edit });
        continue;
      }

      const day = updatedSchedule[dayIndex];

      logger.debug('ScheduleService', 'Applying edit', {
        day: edit.day,
        field: edit.field,
        oldValue: edit.originalValue,
        newValue: edit.newValue,
      });

      switch (edit.field) {
        case 'earnings':
          day.earnings = parseFloat(edit.newValue.toString());
          recalculateFrom = Math.min(recalculateFrom, edit.day);
          break;
        case 'expenses':
          day.expenses = parseFloat(edit.newValue.toString());
          recalculateFrom = Math.min(recalculateFrom, edit.day);
          break;
        case 'balance':
          day.endBalance = parseFloat(edit.newValue.toString());
          recalculateFrom = Math.min(recalculateFrom, edit.day + 1);
          break;
        case 'notes':
          // Notes don't affect calculations
          break;
      }
    }

    // Recalculate balances from the earliest edit
    if (recalculateFrom <= 30) {
      logger.debug('ScheduleService', 'Recalculating balances', {
        recalculateFrom,
        startingBalance: config.startingBalance,
      });

      let balance =
        recalculateFrom === 1
          ? config.startingBalance
          : updatedSchedule[recalculateFrom - 2].endBalance;

      for (let i = recalculateFrom - 1; i < updatedSchedule.length; i++) {
        const day = updatedSchedule[i];
        day.startBalance = balance;
        balance += day.deposit + day.earnings - day.expenses;
        day.endBalance = balance;
      }
    }

    logger.info('ScheduleService', 'Edits applied successfully', {
      finalBalance: updatedSchedule[updatedSchedule.length - 1].endBalance,
    });

    return updatedSchedule;
  }

  generateManualConstraints(
    schedule: DaySchedule[],
    edits: Edit[]
  ): Record<number, ManualConstraint> {
    logger.info('ScheduleService', 'Generating manual constraints from edits', {
      editsCount: edits.length,
    });

    const constraints: Record<number, ManualConstraint> = {};

    for (const edit of edits) {
      if (!constraints[edit.day]) {
        constraints[edit.day] = {};
      }

      switch (edit.field) {
        case 'earnings':
          const earnings = parseFloat(edit.newValue.toString());
          if (earnings === 0) {
            constraints[edit.day].shifts = null;
          } else {
            // Try to match earnings to shift combinations
            const shiftCombination = this.findShiftCombination(earnings);
            if (shiftCombination) {
              constraints[edit.day].shifts = shiftCombination;
              logger.debug(
                'ScheduleService',
                'Matched earnings to shift combination',
                {
                  day: edit.day,
                  earnings,
                  shifts: shiftCombination,
                }
              );
            } else {
              constraints[edit.day].fixedEarnings = earnings;
              logger.debug(
                'ScheduleService',
                'Could not match earnings to shifts, using fixed earnings',
                {
                  day: edit.day,
                  earnings,
                }
              );
            }
          }
          break;
        case 'expenses':
          constraints[edit.day].fixedExpenses = parseFloat(
            edit.newValue.toString()
          );
          break;
        case 'balance':
          constraints[edit.day].fixedBalance = parseFloat(
            edit.newValue.toString()
          );
          break;
      }
    }

    logger.info('ScheduleService', 'Generated constraints', {
      constraintDays: Object.keys(constraints).length,
    });

    return constraints;
  }

  private findShiftCombination(targetEarnings: number): string | null {
    const tolerance = 1;

    // Single shifts
    if (Math.abs(targetEarnings - this.shifts.small.net) < tolerance) {
      return 'small';
    }
    if (Math.abs(targetEarnings - this.shifts.medium.net) < tolerance) {
      return 'medium';
    }
    if (Math.abs(targetEarnings - this.shifts.large.net) < tolerance) {
      return 'large';
    }

    // Double shifts
    const combinations = [
      { shifts: 'small+small', total: this.shifts.small.net * 2 },
      {
        shifts: 'small+medium',
        total: this.shifts.small.net + this.shifts.medium.net,
      },
      {
        shifts: 'small+large',
        total: this.shifts.small.net + this.shifts.large.net,
      },
      { shifts: 'medium+medium', total: this.shifts.medium.net * 2 },
      {
        shifts: 'medium+large',
        total: this.shifts.medium.net + this.shifts.large.net,
      },
      { shifts: 'large+large', total: this.shifts.large.net * 2 },
    ];

    for (const combo of combinations) {
      if (Math.abs(targetEarnings - combo.total) < tolerance) {
        return combo.shifts;
      }
    }

    return null;
  }

  validateSchedule(
    schedule: DaySchedule[],
    config: OptimizationConfig
  ): {
    isValid: boolean;
    violations: string[];
  } {
    logger.info('ScheduleService', 'Validating schedule', {
      scheduleLength: schedule.length,
      targetBalance: config.targetEndingBalance,
      minimumBalance: config.minimumBalance,
    });

    const violations: string[] = [];
    let balance = config.startingBalance;

    for (const day of schedule) {
      // Check minimum balance
      if (day.endBalance < config.minimumBalance) {
        violations.push(
          `Day ${day.day}: Balance ($${day.endBalance.toFixed(
            2
          )}) below minimum ($${config.minimumBalance.toFixed(2)})`
        );
      }

      // Verify balance calculation
      const expectedBalance =
        balance + day.deposit + day.earnings - day.expenses;
      if (Math.abs(expectedBalance - day.endBalance) > 0.01) {
        violations.push(`Day ${day.day}: Balance calculation mismatch`);
      }

      balance = day.endBalance;
    }

    // Check final balance
    const finalBalance = schedule[schedule.length - 1].endBalance;
    if (
      Math.abs(finalBalance - config.targetEndingBalance) >
      config.targetEndingBalance * 0.1
    ) {
      violations.push(
        `Final balance ($${finalBalance.toFixed(
          2
        )}) significantly differs from target ($${config.targetEndingBalance.toFixed(
          2
        )})`
      );
    }

    const result = {
      isValid: violations.length === 0,
      violations,
    };

    logger.info('ScheduleService', 'Validation complete', {
      isValid: result.isValid,
      violationsCount: violations.length,
    });

    if (violations.length > 0) {
      logger.warn('ScheduleService', 'Schedule validation failed', {
        violations,
      });
    }

    return result;
  }

  calculateMetrics(schedule: DaySchedule[]): {
    totalWorkDays: number;
    totalEarnings: number;
    totalExpenses: number;
    averageBalance: number;
    minBalance: number;
    maxBalance: number;
  } {
    const startTime = Date.now();
    logger.debug('ScheduleService', 'Calculating schedule metrics');

    let totalWorkDays = 0;
    let totalEarnings = 0;
    let totalExpenses = 0;
    let balanceSum = 0;
    let minBalance = Infinity;
    let maxBalance = -Infinity;

    for (const day of schedule) {
      if (day.shifts.length > 0) {
        totalWorkDays++;
      }
      totalEarnings += day.earnings;
      totalExpenses += day.expenses;
      balanceSum += day.endBalance;
      minBalance = Math.min(minBalance, day.endBalance);
      maxBalance = Math.max(maxBalance, day.endBalance);
    }

    const metrics = {
      totalWorkDays,
      totalEarnings,
      totalExpenses,
      averageBalance: balanceSum / schedule.length,
      minBalance,
      maxBalance,
    };

    const executionTime = Date.now() - startTime;
    logger.logAction('ScheduleService', 'calculateMetrics', {
      metrics,
      executionTime: `${executionTime}ms`,
    });

    return metrics;
  }

  exportSchedule(schedule: DaySchedule[]): string {
    logger.info('ScheduleService', 'Exporting schedule to CSV', {
      scheduleLength: schedule.length,
    });

    const headers = [
      'Day',
      'Shifts',
      'Earnings',
      'Expenses',
      'Deposit',
      'End Balance',
    ];
    const rows = [headers.join(',')];

    for (const day of schedule) {
      const row = [
        day.day,
        day.shifts ? day.shifts.join('+') || 'Off' : 'Off',
        day.earnings ? day.earnings.toFixed(2) : '0.00',
        day.expenses ? day.expenses.toFixed(2) : '0.00',
        day.deposit ? day.deposit.toFixed(2) : '0.00',
        day.endBalance ? day.endBalance.toFixed(2) : '0.00',
      ];
      rows.push(row.join(','));
    }

    const csvContent = rows.join('\n');

    logger.debug('ScheduleService', 'Export complete', {
      rowCount: rows.length,
      csvLength: csvContent.length,
    });

    return csvContent;
  }
}
