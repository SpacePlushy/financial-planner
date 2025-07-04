import {
  OptimizationConfig,
  OptimizationProgress,
  OptimizationResult,
  Individual,
  ChromosomeFitness,
  DaySchedule,
  FitnessContext,
  ShiftTypes,
  Expense,
  Deposit,
} from '../../types';
import { FitnessManager } from './FitnessManager';
// import { logger } from '../../utils/logger';
import {
  GENETIC_ALGORITHM,
  SHIFT_VALUES,
  SCHEDULE_CONSTANTS,
  PROBABILITIES,
  CRITICAL_DAY_PARAMS,
  FITNESS_WEIGHTS,
  DATE_CONSTANTS,
  SERVER_OPTIMIZATION,
} from '../../config/user-config';

// Disable logger to prevent console spam during optimization
const logger = {
  info: (...args: unknown[]) => {},
  debug: (...args: unknown[]) => {},
  error: (...args: unknown[]) => {},
  warn: (...args: unknown[]) => {},
  logAction: (...args: unknown[]) => {},
};

/**
 * Format computation time in milliseconds to a user-friendly string
 */
function formatComputationTime(timeMs: number): string {
  if (timeMs < DATE_CONSTANTS.TIME_UNITS.MS_PER_SECOND) {
    return `${timeMs}ms`;
  } else if (timeMs < DATE_CONSTANTS.TIME_UNITS.MS_PER_MINUTE) {
    return `${(timeMs / DATE_CONSTANTS.TIME_UNITS.MS_PER_SECOND).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(
      timeMs / DATE_CONSTANTS.TIME_UNITS.MS_PER_MINUTE
    );
    const seconds = Math.floor(
      (timeMs % DATE_CONSTANTS.TIME_UNITS.MS_PER_MINUTE) /
        DATE_CONSTANTS.TIME_UNITS.MS_PER_SECOND
    );
    return `${minutes}m ${seconds}s`;
  }
}

export class GeneticOptimizer {
  private config: OptimizationConfig;
  private fitnessManager: FitnessManager;
  private mutationRate: number = GENETIC_ALGORITHM.MUTATION_RATE;
  private eliteSize: number;
  private tournamentSize: number = GENETIC_ALGORITHM.TOURNAMENT_SIZE;
  private fitnessHistory: number[] = [];

  // Financial data
  private shifts: ShiftTypes = {
    large: { gross: SHIFT_VALUES.large.gross, net: SHIFT_VALUES.large.net },
    medium: { gross: SHIFT_VALUES.medium.gross, net: SHIFT_VALUES.medium.net },
    small: { gross: SHIFT_VALUES.small.gross, net: SHIFT_VALUES.small.net },
  };

  private expenses: Expense[];

  private deposits: Deposit[];

  private expensesByDay: number[];
  private depositsByDay: number[];
  private requiredFlexNet: number;
  private criticalDays: number[];
  private startDay: number;
  private effectiveStartingBalance: number;

  constructor(
    config: OptimizationConfig,
    expenses: Expense[] = [],
    deposits: Deposit[] = [],
    shiftTypes?: ShiftTypes
  ) {
    logger.info('GeneticOptimizer', 'Initializing optimizer', { config });

    this.config = config;
    this.expenses = expenses;
    this.deposits = deposits;

    // Use provided shift types or defaults
    if (shiftTypes) {
      this.shifts = shiftTypes;
    }

    this.eliteSize = Math.max(
      GENETIC_ALGORITHM.MIN_ELITE_SIZE,
      Math.floor(config.populationSize * GENETIC_ALGORITHM.ELITE_PERCENTAGE)
    );
    this.fitnessManager = new FitnessManager();

    if (config.debugFitness || config.balanceEditDay) {
      this.fitnessManager.enableDebug();
      logger.debug(
        'GeneticOptimizer',
        'Debug mode enabled for fitness manager'
      );
    }

    // Initialize arrays
    this.expensesByDay = new Array(SCHEDULE_CONSTANTS.DAY_ARRAY_SIZE).fill(0);
    this.depositsByDay = new Array(SCHEDULE_CONSTANTS.DAY_ARRAY_SIZE).fill(0);

    // Process expenses
    for (const exp of this.expenses) {
      if (
        exp.day >= SCHEDULE_CONSTANTS.MIN_DAY &&
        exp.day <= SCHEDULE_CONSTANTS.MAX_DAY
      ) {
        this.expensesByDay[exp.day] += exp.amount;
      }
    }

    // Process deposits
    for (const dep of this.deposits) {
      if (
        dep.day >= SCHEDULE_CONSTANTS.MIN_DAY &&
        dep.day <= SCHEDULE_CONSTANTS.MAX_DAY
      ) {
        this.depositsByDay[dep.day] += dep.amount;
      }
    }

    // Apply manual constraints
    if (config.manualConstraints) {
      Object.keys(config.manualConstraints).forEach(day => {
        const dayNum = parseInt(day);
        const constraint = config.manualConstraints![dayNum];
        if (constraint.fixedExpenses !== undefined) {
          this.expensesByDay[dayNum] = constraint.fixedExpenses;
        }
      });
    }

    // Handle balance edit
    if (config.balanceEditDay) {
      this.startDay = config.balanceEditDay + 1;
      this.effectiveStartingBalance = config.newStartingBalance!;
    } else {
      this.startDay = SCHEDULE_CONSTANTS.MIN_DAY;
      this.effectiveStartingBalance = config.startingBalance;
    }

    // Calculate required earnings
    this.requiredFlexNet = this.calculateRequiredEarnings();
    this.criticalDays = this.identifyCriticalDays();

    logger.info('GeneticOptimizer', 'Initialization complete', {
      requiredFlexNet: this.requiredFlexNet,
      criticalDays: this.criticalDays,
      startDay: this.startDay,
      effectiveStartingBalance: this.effectiveStartingBalance,
    });
  }

  private calculateRequiredEarnings(): number {
    if (this.config.balanceEditDay) {
      let relevantExpenses = 0;
      let relevantMomIncome = 0;

      for (
        let d = this.config.balanceEditDay + 1;
        d <= SCHEDULE_CONSTANTS.MAX_DAY;
        d++
      ) {
        relevantExpenses += this.expensesByDay[d] || 0;
        relevantMomIncome += this.depositsByDay[d] || 0;
      }

      const required =
        relevantExpenses +
        this.config.targetEndingBalance -
        this.effectiveStartingBalance -
        relevantMomIncome;

      return Math.max(0, required);
    } else {
      const totalExpenses = this.expensesByDay.reduce(
        (sum, exp) => sum + exp,
        0
      );
      const totalDepositIncome = this.deposits.reduce(
        (sum, dep) => sum + dep.amount,
        0
      );
      return (
        totalExpenses +
        this.config.targetEndingBalance -
        this.config.startingBalance -
        totalDepositIncome
      );
    }
  }

  private identifyCriticalDays(): number[] {
    const criticalDays: number[] = [];
    let runningBalance = this.effectiveStartingBalance;
    const startDay = this.config.balanceEditDay
      ? this.config.balanceEditDay + 1
      : SCHEDULE_CONSTANTS.MIN_DAY;

    for (let day = startDay; day <= SCHEDULE_CONSTANTS.MAX_DAY; day++) {
      runningBalance += this.depositsByDay[day] || 0;
      runningBalance -= this.expensesByDay[day] || 0;

      if (
        runningBalance <
        this.config.minimumBalance + FITNESS_WEIGHTS.BALANCE.CRITICAL_DAY_BUFFER
      ) {
        criticalDays.push(day);
      }
    }

    return criticalDays;
  }

  private generateChromosome(): (string | null)[] {
    logger.debug('GeneticOptimizer', 'Generating new chromosome');
    const chromosome: (string | null)[] = new Array(
      SCHEDULE_CONSTANTS.DAY_ARRAY_SIZE
    ).fill(null);

    // Apply manual constraints
    if (this.config.manualConstraints) {
      Object.keys(this.config.manualConstraints).forEach(day => {
        const dayNum = parseInt(day);
        const constraint = this.config.manualConstraints![dayNum];
        if (constraint.shifts !== undefined) {
          chromosome[dayNum] = constraint.shifts;
        }
      });
    }

    const availableDays = this.config.balanceEditDay
      ? SCHEDULE_CONSTANTS.MAX_DAY - this.config.balanceEditDay
      : SCHEDULE_CONSTANTS.MAX_DAY;
    const maxPossibleSingleShifts = availableDays * this.shifts.large.net;
    const inCrisisMode = this.requiredFlexNet > maxPossibleSingleShifts;

    if (inCrisisMode) {
      logger.warn(
        'GeneticOptimizer',
        'Crisis mode activated - required earnings exceed single shift capacity',
        {
          requiredFlexNet: this.requiredFlexNet,
          maxPossibleSingleShifts,
        }
      );
    }

    const avgEarnings =
      (this.shifts.large.net + this.shifts.medium.net + this.shifts.small.net) /
      Object.keys(this.shifts).length;
    const estimatedWorkDays = Math.ceil(this.requiredFlexNet / avgEarnings);

    // Cover critical days with randomized coverage
    for (const criticalDay of this.criticalDays) {
      // Randomize work day placement 2-5 days before critical day
      const daysBeforeCritical =
        Math.floor(Math.random() * CRITICAL_DAY_PARAMS.RANDOM_RANGE) +
        CRITICAL_DAY_PARAMS.MIN_DAYS_BEFORE;
      const workDay = Math.max(this.startDay, criticalDay - daysBeforeCritical);
      if (workDay <= SCHEDULE_CONSTANTS.MAX_DAY && !chromosome[workDay]) {
        if (inCrisisMode) {
          const rand = Math.random();
          if (rand < PROBABILITIES.CRISIS_MODE.DOUBLE_LARGE) {
            chromosome[workDay] = 'large+large';
          } else if (
            rand <
            PROBABILITIES.CRISIS_MODE.DOUBLE_LARGE +
              PROBABILITIES.CRISIS_MODE.MIXED_LARGE
          ) {
            chromosome[workDay] =
              Math.random() < 0.5 ? 'medium+large' : 'large+medium';
          } else {
            chromosome[workDay] = 'medium+medium';
          }
        } else {
          const shiftType =
            Math.random() < PROBABILITIES.NORMAL_MODE.LARGE_SHIFT
              ? 'large'
              : Math.random() <
                  PROBABILITIES.NORMAL_MODE.LARGE_SHIFT +
                    PROBABILITIES.NORMAL_MODE.MEDIUM_SHIFT
                ? 'medium'
                : 'small';
          chromosome[workDay] = shiftType;
        }
      }
    }

    // Count already scheduled work days
    let scheduledWorkDays = 0;
    for (let d = this.startDay; d <= SCHEDULE_CONSTANTS.MAX_DAY; d++) {
      if (chromosome[d]) scheduledWorkDays++;
    }

    let minWorkDaysNeeded = 0;
    if (inCrisisMode) {
      const avgDoubleShiftEarnings =
        SERVER_OPTIMIZATION.AVG_DOUBLE_SHIFT_EARNINGS;
      minWorkDaysNeeded = Math.max(
        Math.floor(availableDays * CRITICAL_DAY_PARAMS.CRISIS_MODE_USAGE),
        Math.ceil(this.requiredFlexNet / avgDoubleShiftEarnings)
      );
      minWorkDaysNeeded = Math.min(minWorkDaysNeeded, availableDays);
    } else {
      minWorkDaysNeeded = Math.ceil(
        this.requiredFlexNet / this.shifts.large.net
      );
    }

    // Create array of available days and shuffle for random distribution
    const availableDaysArray: number[] = [];
    for (let day = this.startDay; day <= SCHEDULE_CONSTANTS.MAX_DAY; day++) {
      if (chromosome[day] === undefined) {
        availableDaysArray.push(day);
      }
    }

    // Shuffle available days for random selection
    for (let i = availableDaysArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableDaysArray[i], availableDaysArray[j]] = [
        availableDaysArray[j],
        availableDaysArray[i],
      ];
    }

    // Calculate how many more work days we need
    const remainingWorkDaysNeeded = Math.max(
      0,
      minWorkDaysNeeded - scheduledWorkDays
    );

    // Distribute remaining work days with spacing preference
    if (remainingWorkDaysNeeded > 0 && availableDaysArray.length > 0) {
      // Sort available days to enable spacing
      availableDaysArray.sort((a, b) => a - b);

      // Try to distribute evenly
      const step = Math.max(
        1,
        Math.floor(availableDaysArray.length / remainingWorkDaysNeeded)
      );
      let daysAdded = 0;

      // First pass: add work days with ideal spacing
      for (
        let i = 0;
        i < availableDaysArray.length && daysAdded < remainingWorkDaysNeeded;
        i += step
      ) {
        const day = availableDaysArray[i];

        // Check minimum spacing from existing work days
        let tooClose = false;
        for (
          let d = Math.max(this.startDay, day - 1);
          d <= Math.min(SCHEDULE_CONSTANTS.MAX_DAY, day + 1);
          d++
        ) {
          if (d !== day && chromosome[d]) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          if (inCrisisMode) {
            const rand = Math.random();
            if (rand < PROBABILITIES.CRISIS_MODE.SECOND_PASS.DOUBLE_LARGE) {
              chromosome[day] = 'large+large';
            } else if (
              rand <
              PROBABILITIES.CRISIS_MODE.SECOND_PASS.DOUBLE_LARGE +
                PROBABILITIES.CRISIS_MODE.SECOND_PASS.MIXED_LARGE
            ) {
              chromosome[day] =
                Math.random() < 0.5 ? 'medium+large' : 'large+medium';
            } else {
              chromosome[day] = 'medium+medium';
            }
          } else {
            const rand = Math.random();
            if (rand < PROBABILITIES.SHIFT_PLACEMENT.FILL_SMALL) {
              chromosome[day] = 'small';
            } else if (rand < 0.5) {
              chromosome[day] = 'medium';
            } else {
              chromosome[day] = 'large';
            }

            const doubleShiftProbability = 0.3;
            if (
              Math.random() < doubleShiftProbability &&
              chromosome[day] !== 'large'
            ) {
              const secondShift = Math.random() < 0.5 ? 'small' : 'medium';
              chromosome[day] = chromosome[day] + '+' + secondShift;
            }
          }
          daysAdded++;
          scheduledWorkDays++;
        }
      }

      // Second pass: fill remaining needed days if first pass didn't meet requirements
      if (daysAdded < remainingWorkDaysNeeded) {
        for (const day of availableDaysArray) {
          if (
            chromosome[day] === undefined &&
            daysAdded < remainingWorkDaysNeeded
          ) {
            if (inCrisisMode) {
              const rand = Math.random();
              if (rand < PROBABILITIES.CRISIS_MODE.SECOND_PASS.DOUBLE_LARGE) {
                chromosome[day] = 'large+large';
              } else if (
                rand <
                PROBABILITIES.CRISIS_MODE.SECOND_PASS.DOUBLE_LARGE +
                  PROBABILITIES.CRISIS_MODE.SECOND_PASS.MIXED_LARGE
              ) {
                chromosome[day] =
                  Math.random() < 0.5 ? 'medium+large' : 'large+medium';
              } else {
                chromosome[day] = 'medium+medium';
              }
            } else {
              const rand = Math.random();
              if (rand < PROBABILITIES.SHIFT_PLACEMENT.FILL_SMALL) {
                chromosome[day] = 'small';
              } else if (
                rand <
                PROBABILITIES.SHIFT_PLACEMENT.FILL_SMALL +
                  PROBABILITIES.SHIFT_PLACEMENT.FILL_MEDIUM
              ) {
                chromosome[day] = 'medium';
              } else {
                chromosome[day] = 'large';
              }

              const doubleShiftProbability = 0.3;
              if (
                Math.random() < doubleShiftProbability &&
                chromosome[day] !== 'large'
              ) {
                const secondShift = Math.random() < 0.5 ? 'small' : 'medium';
                chromosome[day] = chromosome[day] + '+' + secondShift;
              }
            }
            daysAdded++;
            scheduledWorkDays++;
          }
        }
      }
    }

    return chromosome;
  }

  private evaluateFitness(chromosome: (string | null)[]): ChromosomeFitness {
    const startTime = Date.now();

    let balance = this.config.startingBalance;
    let workDays = 0;
    let totalEarnings = 0;
    let violations = 0;
    let minBalance = this.config.startingBalance;
    const workDaysList: number[] = [];
    let balanceConstraintViolations = 0;

    // Simulate the entire month
    for (
      let day = SCHEDULE_CONSTANTS.MIN_DAY;
      day <= SCHEDULE_CONSTANTS.MAX_DAY;
      day++
    ) {
      balance += this.depositsByDay[day] || 0;

      // Process shifts
      if (day < this.startDay) {
        // Use locked schedule from constraints
        if (this.config.manualConstraints?.[day]?.shifts) {
          const shifts = this.config.manualConstraints[day].shifts!.split('+');
          for (const shift of shifts) {
            balance += this.shifts[shift as keyof ShiftTypes].net;
            totalEarnings += this.shifts[shift as keyof ShiftTypes].net;
          }
          workDays++;
          workDaysList.push(day);
        }
      } else if (chromosome[day]) {
        const shifts = chromosome[day]!.split('+');
        for (const shift of shifts) {
          balance += this.shifts[shift as keyof ShiftTypes].net;
          totalEarnings += this.shifts[shift as keyof ShiftTypes].net;
        }
        workDays++;
        workDaysList.push(day);
      }

      balance -= this.expensesByDay[day];

      // Handle balance edit
      if (this.config.balanceEditDay && day === this.config.balanceEditDay) {
        balance = this.config.newStartingBalance!;
      }

      // Check balance constraints
      if (this.config.manualConstraints?.[day]?.fixedBalance !== undefined) {
        const targetBalance = this.config.manualConstraints[day].fixedBalance!;
        const balanceDiff = Math.abs(balance - targetBalance);
        if (balanceDiff > 0.01) {
          balanceConstraintViolations +=
            balanceDiff * FITNESS_WEIGHTS.BALANCE.VIOLATION_PENALTY;
        }
      }

      // Track violations
      if (balance < this.config.minimumBalance) {
        violations++;
      }
      if (balance < minBalance) {
        minBalance = balance;
      }
    }

    // Determine crisis mode
    const availableDays = this.config.balanceEditDay
      ? SCHEDULE_CONSTANTS.MAX_DAY - this.config.balanceEditDay
      : SCHEDULE_CONSTANTS.MAX_DAY;
    const deficitPerDay = this.requiredFlexNet / availableDays;
    const largeShiftEarnings = this.shifts.large.net;
    const inCrisisMode = deficitPerDay > largeShiftEarnings;

    // Create fitness context
    const fitnessContext: FitnessContext = {
      balance,
      workDays,
      violations,
      totalEarnings,
      minBalance,
      workDaysList,
      inCrisisMode,
      targetEndingBalance: this.config.targetEndingBalance,
      minimumBalance: this.config.minimumBalance,
      requiredFlexNet: this.requiredFlexNet,
      balanceEditDay: this.config.balanceEditDay || null,
    };

    // Calculate fitness
    const strategyFitness = this.fitnessManager.evaluateChromosome(
      chromosome,
      fitnessContext
    );
    const constraintPenaltyMultiplier = inCrisisMode ? 0.01 : 10000;
    const fitness =
      strategyFitness +
      balanceConstraintViolations * constraintPenaltyMultiplier;

    const executionTime = Date.now() - startTime;
    logger.logAction('GeneticOptimizer', 'evaluateFitness', {
      chromosomeWorkDays: workDays,
      fitness,
      balance,
      violations,
      executionTime: `${executionTime}ms`,
    });

    return {
      fitness,
      balance,
      workDays,
      violations,
      totalEarnings,
      minBalance,
      workDaysList,
    };
  }

  private tournamentSelect(population: Individual[]): Individual {
    const tournament: Individual[] = [];

    for (let i = 0; i < this.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]);
    }

    tournament.sort((a, b) => a.fitness.fitness - b.fitness.fitness);
    return tournament[0];
  }

  private crossover(
    parent1: Individual,
    parent2: Individual
  ): (string | null)[] {
    const child: (string | null)[] = new Array(
      SCHEDULE_CONSTANTS.DAY_ARRAY_SIZE
    ).fill(null);

    const point1 =
      Math.floor(Math.random() * SCHEDULE_CONSTANTS.MAX_DAY) +
      SCHEDULE_CONSTANTS.MIN_DAY;
    const point2 =
      Math.floor(Math.random() * SCHEDULE_CONSTANTS.MAX_DAY) +
      SCHEDULE_CONSTANTS.MIN_DAY;
    const start = Math.min(point1, point2);
    const end = Math.max(point1, point2);

    for (
      let day = SCHEDULE_CONSTANTS.MIN_DAY;
      day <= SCHEDULE_CONSTANTS.MAX_DAY;
      day++
    ) {
      if (day >= start && day <= end) {
        child[day] = parent2.chromosome[day];
      } else {
        child[day] = parent1.chromosome[day];
      }
    }

    return child;
  }

  private mutate(chromosome: (string | null)[]): (string | null)[] {
    const mutated = [...chromosome];
    const startDay = this.config.balanceEditDay
      ? this.config.balanceEditDay + 1
      : SCHEDULE_CONSTANTS.MIN_DAY;

    for (let day = startDay; day <= SCHEDULE_CONSTANTS.MAX_DAY; day++) {
      if (this.config.manualConstraints?.[day]) {
        continue;
      }

      if (Math.random() < this.mutationRate) {
        const availableDays = this.config.balanceEditDay
          ? SCHEDULE_CONSTANTS.MAX_DAY - this.config.balanceEditDay
          : SCHEDULE_CONSTANTS.MAX_DAY;
        const deficitPerDay = this.requiredFlexNet / availableDays;
        const largeShiftEarnings = this.shifts.large.net;
        const isExtremeDeficit = deficitPerDay > largeShiftEarnings;

        // Check spacing before mutation
        let hasAdjacentWorkDay = false;
        if (day > SCHEDULE_CONSTANTS.MIN_DAY && mutated[day - 1])
          hasAdjacentWorkDay = true;
        if (day < SCHEDULE_CONSTANTS.MAX_DAY && mutated[day + 1])
          hasAdjacentWorkDay = true;

        if (isExtremeDeficit) {
          const rand = Math.random();
          if (rand < PROBABILITIES.CRISIS_MODE.LARGE_LARGE) {
            mutated[day] = 'large+large';
          } else if (rand < PROBABILITIES.CRISIS_MODE.MIXED_SHIFTS) {
            mutated[day] =
              Math.random() < 0.5 ? 'medium+large' : 'large+medium';
          } else {
            mutated[day] = 'medium+medium';
          }
        } else {
          const rand = Math.random();

          // Bias against removing work days if they help with spacing
          if (mutated[day] && !hasAdjacentWorkDay) {
            // 80% chance to keep a well-spaced work day
            if (rand < PROBABILITIES.MUTATION.KEEP_WELL_SPACED) {
              continue;
            }
          }

          // Bias against adding work days next to existing ones
          if (!mutated[day] && hasAdjacentWorkDay) {
            // Only 20% chance to add work day next to existing one
            if (rand > PROBABILITIES.MUTATION.ADD_ADJACENT) {
              mutated[day] = null;
              continue;
            }
          }

          if (rand < PROBABILITIES.MUTATION.REMOVE_WORK_DAY) {
            mutated[day] = null;
          } else if (rand < 0.5) {
            mutated[day] = 'medium';
          } else if (
            rand <
            PROBABILITIES.SHIFT_PLACEMENT.FILL_SMALL +
              PROBABILITIES.SHIFT_PLACEMENT.FILL_MEDIUM
          ) {
            mutated[day] = 'medium+medium';
          } else if (
            rand <
            PROBABILITIES.MUTATION.REMOVE +
              PROBABILITIES.MUTATION.TO_SMALL +
              PROBABILITIES.MUTATION.TO_MEDIUM +
              PROBABILITIES.MUTATION.TO_LARGE
          ) {
            mutated[day] = 'large';
          } else {
            const allOptions = [
              null,
              'small',
              'medium',
              'large',
              'small+small',
              'small+medium',
              'small+large',
              'medium+medium',
              'medium+large',
              'large+large',
            ];
            mutated[day] =
              allOptions[Math.floor(Math.random() * allOptions.length)];
          }
        }
      }
    }

    return mutated;
  }

  async optimize(
    progressCallback?: (progress: OptimizationProgress) => Promise<void>
  ): Promise<OptimizationResult> {
    const optimizationStartTime = Date.now();
    logger.info('GeneticOptimizer', 'Starting optimization', {
      populationSize: this.config.populationSize,
      generations: this.config.generations,
      mutationRate: this.mutationRate,
      eliteSize: this.eliteSize,
    });

    // Initialize population
    let population: Individual[] = [];

    for (let i = 0; i < this.config.populationSize; i++) {
      const chromosome = this.generateChromosome();
      const fitness = this.evaluateFitness(chromosome);
      population.push({ chromosome, fitness });
    }

    logger.debug('GeneticOptimizer', 'Initial population generated', {
      populationSize: population.length,
      bestInitialFitness: Math.min(...population.map(p => p.fitness.fitness)),
    });

    let bestEverFitness = Infinity;
    let generationsWithoutImprovement = 0;
    const maxGenerationsWithoutImprovement = GENETIC_ALGORITHM.STAGNATION_LIMIT;

    // Evolution loop
    for (let gen = 0; gen < this.config.generations; gen++) {
      population.sort((a, b) => a.fitness.fitness - b.fitness.fitness);
      this.fitnessHistory.push(population[0].fitness.fitness);

      // Report progress
      if (progressCallback && gen % GENETIC_ALGORITHM.PROGRESS_INTERVAL === 0) {
        const best = population[0];
        logger.debug('GeneticOptimizer', `Generation ${gen} progress`, {
          bestFitness: best.fitness.fitness,
          workDays: best.fitness.workDays,
          balance: best.fitness.balance,
          violations: best.fitness.violations,
        });

        await progressCallback({
          generation: gen,
          progress: (gen / this.config.generations) * 100,
          bestFitness: best.fitness.fitness,
          workDays: best.fitness.workDays,
          balance: best.fitness.balance,
          violations: best.fitness.violations,
        });
        await new Promise(resolve =>
          setTimeout(resolve, GENETIC_ALGORITHM.WORKER_TIMEOUT)
        );
      }

      // Check for improvement
      if (
        population[0].fitness.fitness <
        bestEverFitness * GENETIC_ALGORITHM.IMPROVEMENT_THRESHOLD
      ) {
        bestEverFitness = population[0].fitness.fitness;
        generationsWithoutImprovement = 0;
        logger.debug('GeneticOptimizer', 'New best fitness found', {
          generation: gen,
          fitness: bestEverFitness,
        });
      } else {
        generationsWithoutImprovement++;
      }

      // Early termination
      const best = population[0].fitness;
      const balanceTolerance =
        GENETIC_ALGORITHM.EARLY_TERMINATION.BALANCE_TOLERANCE;
      const targetLow = this.config.targetEndingBalance - balanceTolerance;
      const targetHigh = this.config.targetEndingBalance + balanceTolerance;

      if (
        gen > GENETIC_ALGORITHM.EARLY_TERMINATION.FIRST_CHECK &&
        generationsWithoutImprovement > maxGenerationsWithoutImprovement &&
        best.violations === 0 &&
        best.balance >= targetLow &&
        best.balance <= targetHigh
      ) {
        logger.info(
          'GeneticOptimizer',
          'Early termination - optimal solution found',
          {
            generation: gen,
            generationsWithoutImprovement,
            fitness: best.fitness,
            violations: best.violations,
            balance: best.balance,
          }
        );
        break;
      }

      // Create new population
      const newPopulation: Individual[] = [];

      // Elitism
      for (let i = 0; i < this.eliteSize && i < population.length; i++) {
        newPopulation.push({
          chromosome: [...population[i].chromosome],
          fitness: population[i].fitness,
        });
      }

      // Generate rest through crossover and mutation
      while (newPopulation.length < this.config.populationSize) {
        const parent1 = this.tournamentSelect(population);
        const parent2 = this.tournamentSelect(population);

        let child = this.crossover(parent1, parent2);
        child = this.mutate(child);

        const fitness = this.evaluateFitness(child);
        newPopulation.push({ chromosome: child, fitness });
      }

      population = newPopulation;
    }

    // Return best solution
    population.sort((a, b) => a.fitness.fitness - b.fitness.fitness);
    const best = population[0];

    const totalTime = Date.now() - optimizationStartTime;
    logger.info('GeneticOptimizer', 'Optimization complete', {
      totalTime,
      finalFitness: best.fitness.fitness,
      workDays: best.fitness.workDays,
      totalEarnings: best.fitness.totalEarnings,
      finalBalance: best.fitness.balance,
      violations: best.fitness.violations,
    });

    const formattedSchedule = this.formatSchedule(best.chromosome);

    return {
      schedule: best.chromosome,
      workDays: best.fitness.workDaysList,
      totalEarnings: best.fitness.totalEarnings,
      finalBalance: best.fitness.balance,
      minBalance: best.fitness.minBalance,
      violations: best.fitness.violations,
      computationTime: formatComputationTime(totalTime),
      formattedSchedule,
    };
  }

  private formatSchedule(chromosome: (string | null)[]): DaySchedule[] {
    logger.debug('GeneticOptimizer', 'Formatting final schedule');
    const schedule: DaySchedule[] = [];
    let balance = this.config.startingBalance;

    for (
      let day = SCHEDULE_CONSTANTS.MIN_DAY;
      day <= SCHEDULE_CONSTANTS.MAX_DAY;
      day++
    ) {
      const dayInfo: DaySchedule = {
        day,
        shifts: [],
        earnings: 0,
        expenses: this.expensesByDay[day] || 0,
        deposit: this.depositsByDay[day] || 0,
        startBalance: balance,
        endBalance: 0,
      };

      balance += dayInfo.deposit;

      // Handle shifts based on balance edit
      if (this.config.balanceEditDay && day < this.config.balanceEditDay) {
        // Use locked schedule
        if (this.config.manualConstraints?.[day]?.shifts) {
          const shiftType = this.config.manualConstraints[day].shifts;
          if (shiftType) {
            const shifts = shiftType.split('+');
            dayInfo.shifts = shifts;
            for (const shift of shifts) {
              dayInfo.earnings += this.shifts[shift as keyof ShiftTypes].net;
            }
            balance += dayInfo.earnings;
          }
        }
      } else if (
        this.config.balanceEditDay &&
        day === this.config.balanceEditDay
      ) {
        // Balance edit day
        if (this.config.manualConstraints?.[day]?.shifts) {
          const shiftType = this.config.manualConstraints[day].shifts;
          if (shiftType) {
            const shifts = shiftType.split('+');
            dayInfo.shifts = shifts;
            for (const shift of shifts) {
              dayInfo.earnings += this.shifts[shift as keyof ShiftTypes].net;
            }
            balance += dayInfo.earnings;
          }
        }
      } else {
        // Use chromosome
        if (chromosome[day]) {
          const shifts = chromosome[day]!.split('+');
          dayInfo.shifts = shifts;
          for (const shift of shifts) {
            dayInfo.earnings += this.shifts[shift as keyof ShiftTypes].net;
          }
          balance += dayInfo.earnings;
        }
      }

      balance -= dayInfo.expenses;

      // Handle balance edit override
      if (this.config.balanceEditDay && day === this.config.balanceEditDay) {
        balance = this.config.newStartingBalance!;
      }

      dayInfo.endBalance = balance;
      schedule.push(dayInfo);
    }

    return schedule;
  }
}
