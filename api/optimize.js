// @ts-check

/**
 * Vercel Serverless Function for Schedule Optimization
 * This is a self-contained version that doesn't rely on TypeScript imports
 */

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
    this.expensesByDay = new Array(31).fill(0);
    this.depositsByDay = new Array(31).fill(0);
    
    // Process expenses
    for (const exp of this.expenses) {
      if (exp && exp.day >= 1 && exp.day <= 30 && exp.amount) {
        this.expensesByDay[exp.day] = (this.expensesByDay[exp.day] || 0) + exp.amount;
      }
    }
    
    // Process deposits
    for (const dep of this.deposits) {
      if (dep && dep.day >= 1 && dep.day <= 30 && dep.amount) {
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
        large: { value: 86.5, net: 86.5, gross: 94.5 },
        medium: { value: 67.5, net: 67.5, gross: 75.5 },
        small: { value: 56.0, net: 56.0, gross: 64.0 }
      };
    }
    
    // Calculate required earnings (like client-side)
    this.requiredFlexNet = this.calculateRequiredEarnings();
    
    // Identify critical days
    this.criticalDays = this.identifyCriticalDays();
    
    // Set start day (for balance edit support)
    this.startDay = this.config.balanceEditDay ? this.config.balanceEditDay + 1 : 1;
    this.effectiveStartingBalance = this.config.balanceEditDay 
      ? this.config.newStartingBalance 
      : this.config.startingBalance;
    
    // Calculate total days based on expenses/deposits
    this.totalDays = this.calculateTotalDays();
  }

  calculateTotalDays() {
    // Always use 30 days to match client-side optimizer
    return 30;
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
    
    for (let day = startDay; day <= 30; day++) {
      runningBalance += this.depositsByDay[day] || 0;
      runningBalance -= this.expensesByDay[day] || 0;
      
      if (runningBalance < this.config.minimumBalance + 200) {
        criticalDays.push(day);
      }
    }
    
    return criticalDays;
  }

  generateRandomSchedule() {
    const chromosome = new Array(31).fill(null);
    
    // Apply manual constraints if any
    if (this.config.manualConstraints) {
      for (const [day, constraint] of Object.entries(this.config.manualConstraints)) {
        const dayNum = parseInt(day);
        if (constraint.shifts !== undefined) {
          chromosome[dayNum] = constraint.shifts;
        }
      }
    }
    
    const availableDays = 30 - (this.config.balanceEditDay || 0);
    const maxPossibleSingleShifts = availableDays * this.shiftTypes.large.net;
    const inCrisisMode = this.requiredFlexNet > maxPossibleSingleShifts;
    
    const avgEarnings = (this.shiftTypes.large.net + this.shiftTypes.medium.net + this.shiftTypes.small.net) / 3;
    const estimatedWorkDays = Math.ceil(this.requiredFlexNet / avgEarnings);
    
    // Cover critical days first
    for (const criticalDay of this.criticalDays) {
      const daysBeforeCritical = Math.floor(Math.random() * 4) + 2;
      const workDay = Math.max(this.startDay, criticalDay - daysBeforeCritical);
      
      if (workDay <= 30 && !chromosome[workDay]) {
        if (inCrisisMode) {
          // Crisis mode - use double shifts
          const rand = Math.random();
          if (rand < 0.4) {
            chromosome[workDay] = 'large+large';
          } else if (rand < 0.8) {
            chromosome[workDay] = Math.random() < 0.5 ? 'medium+large' : 'large+medium';
          } else {
            chromosome[workDay] = 'medium+medium';
          }
        } else {
          // Normal mode - prefer single shifts with proper distribution
          const shiftType = Math.random() < 0.6 ? 'large' : (Math.random() < 0.8 ? 'medium' : 'small');
          chromosome[workDay] = shiftType;
        }
      }
    }
    
    // Count scheduled work days
    let scheduledWorkDays = 0;
    for (let d = this.startDay; d <= 30; d++) {
      if (chromosome[d]) scheduledWorkDays++;
    }
    
    // Calculate minimum work days needed
    let minWorkDaysNeeded = Math.ceil(this.requiredFlexNet / this.shiftTypes.large.net);
    if (inCrisisMode) {
      const avgDoubleShiftEarnings = 150; // Approximate
      minWorkDaysNeeded = Math.max(
        Math.floor(availableDays * 0.9),
        Math.ceil(this.requiredFlexNet / avgDoubleShiftEarnings)
      );
    }
    
    // Get available days for work
    const availableDaysArray = [];
    for (let day = this.startDay; day <= 30; day++) {
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
        for (let d = Math.max(1, day - 1); d <= Math.min(30, day + 1); d++) {
          if (d !== day && chromosome[d]) {
            tooClose = true;
            break;
          }
        }
        
        if (!tooClose) {
          if (inCrisisMode) {
            const rand = Math.random();
            if (rand < 0.3) {
              chromosome[day] = 'large+large';
            } else if (rand < 0.7) {
              chromosome[day] = Math.random() < 0.5 ? 'medium+large' : 'large+medium';
            } else {
              chromosome[day] = 'medium+medium';
            }
          } else {
            // Use proper shift distribution
            const rand = Math.random();
            if (rand < 0.5) {
              chromosome[day] = 'large';
            } else if (rand < 0.8) {
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
            if (rand < 0.5) {
              chromosome[day] = 'large';
            } else if (rand < 0.8) {
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
    return chromosome.slice(1, 31);
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
    for (let day = 1; day <= 30; day++) {
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
    const workDayPenalty = workDayDiff * 200;
    
    // Consecutive penalty  
    let consecutivePenalty = 0;
    if (maxConsecutiveDays > 5) {
      consecutivePenalty = (maxConsecutiveDays - 5) * 500;
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
      tooSmallGapsPenalty = gaps.filter(g => g < 2).length * 150;
    }
    
    // Clustering penalty
    let clusteringPenalty = 0;
    for (let day = 1; day <= 26; day++) {
      let workDaysInWindow = 0;
      for (const workDay of workDaysList) {
        if (workDay >= day && workDay < day + 5) {
          workDaysInWindow++;
        }
      }
      if (workDaysInWindow > 3) {
        clusteringPenalty += (workDaysInWindow - 3) * 300;
      }
    }
    
    // Balance penalty with progressive overshooting
    let balancePenalty = finalBalanceDiff * 100;
    if (balance > targetEndingBalance) {
      const overshootRatio = (balance - targetEndingBalance) / targetEndingBalance;
      balancePenalty *= 1 + overshootRatio * 2;
    }
    
    // Final fitness calculation (EXACTLY matching client)
    const fitness = 
      violations * 5000 +
      balancePenalty +
      workDayPenalty +
      consecutivePenalty +
      Math.sqrt(gapVariance) * 150 +
      tooSmallGapsPenalty +
      clusteringPenalty +
      (minBalance < minimumBalance ? Math.abs(minBalance - minimumBalance) * 100 : 0);
    
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
    const populationSize = this.config.populationSize || 100;
    const generations = this.config.generations || 100;
    
    // Initialize population
    let population = [];
    for (let i = 0; i < populationSize; i++) {
      const schedule = this.generateRandomSchedule();
      const fitness = this.calculateFitness(schedule);
      population.push({ schedule, ...fitness });
    }
    
    // Evolution loop
    for (let gen = 0; gen < generations; gen++) {
      // Sort by fitness (higher is better)
      population.sort((a, b) => b.fitness - a.fitness);
      
      // Report progress
      if (progressCallback) {
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
      const eliteSize = Math.max(30, Math.floor(populationSize * 0.2)); // EXACT match client
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
    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];
    
    return {
      schedule: best.schedule,
      workDays: this.getWorkDaysList(best.schedule),
      totalEarnings: this.calculateTotalEarnings(best.schedule),
      finalBalance: best.balance,
      minBalance: best.balance - 500, // Approximate
      violations: best.violations,
      formattedSchedule: this.formatSchedule(best.schedule)
    };
  }

  crossover(parent1, parent2) {
    const child = [];
    
    // Two-point crossover
    const point1 = Math.floor(Math.random() * 30);
    const point2 = Math.floor(Math.random() * 30);
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
    const mutationRate = 0.15; // EXACT match client
    const mutated = [...chromosome];
    const startDay = this.config.balanceEditDay ? this.config.balanceEditDay + 1 : 1;
    
    for (let i = 0; i < mutated.length; i++) {
      const day = i + 1;
      
      // Skip days before balance edit or with manual constraints
      if (day < startDay || (this.config.manualConstraints && this.config.manualConstraints[day])) {
        continue;
      }
      
      if (Math.random() < mutationRate) {
        // Calculate if we need double shifts (extreme deficit)
        const availableDays = 30 - (this.config.balanceEditDay || 0);
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
          if (rand < 0.4) {
            mutated[i] = 'large+large';
          } else if (rand < 0.8) {
            mutated[i] = Math.random() < 0.5 ? 'medium+large' : 'large+medium';
          } else {
            mutated[i] = 'medium+medium';
          }
        } else {
          const rand = Math.random();
          
          // Bias against removing well-spaced work days
          if (mutated[i] && !hasAdjacentWorkDay && rand < 0.8) {
            continue; // Keep well-spaced work day
          }
          
          // Bias against adding work days next to existing ones
          if (!mutated[i] && hasAdjacentWorkDay && rand > 0.2) {
            mutated[i] = null;
            continue;
          }
          
          // Normal mutation with all possible options
          if (rand < 0.2) {
            mutated[i] = null;
          } else if (rand < 0.5) {
            mutated[i] = 'medium';
          } else if (rand < 0.7) {
            mutated[i] = 'medium+medium';
          } else if (rand < 0.85) {
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
      if (schedule[i]) workDays.push(i + 1);
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
    const tournamentSize = 7; // EXACT match client
    
    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]);
    }
    
    // Sort by fitness (lower is better)
    tournament.sort((a, b) => a.fitness - b.fitness);
    return tournament[0];
  }

  formatSchedule(schedule) {
    let balance = this.config.startingBalance || 1000;
    
    return schedule.map((shift, index) => {
      const dayNumber = index + 1;
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
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .end();
    return;
  }

  // Set CORS headers for all responses
  Object.keys(headers).forEach(key => {
    res.setHeader(key, headers[key]);
  });

  if (req.method !== 'POST') {
    res.status(405).json({
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

    // Run optimization
    const result = await optimizer.optimize();

    const endTime = Date.now();

    res.status(200).json({
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
    
    res.status(500).json({
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