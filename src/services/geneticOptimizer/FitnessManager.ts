import { FitnessContext } from '../../types';

interface FitnessStrategy {
  name: string;
  evaluate(chromosome: (string | null)[], context: FitnessContext): number;
}

class NormalFitnessStrategy implements FitnessStrategy {
  name = 'Normal Mode';

  evaluate(chromosome: (string | null)[], context: FitnessContext): number {
    const {
      balance,
      workDays,
      violations,
      minBalance,
      workDaysList,
      targetEndingBalance,
      minimumBalance,
    } = context;

    const finalBalanceDiff = Math.abs(balance - targetEndingBalance);
    const workDayPenalty = workDays * 30;

    // Calculate consecutive work penalty with progressive scaling
    const gaps: number[] = [];
    for (let i = 1; i < workDaysList.length; i++) {
      gaps.push(workDaysList[i] - workDaysList[i - 1]);
    }
    // Increased penalty for consecutive days and progressive penalty for multiple consecutive
    let consecutivePenalty = 0;
    let currentStreak = 0;
    for (const gap of gaps) {
      if (gap === 1) {
        currentStreak++;
        // Progressive penalty: 200 for first consecutive, 400 for second, 600 for third, etc.
        consecutivePenalty += 200 * currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    // Calculate work distribution variance with stronger penalties
    let gapVariance = 0;
    let tooSmallGapsPenalty = 0;
    if (gaps.length > 0) {
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      gapVariance =
        gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) /
        gaps.length;

      // Additional penalty for gaps that are too small (less than 2 days)
      tooSmallGapsPenalty = gaps.filter(g => g < 2).length * 150;
    }

    // Calculate clustering penalty (too many work days in a 5-day window)
    let clusteringPenalty = 0;
    for (let day = 1; day <= 26; day++) {
      let workDaysInWindow = 0;
      for (const workDay of workDaysList) {
        if (workDay >= day && workDay < day + 5) {
          workDaysInWindow++;
        }
      }
      // Penalize if more than 3 work days in any 5-day window
      if (workDaysInWindow > 3) {
        clusteringPenalty += (workDaysInWindow - 3) * 300;
      }
    }

    // Apply progressive penalty for overshooting
    let balancePenalty = finalBalanceDiff * 100;
    if (balance > targetEndingBalance) {
      // Extra penalty for overshooting
      const overshootRatio =
        (balance - targetEndingBalance) / targetEndingBalance;
      balancePenalty *= 1 + overshootRatio * 2;
    }

    return (
      violations * 5000 +
      balancePenalty +
      workDayPenalty +
      consecutivePenalty +
      Math.sqrt(gapVariance) * 150 +
      tooSmallGapsPenalty +
      clusteringPenalty +
      (minBalance < minimumBalance
        ? Math.abs(minBalance - minimumBalance) * 100
        : 0)
    );
  }
}

class CrisisFitnessStrategy implements FitnessStrategy {
  name = 'Crisis Mode';

  evaluate(chromosome: (string | null)[], context: FitnessContext): number {
    const {
      balance,
      violations,
      totalEarnings,
      minBalance,
      workDaysList,
      targetEndingBalance,
      minimumBalance,
      requiredFlexNet,
      balanceEditDay,
    } = context;

    const belowTargetPenalty =
      balance < targetEndingBalance
        ? (targetEndingBalance - balance) * 1000
        : 0;
    const aboveTargetPenalty =
      balance > targetEndingBalance ? (balance - targetEndingBalance) * 500 : 0;

    const earningsShortfall = Math.max(0, requiredFlexNet - totalEarnings);

    // Calculate work day deficit
    const startDay = balanceEditDay ? balanceEditDay + 1 : 1;
    const availableDays = balanceEditDay ? 30 - balanceEditDay : 30;
    const avgDoubleShiftEarnings = (173 + 154 + 135) / 3;
    const minWorkDaysNeeded = Math.max(
      Math.floor(availableDays * 0.9),
      Math.ceil(requiredFlexNet / avgDoubleShiftEarnings)
    );
    const actualWorkDaysAfterEdit = workDaysList.filter(
      d => d >= startDay
    ).length;
    const workDayDeficit = Math.max(
      0,
      minWorkDaysNeeded - actualWorkDaysAfterEdit
    );

    return (
      violations * 10000 +
      belowTargetPenalty +
      aboveTargetPenalty +
      earningsShortfall * 100 +
      workDayDeficit * 1000 +
      (minBalance < minimumBalance
        ? Math.abs(minBalance - minimumBalance) * 200
        : 0)
    );
  }
}

export class FitnessManager {
  private strategies: Map<string, FitnessStrategy>;
  private debugEnabled: boolean;

  constructor() {
    this.strategies = new Map();
    this.strategies.set('normal', new NormalFitnessStrategy());
    this.strategies.set('crisis', new CrisisFitnessStrategy());
    this.debugEnabled = false;
  }

  enableDebug(): void {
    this.debugEnabled = true;
  }

  disableDebug(): void {
    this.debugEnabled = false;
  }

  evaluateChromosome(
    chromosome: (string | null)[],
    context: FitnessContext
  ): number {
    const strategyKey = context.inCrisisMode ? 'crisis' : 'normal';
    const strategy = this.strategies.get(strategyKey)!;

    // Debug logging removed for production

    const fitness = strategy.evaluate(chromosome, context);

    // Debug logging removed for production

    return fitness;
  }
}
