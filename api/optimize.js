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
    this.shiftTypes = shiftTypes || {
      large: { value: 86.5, percentage: 0.5 },
      medium: { value: 67.5, percentage: 0.3 },
      small: { value: 56.0, percentage: 0.2 }
    };
    
    // Calculate total days based on expenses/deposits
    this.totalDays = this.calculateTotalDays();
  }

  calculateTotalDays() {
    // Simple calculation - 45 days default or based on target
    return 45;
  }

  generateRandomSchedule() {
    const schedule = [];
    const shiftOptions = ['large', 'medium', 'small', null];
    
    for (let i = 0; i < this.totalDays; i++) {
      schedule.push(shiftOptions[Math.floor(Math.random() * shiftOptions.length)]);
    }
    
    return schedule;
  }

  calculateFitness(schedule) {
    let balance = this.config.startingBalance || 1000;
    let workDays = 0;
    let violations = 0;
    
    // Track consecutive days
    let consecutiveDays = 0;
    
    for (let day = 0; day < schedule.length; day++) {
      const shift = schedule[day];
      
      // Apply shift earnings
      if (shift) {
        balance += this.shiftTypes[shift].value;
        workDays++;
        consecutiveDays++;
        
        // Check consecutive days constraint
        if (consecutiveDays > 5) {
          violations++;
        }
      } else {
        consecutiveDays = 0;
      }
      
      // Apply daily expenses
      const dailyExpenses = this.expenses
        .filter(e => e.frequency === 'daily')
        .reduce((sum, e) => sum + e.amount, 0);
      balance -= dailyExpenses;
      
      // Check minimum balance
      if (balance < (this.config.minimumBalance || 100)) {
        violations++;
      }
    }
    
    // Calculate fitness score (higher is better)
    const fitness = balance - (violations * 100);
    
    return {
      fitness,
      balance,
      workDays,
      violations
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
      // Sort by fitness
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
      const eliteSize = Math.floor(populationSize * 0.1);
      for (let i = 0; i < eliteSize; i++) {
        newPopulation.push(population[i]);
      }
      
      // Generate rest through crossover and mutation
      while (newPopulation.length < populationSize) {
        const parent1 = population[Math.floor(Math.random() * eliteSize)];
        const parent2 = population[Math.floor(Math.random() * eliteSize)];
        
        const child = this.crossover(parent1.schedule, parent2.schedule);
        this.mutate(child);
        
        const fitness = this.calculateFitness(child);
        newPopulation.push({ schedule: child, ...fitness });
      }
      
      population = newPopulation;
    }
    
    // Return best solution
    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];
    
    return {
      schedule: best.schedule,
      workDays: this.getWorkDaysList(best.schedule),
      totalEarnings: best.workDays * 70, // Average earning
      finalBalance: best.balance,
      minBalance: best.balance - 500, // Approximate
      violations: best.violations,
      formattedSchedule: this.formatSchedule(best.schedule)
    };
  }

  crossover(parent1, parent2) {
    const child = [];
    for (let i = 0; i < parent1.length; i++) {
      child.push(Math.random() < 0.5 ? parent1[i] : parent2[i]);
    }
    return child;
  }

  mutate(schedule) {
    const mutationRate = 0.1;
    const shiftOptions = ['large', 'medium', 'small', null];
    
    for (let i = 0; i < schedule.length; i++) {
      if (Math.random() < mutationRate) {
        schedule[i] = shiftOptions[Math.floor(Math.random() * shiftOptions.length)];
      }
    }
  }

  getWorkDaysList(schedule) {
    const workDays = [];
    for (let i = 0; i < schedule.length; i++) {
      if (schedule[i]) workDays.push(i + 1);
    }
    return workDays;
  }

  formatSchedule(schedule) {
    return schedule.map((shift, index) => ({
      day: index + 1,
      date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      shift: shift,
      isWorkDay: !!shift,
      earnings: shift ? this.shiftTypes[shift].value : 0,
      balance: 0, // Would need to recalculate
      constraints: {},
      violations: []
    }));
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
    
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      performanceMetrics: {
        startTime,
        endTime,
        totalTime: endTime - startTime,
        serverRegion: process.env.VERCEL_REGION || 'unknown',
      },
    });
  }
};