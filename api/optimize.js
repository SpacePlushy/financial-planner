// @ts-check

/**
 * Vercel Serverless Function for Schedule Optimization
 * This is a self-contained version that doesn't rely on TypeScript imports
 * Now includes Vercel BotID protection
 */

// Import BotID for bot protection
const { checkBotId } = require('botid/server');

// Import configuration constants
const { 
  SCHEDULE_CONSTANTS,
  SHIFT_VALUES,
  GENETIC_ALGORITHM,
  FITNESS_WEIGHTS,
  PROBABILITIES,
  CRITICAL_DAY_PARAMS,
  API_CONSTANTS
} = require('./constants');

// Enable CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

/**
 * Simple genetic algorithm implementation for serverless
 */
class SimpleGeneticOptimizer {
  constructor(config, expenses, deposits, shiftTypes) {
    this.config = config;
    this.expenses = expenses || [];
    this.deposits = deposits || [];
    
    // Calculate daily expenses and deposits
    this.expensesByDay = new Array(SCHEDULE_CONSTANTS.DAY_ARRAY_SIZE).fill(0);
    this.depositsByDay = new Array(SCHEDULE_CONSTANTS.DAY_ARRAY_SIZE).fill(0);
    
    // Process expenses
    for (const exp of this.expenses) {
      if (exp && exp.day >= SCHEDULE_CONSTANTS.MIN_DAY && exp.day <= SCHEDULE_CONSTANTS.MAX_DAY && exp.amount) {
        this.expensesByDay[exp.day] = (this.expensesByDay[exp.day] || 0) + exp.amount;
      }
    }
    
    // Process deposits
    for (const dep of this.deposits) {
      if (dep && dep.day >= SCHEDULE_CONSTANTS.MIN_DAY && dep.day <= SCHEDULE_CONSTANTS.MAX_DAY && dep.amount) {
        this.depositsByDay[dep.day] = (this.depositsByDay[dep.day] || 0) + dep.amount;
      }
    }
    // Handle both formats: {value: X} or {net: X}
    if (shiftTypes) {
      this.shiftTypes = {};
      for (const [key, shift] of Object.entries(shiftTypes)) {
        this.shiftTypes[key] = {
          value: shift.net || shift.value || 0,
          net: shift.net || shift.value || 0,
          gross: shift.gross || shift.value || 0
        };
      }
    } else {
      this.shiftTypes = {
        large: { value: SHIFT_VALUES.large.value, net: SHIFT_VALUES.large.net, gross: SHIFT_VALUES.large.gross },
        medium: { value: SHIFT_VALUES.medium.value, net: SHIFT_VALUES.medium.net, gross: SHIFT_VALUES.medium.gross },
        small: { value: SHIFT_VALUES.small.value, net: SHIFT_VALUES.small.net, gross: SHIFT_VALUES.small.gross }
      };
    }
    
    // Calculate required earnings (like client-side)
    this.requiredFlexNet = this.calculateRequiredEarnings();
    
    // Identify critical days
    this.criticalDays = this.identifyCriticalDays();
    
    // Set start day (for balance edit support)
    this.startDay = this.config.balanceEditDay ? this.config.balanceEditDay + 1 : SCHEDULE_CONSTANTS.MIN_DAY;
    this.effectiveStartingBalance = this.config.balanceEditDay 
      ? this.config.newStartingBalance 
      : this.config.startingBalance;
    
    // Calculate total days based on expenses/deposits
    this.totalDays = this.calculateTotalDays();
  }

  calculateTotalDays() {
    // Always use 30 days to match client-side optimizer
    return SCHEDULE_CONSTANTS.MAX_DAY;
  }
  
  calculateRequiredEarnings() {
    const totalExpenses = this.expensesByDay.reduce((sum, exp) => sum + exp, 0);
    const totalDepositIncome = this.deposits.reduce((sum, dep) => sum + dep.amount, 0);
    return Math.max(0, 
      totalExpenses + 
      this.config.targetEndingBalance - 
      this.config.startingBalance - 
      totalDepositIncome
    );
  }
  
  identifyCriticalDays() {
    const criticalDays = [];
    let runningBalance = this.effectiveStartingBalance;
    const startDay = this.startDay;
    
    for (let day = startDay; day <= SCHEDULE_CONSTANTS.MAX_DAY; day++) {
      runningBalance += this.depositsByDay[day] || 0;
      runningBalance -= this.expensesByDay[day] || 0;
      
      if (runningBalance < this.config.minimumBalance + FITNESS_WEIGHTS.BALANCE.CRITICAL_DAY_BUFFER) {
        criticalDays.push(day);
      }
    }
    
    return criticalDays;
  }

  generateRandomSchedule() {
    const chromosome = new Array(SCHEDULE_CONSTANTS.DAY_ARRAY_SIZE).fill(null);
    
    // Apply manual constraints if any
    if (this.config.manualConstraints) {
      for (const [day, constraint] of Object.entries(this.config.manualConstraints)) {
        const dayNum = parseInt(day);
        if (constraint.shifts !== undefined) {
          chromosome[dayNum] = constraint.shifts;
        }
      }
    }
    
    const availableDays = SCHEDULE_CONSTANTS.MAX_DAY - (this.config.balanceEditDay || 0);
    const maxPossibleSingleShifts = availableDays * this.shiftTypes.large.net;
    const inCrisisMode = this.requiredFlexNet > maxPossibleSingleShifts;
    
    const avgEarnings = (this.shiftTypes.large.net + this.shiftTypes.medium.net + this.shiftTypes.small.net) / Object.keys(this.shiftTypes).length;
    const estimatedWorkDays = Math.ceil(this.requiredFlexNet / avgEarnings);
    
    // Cover critical days first
    for (const criticalDay of this.criticalDays) {
      const daysBeforeCritical = Math.floor(Math.random() * CRITICAL_DAY_PARAMS.RANDOM_RANGE) + CRITICAL_DAY_PARAMS.MIN_DAYS_BEFORE;
      const workDay = Math.max(this.startDay, criticalDay - daysBeforeCritical);
      
      if (workDay <= SCHEDULE_CONSTANTS.MAX_DAY && !chromosome[workDay]) {
        if (inCrisisMode) {
          // Crisis mode - use double shifts
          const rand = Math.random();
          if (rand < PROBABILITIES.CRISIS_MODE.DOUBLE_LARGE) {
            chromosome[workDay] = 'large+large';
          } else if (rand < (PROBABILITIES.CRISIS_MODE.DOUBLE_LARGE + PROBABILITIES.CRISIS_MODE.MIXED_LARGE)) {
            chromosome[workDay] = Math.random() < 0.5 ? 'medium+large' : 'large+medium';
          } else {
            chromosome[workDay] = 'medium+medium';
          }
        } else {
          // Normal mode - prefer single shifts with proper distribution
          const rand = Math.random();
          const shiftType = rand < PROBABILITIES.NORMAL_MODE.LARGE_SHIFT ? 'large' : 
                           (rand < (PROBABILITIES.NORMAL_MODE.LARGE_SHIFT + PROBABILITIES.NORMAL_MODE.MEDIUM_SHIFT) ? 'medium' : 'small');
          chromosome[workDay] = shiftType;
        }
      }
    }
    
    // Count scheduled work days
    let scheduledWorkDays = 0;
    for (let d = this.startDay; d <= SCHEDULE_CONSTANTS.MAX_DAY; d++) {
      if (chromosome[d]) scheduledWorkDays++;
    }
    
    // Calculate minimum work days needed
    let minWorkDaysNeeded = Math.ceil(this.requiredFlexNet / this.shiftTypes.large.net);
    if (inCrisisMode) {
      const avgDoubleShiftEarnings = SERVER_OPTIMIZATION.AVG_DOUBLE_SHIFT_EARNINGS;
      minWorkDaysNeeded = Math.max(
        Math.floor(availableDays * CRITICAL_DAY_PARAMS.CRISIS_MODE_USAGE),
        Math.ceil(this.requiredFlexNet / avgDoubleShiftEarnings)
      );
    }
    
    // Get available days for work
    const availableDaysArray = [];
    for (let day = this.startDay; day <= SCHEDULE_CONSTANTS.MAX_DAY; day++) {
      if (!chromosome[day]) {
        availableDaysArray.push(day);
      }
    }
    
    // Shuffle available days
    for (let i = availableDaysArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = availableDaysArray[i];
      availableDaysArray[i] = availableDaysArray[j];
      availableDaysArray[j] = temp;
    }
    
    // Add remaining work days with spacing
    const remainingWorkDaysNeeded = Math.max(0, minWorkDaysNeeded - scheduledWorkDays);
    if (remainingWorkDaysNeeded > 0 && availableDaysArray.length > 0) {
      availableDaysArray.sort((a, b) => a - b);
      const step = Math.max(1, Math.floor(availableDaysArray.length / remainingWorkDaysNeeded));
      let daysAdded = 0;
      
      for (let i = 0; i < availableDaysArray.length && daysAdded < remainingWorkDaysNeeded; i += step) {
        const day = availableDaysArray[i];
        
        // Check spacing from other work days
        let tooClose = false;
        for (let d = Math.max(SCHEDULE_CONSTANTS.MIN_DAY, day - 1); d <= Math.min(SCHEDULE_CONSTANTS.MAX_DAY, day + 1); d++) {
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
            } else if (rand < (PROBABILITIES.CRISIS_MODE.SECOND_PASS.DOUBLE_LARGE + PROBABILITIES.CRISIS_MODE.SECOND_PASS.MIXED_LARGE)) {
              chromosome[day] = Math.random() < 0.5 ? 'medium+large' : 'large+medium';
            } else {
              chromosome[day] = 'medium+medium';
            }
          } else {
            // Use proper shift distribution
            const rand = Math.random();
            if (rand < PROBABILITIES.SHIFT_PLACEMENT.FILL_LARGE) {
              chromosome[day] = 'large';
            } else if (rand < (PROBABILITIES.SHIFT_PLACEMENT.FILL_LARGE + PROBABILITIES.SHIFT_PLACEMENT.FILL_MEDIUM)) {
              chromosome[day] = 'medium';
            } else {
              chromosome[day] = 'small';
            }
          }
          daysAdded++;
        }
      }
      
      // Second pass if needed - fill remaining days
      if (daysAdded < remainingWorkDaysNeeded) {
        for (const day of availableDaysArray) {
          if (!chromosome[day] && daysAdded < remainingWorkDaysNeeded) {
            const rand = Math.random();
            if (rand < PROBABILITIES.SHIFT_PLACEMENT.FILL_LARGE) {
              chromosome[day] = 'large';
            } else if (rand < (PROBABILITIES.SHIFT_PLACEMENT.FILL_LARGE + PROBABILITIES.SHIFT_PLACEMENT.FILL_MEDIUM)) {
              chromosome[day] = 'medium';
            } else {
              chromosome[day] = 'small';
            }
            daysAdded++;
          }
        }
      }
    }
    
    // Return only days 1-30 (skip index 0)
    return chromosome.slice(SCHEDULE_CONSTANTS.MIN_DAY, SCHEDULE_CONSTANTS.MAX_DAY + 1);
  }

  calculateFitness(chromosome) {
    let balance = this.effectiveStartingBalance;
    let totalEarnings = 0;
    let violations = 0;
    let workDays = 0;
    let workDaysList = [];
    let minBalance = balance;
    let consecutiveDays = 0;
    let maxConsecutiveDays = 0;
    
    // Process each day
    for (let day = SCHEDULE_CONSTANTS.MIN_DAY; day <= SCHEDULE_CONSTANTS.MAX_DAY; day++) {
      const shift = chromosome[day - 1]; // Adjust for 0-based array
      
      // Add deposits
      balance += this.depositsByDay[day] || 0;
      
      // Apply shift earnings
      if (shift) {
        let dayEarnings = 0;
        
        // Handle double shifts
        if (shift.includes('+')) {
          const shifts = shift.split('+');
          for (const s of shifts) {
            dayEarnings += this.shiftTypes[s] ? this.shiftTypes[s].net : 0;
          }
        } else {
          dayEarnings = this.shiftTypes[shift] ? this.shiftTypes[shift].net : 0;
        }
        
        balance += dayEarnings;
        totalEarnings += dayEarnings;
        workDays++;
        workDaysList.push(day);
        consecutiveDays++;
        maxConsecutiveDays = Math.max(maxConsecutiveDays, consecutiveDays);
      } else {
        consecutiveDays = 0;
      }
      
      // Subtract expenses
      balance -= this.expensesByDay[day] || 0;
      
      // Track minimum balance
      if (balance < minBalance) {
        minBalance = balance;
      }
      
      // Count balance violations
      if (balance < this.config.minimumBalance) {
        violations++;
      }
    }
    
    // EXACT copy of client NormalFitnessStrategy.evaluate()
    const targetEndingBalance = this.config.targetEndingBalance;
    const minimumBalance = this.config.minimumBalance;
    const finalBalanceDiff = Math.abs(balance - targetEndingBalance);
    const idealWorkDays = Math.ceil(this.requiredFlexNet / this.shiftTypes.large.net);
    const workDayDiff = Math.abs(workDays - idealWorkDays);
    
    // Work day penalty
    const workDayPenalty = workDayDiff * FITNESS_WEIGHTS.WORK_DAYS.WORK_DAY_DIFF_PENALTY;
    
    // Consecutive penalty  
    let consecutivePenalty = 0;
    if (maxConsecutiveDays > FITNESS_WEIGHTS.WORK_DAYS.MAX_CONSECUTIVE_DAYS) {
      consecutivePenalty = (maxConsecutiveDays - FITNESS_WEIGHTS.WORK_DAYS.MAX_CONSECUTIVE_DAYS) * FITNESS_WEIGHTS.WORK_DAYS.CONSECUTIVE_DAY_PENALTY;
    }
    
    // Gap variance and too small gaps
    let gapVariance = 0;
    let tooSmallGapsPenalty = 0;
    if (workDaysList.length > 1) {
      const gaps = [];
      for (let i = 1; i < workDaysList.length; i++) {
        gaps.push(workDaysList[i] - workDaysList[i - 1]);
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
      tooSmallGapsPenalty = gaps.filter(g => g < FITNESS_WEIGHTS.WORK_DAYS.MIN_GAP_DAYS).length * FITNESS_WEIGHTS.WORK_DAYS.SMALL_GAP_PENALTY;
    }
    
    // Clustering penalty
    let clusteringPenalty = 0;
    for (let day = SCHEDULE_CONSTANTS.MIN_DAY; day <= (SCHEDULE_CONSTANTS.MAX_DAY - FITNESS_WEIGHTS.CLUSTERING.WINDOW_SIZE + 1); day++) {
      let workDaysInWindow = 0;
      for (const workDay of workDaysList) {
        if (workDay >= day && workDay < day + FITNESS_WEIGHTS.CLUSTERING.WINDOW_SIZE) {
          workDaysInWindow++;
        }
      }
      if (workDaysInWindow > FITNESS_WEIGHTS.CLUSTERING.MAX_WORK_DAYS_IN_WINDOW) {
        clusteringPenalty += (workDaysInWindow - FITNESS_WEIGHTS.CLUSTERING.MAX_WORK_DAYS_IN_WINDOW) * FITNESS_WEIGHTS.CLUSTERING.CLUSTERING_PENALTY;
      }
    }
    
    // Balance penalty with progressive overshooting
    let balancePenalty = finalBalanceDiff * FITNESS_WEIGHTS.BALANCE.FINAL_BALANCE_PENALTY;
    if (balance > targetEndingBalance) {
      const overshootRatio = (balance - targetEndingBalance) / targetEndingBalance;
      balancePenalty *= 1 + overshootRatio * FITNESS_WEIGHTS.BALANCE.OVERSHOOT_MULTIPLIER;
    }
    
    // Final fitness calculation (EXACTLY matching client)
    const fitness = 
      violations * FITNESS_WEIGHTS.BALANCE.VIOLATION_PENALTY +
      balancePenalty +
      workDayPenalty +
      consecutivePenalty +
      Math.sqrt(gapVariance) * FITNESS_WEIGHTS.WORK_DAYS.GAP_VARIANCE_WEIGHT +
      tooSmallGapsPenalty +
      clusteringPenalty +
      (minBalance < minimumBalance ? Math.abs(minBalance - minimumBalance) * FITNESS_WEIGHTS.BALANCE.FINAL_BALANCE_PENALTY : 0);
    
    return {
      fitness,
      balance,
      workDays,
      violations,
      totalEarnings,
      minBalance,
      workDaysList
    };
  }

  async optimize(progressCallback) {
    const populationSize = this.config.populationSize || GENETIC_ALGORITHM.POPULATION_SIZE;
    const generations = this.config.generations || GENETIC_ALGORITHM.GENERATIONS;
    
    // Initialize population
    let population = [];
    for (let i = 0; i < populationSize; i++) {
      const schedule = this.generateRandomSchedule();
      const fitness = this.calculateFitness(schedule);
      population.push({ schedule, ...fitness });
    }
    
    // Early termination tracking (EXACT match client)
    let bestEverFitness = Infinity;
    let generationsWithoutImprovement = 0;
    const maxGenerationsWithoutImprovement = GENETIC_ALGORITHM.STAGNATION_LIMIT;
    let actualGenerations = 0;
    
    // Evolution loop
    for (let gen = 0; gen < generations; gen++) {
      actualGenerations = gen;
      // Sort by fitness (lower is better, matching client-side)
      population.sort((a, b) => a.fitness - b.fitness);
      
      // Check for improvement (EXACT match client)
      if (population[0].fitness < bestEverFitness * GENETIC_ALGORITHM.IMPROVEMENT_THRESHOLD) {
        bestEverFitness = population[0].fitness;
        generationsWithoutImprovement = 0;
      } else {
        generationsWithoutImprovement++;
      }
      
      // Early termination (EXACT match client)
      const best = population[0];
      const balanceTolerance = GENETIC_ALGORITHM.EARLY_TERMINATION.BALANCE_TOLERANCE;
      const targetLow = this.config.targetEndingBalance - balanceTolerance;
      const targetHigh = this.config.targetEndingBalance + balanceTolerance;
      
      // Early termination - check if we have a perfect or near-perfect solution
      // Allow earlier termination if solution is really good
      const isPerfectSolution = best.violations === 0 && 
                               best.balance >= targetLow && 
                               best.balance <= targetHigh;
      
      const canTerminateEarly = (
        // Original condition from client
        (gen > GENETIC_ALGORITHM.EARLY_TERMINATION.FIRST_CHECK && generationsWithoutImprovement > maxGenerationsWithoutImprovement && isPerfectSolution) ||
        // Allow earlier termination for perfect solutions with no improvement
        (gen > GENETIC_ALGORITHM.EARLY_TERMINATION.SECOND_CHECK && generationsWithoutImprovement > GENETIC_ALGORITHM.EARLY_TERMINATION.FINAL_CHECK && isPerfectSolution && best.fitness < GENETIC_ALGORITHM.EARLY_TERMINATION.FITNESS_THRESHOLD) ||
        // Very early termination for extremely good solutions
        (gen > GENETIC_ALGORITHM.EARLY_TERMINATION.FINAL_CHECK && isPerfectSolution && best.fitness < GENETIC_ALGORITHM.EARLY_TERMINATION.EXTENDED_THRESHOLD)
      );
      
      if (canTerminateEarly) {
        console.log(`Early termination at generation ${gen}! Fitness: ${best.fitness}, Balance: ${best.balance}`);
        break;
      }
      
      // Report progress
      if (progressCallback && gen % GENETIC_ALGORITHM.PROGRESS_INTERVAL === 0) {
        await progressCallback({
          generation: gen,
          progress: Math.round((gen / generations) * 100),
          bestFitness: population[0].fitness,
          workDays: population[0].workDays,
          balance: population[0].balance,
          violations: population[0].violations
        });
      }
      
      // Create next generation
      const newPopulation = [];
      
      // Keep best 10%
      const eliteSize = Math.max(GENETIC_ALGORITHM.MIN_ELITE_SIZE, Math.floor(populationSize * GENETIC_ALGORITHM.ELITE_PERCENTAGE)); // EXACT match client
      for (let i = 0; i < eliteSize; i++) {
        newPopulation.push(population[i]);
      }
      
      // Generate rest through crossover and mutation
      while (newPopulation.length < populationSize) {
        // Tournament selection for better diversity
        const parent1 = this.tournamentSelect(population);
        const parent2 = this.tournamentSelect(population);
        
        const child = this.crossover(parent1.schedule, parent2.schedule);
        const mutatedChild = this.mutate(child);
        
        const fitness = this.calculateFitness(mutatedChild);
        newPopulation.push({ schedule: mutatedChild, ...fitness });
      }
      
      population = newPopulation;
    }
    
    // Return best solution
    population.sort((a, b) => a.fitness - b.fitness);
    const best = population[0];
    
    console.log(`Optimization complete. Total generations: ${generations}, Terminated at: ${actualGenerations + 1}`);
    
    return {
      schedule: best.schedule,
      workDays: this.getWorkDaysList(best.schedule),
      totalEarnings: this.calculateTotalEarnings(best.schedule),
      finalBalance: best.balance,
      minBalance: best.minBalance,
      violations: best.violations,
      formattedSchedule: this.formatSchedule(best.schedule)
    };
  }

  crossover(parent1, parent2) {
    const child = [];
    
    // Two-point crossover
    const point1 = Math.floor(Math.random() * SCHEDULE_CONSTANTS.MAX_DAY);
    const point2 = Math.floor(Math.random() * SCHEDULE_CONSTANTS.MAX_DAY);
    const start = Math.min(point1, point2);
    const end = Math.max(point1, point2);
    
    for (let i = 0; i < parent1.length; i++) {
      if (i >= start && i <= end) {
        child.push(parent2[i]);
      } else {
        child.push(parent1[i]);
      }
    }
    return child;
  }

  mutate(chromosome) {
    const mutationRate = GENETIC_ALGORITHM.MUTATION_RATE; // EXACT match client
    const mutated = [...chromosome];
    const startDay = this.config.balanceEditDay ? this.config.balanceEditDay + 1 : SCHEDULE_CONSTANTS.MIN_DAY;
    
    for (let i = 0; i < mutated.length; i++) {
      const day = i + 1;
      
      // Skip days before balance edit or with manual constraints
      if (day < startDay || (this.config.manualConstraints && this.config.manualConstraints[day])) {
        continue;
      }
      
      if (Math.random() < mutationRate) {
        // Calculate if we need double shifts (extreme deficit)
        const availableDays = SCHEDULE_CONSTANTS.MAX_DAY - (this.config.balanceEditDay || 0);
        const deficitPerDay = this.requiredFlexNet / availableDays;
        const largeShiftEarnings = this.shiftTypes.large.net;
        const isExtremeDeficit = deficitPerDay > largeShiftEarnings;
        
        // Check spacing from adjacent days
        let hasAdjacentWorkDay = false;
        if (i > 0 && mutated[i - 1]) hasAdjacentWorkDay = true;
        if (i < mutated.length - 1 && mutated[i + 1]) hasAdjacentWorkDay = true;
        
        if (isExtremeDeficit) {
          // Extreme deficit - heavily bias towards double shifts
          const rand = Math.random();
          if (rand < PROBABILITIES.CRISIS_MODE.DOUBLE_LARGE) {
            mutated[i] = 'large+large';
          } else if (rand < (PROBABILITIES.CRISIS_MODE.DOUBLE_LARGE + PROBABILITIES.CRISIS_MODE.MIXED_LARGE)) {
            mutated[i] = Math.random() < 0.5 ? 'medium+large' : 'large+medium';
          } else {
            mutated[i] = 'medium+medium';
          }
        } else {
          const rand = Math.random();
          
          // Bias against removing well-spaced work days
          if (mutated[i] && !hasAdjacentWorkDay && rand < (1 - PROBABILITIES.MUTATION.REMOVE)) {
            continue; // Keep well-spaced work day
          }
          
          // Bias against adding work days next to existing ones
          if (!mutated[i] && hasAdjacentWorkDay && rand > PROBABILITIES.MUTATION.REMOVE) {
            mutated[i] = null;
            continue;
          }
          
          // Normal mutation with all possible options
          if (rand < PROBABILITIES.MUTATION.REMOVE) {
            mutated[i] = null;
          } else if (rand < (PROBABILITIES.MUTATION.REMOVE + PROBABILITIES.MUTATION.TO_SMALL)) {
            mutated[i] = 'small';
          } else if (rand < (PROBABILITIES.MUTATION.REMOVE + PROBABILITIES.MUTATION.TO_SMALL + PROBABILITIES.MUTATION.TO_MEDIUM)) {
            mutated[i] = 'medium';
          } else if (rand < (PROBABILITIES.MUTATION.REMOVE + PROBABILITIES.MUTATION.TO_SMALL + PROBABILITIES.MUTATION.TO_MEDIUM + PROBABILITIES.MUTATION.TO_LARGE)) {
            mutated[i] = 'large';
          } else {
            // Random from all options including double shifts
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
              'large+large'
            ];
            mutated[i] = allOptions[Math.floor(Math.random() * allOptions.length)];
          }
        }
      }
    }
    
    return mutated;
  }

  getWorkDaysList(schedule) {
    const workDays = [];
    for (let i = 0; i < schedule.length; i++) {
      if (schedule[i]) workDays.push(i + SCHEDULE_CONSTANTS.MIN_DAY);
    }
    return workDays;
  }

  calculateTotalEarnings(schedule) {
    let totalEarnings = 0;
    for (const shift of schedule) {
      if (shift) {
        // Handle double shifts
        if (shift.includes && shift.includes('+')) {
          const shifts = shift.split('+');
          for (const s of shifts) {
            const shiftType = s.trim();
            if (this.shiftTypes[shiftType]) {
              totalEarnings += this.shiftTypes[shiftType].net || this.shiftTypes[shiftType].value || 0;
            }
          }
        } else if (this.shiftTypes[shift]) {
          totalEarnings += this.shiftTypes[shift].net || this.shiftTypes[shift].value || 0;
        }
      }
    }
    return totalEarnings;
  }
  
  tournamentSelect(population) {
    const tournament = [];
    const tournamentSize = GENETIC_ALGORITHM.TOURNAMENT_SIZE; // EXACT match client
    
    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]);
    }
    
    // Sort by fitness (lower is better)
    tournament.sort((a, b) => a.fitness - b.fitness);
    return tournament[0];
  }

  formatSchedule(schedule) {
    let balance = this.config.startingBalance || VALIDATION.BALANCE.MIN_STARTING;
    
    return schedule.map((shift, index) => {
      const dayNumber = index + SCHEDULE_CONSTANTS.MIN_DAY;
      // Get the actual shift value from shiftTypes
      let earnings = 0;
      if (shift) {
        // Handle double shifts
        if (shift.includes('+')) {
          const shifts = shift.split('+');
          for (const s of shifts) {
            if (this.shiftTypes[s]) {
              earnings += this.shiftTypes[s].value || 0;
            }
          }
        } else if (this.shiftTypes[shift]) {
          earnings = this.shiftTypes[shift].value || 0;
        }
      }
      const expenses = this.expensesByDay[dayNumber] || 0;
      const deposit = this.depositsByDay[dayNumber] || 0
      
      const startBalance = balance;
      balance = balance + earnings - expenses + deposit;
      const endBalance = balance;
      
      return {
        day: dayNumber,
        shifts: shift ? (shift.includes('+') ? shift.split('+') : [shift]) : [], // Handle double shifts
        earnings: Number(earnings) || 0,
        expenses: Number(expenses) || 0,
        deposit: Number(deposit) || 0,
        startBalance: Number(startBalance) || 0,
        endBalance: Number(endBalance) || 0
      };
    });
  }
}

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === API_CONSTANTS.METHODS.OPTIONS) {
    res.status(API_CONSTANTS.STATUS_CODES.OK).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .end();
    return;
  }

  // Set CORS headers for all responses
  Object.keys(headers).forEach(key => {
    res.setHeader(key, headers[key]);
  });

  if (req.method !== API_CONSTANTS.METHODS.POST) {
    res.status(API_CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: 'Method not allowed',
      performanceMetrics: {
        startTime: Date.now(),
        endTime: Date.now(),
        totalTime: 0,
        serverRegion: process.env.VERCEL_REGION || 'unknown',
      },
    });
    return;
  }

  const startTime = Date.now();

  try {
    // Check for bot activity with Vercel BotID
    const { isBot } = await checkBotId();
    
    if (isBot) {
      console.log('Bot detected by Vercel BotID, blocking request');
      return res.status(403).json({ 
        success: false,
        error: 'Access denied', 
        message: 'Bot activity detected. Please verify you are human.',
        performanceMetrics: {
          startTime,
          endTime: Date.now(),
          totalTime: Date.now() - startTime,
          serverRegion: process.env.VERCEL_REGION || 'unknown',
        },
      });
    }

    const { config, expenses, deposits, shiftTypes } = req.body;


    if (!config) {
      throw new Error('No configuration provided');
    }

    // Create optimizer instance
    const optimizer = new SimpleGeneticOptimizer(
      config,
      expenses || [],
      deposits || [],
      shiftTypes
    );

    // Run optimization with progress callback
    const result = await optimizer.optimize(async (progress) => {
      // Progress logging for debugging
      if (progress.generation % GENETIC_ALGORITHM.LOG_INTERVAL === 0) {
        console.log(`Server optimization progress: Gen ${progress.generation}, Fitness: ${progress.bestFitness}`);
      }
    });

    const endTime = Date.now();

    res.status(API_CONSTANTS.STATUS_CODES.OK).json({
      success: true,
      result,
      performanceMetrics: {
        startTime,
        endTime,
        totalTime: endTime - startTime,
        serverRegion: process.env.VERCEL_REGION || 'unknown',
      },
    });
  } catch (error) {
    const endTime = Date.now();
    
    console.error('Optimization error:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(API_CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      performanceMetrics: {
        startTime,
        endTime,
        totalTime: endTime - startTime,
        serverRegion: process.env.VERCEL_REGION || 'unknown',
      },
    });
  }
};