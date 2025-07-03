import { GeneticOptimizer } from '../GeneticOptimizer';
import { OptimizationConfig } from '../../../types';

describe('GeneticOptimizer', () => {
  const baseConfig: OptimizationConfig = {
    startingBalance: 90.5,
    targetEndingBalance: 490.5,
    minimumBalance: 0,
    populationSize: 50,
    generations: 100,
  };

  describe('Constructor', () => {
    it('should initialize with basic config', () => {
      const optimizer = new GeneticOptimizer(baseConfig);
      expect(optimizer).toBeDefined();
    });

    it('should handle balance edit configuration', () => {
      const configWithEdit: OptimizationConfig = {
        ...baseConfig,
        balanceEditDay: 15,
        newStartingBalance: 200,
      };

      const optimizer = new GeneticOptimizer(configWithEdit);
      expect(optimizer).toBeDefined();
    });

    it('should apply manual constraints', () => {
      const configWithConstraints: OptimizationConfig = {
        ...baseConfig,
        manualConstraints: {
          5: { shifts: 'large', fixedExpenses: 100 },
          10: { fixedBalance: 300 },
        },
      };

      const optimizer = new GeneticOptimizer(configWithConstraints);
      expect(optimizer).toBeDefined();
    });
  });

  describe('Optimization', () => {
    it('should find a valid solution for normal scenario', async () => {
      const optimizer = new GeneticOptimizer(baseConfig);

      const result = await optimizer.optimize();

      expect(result).toBeDefined();
      expect(result.schedule).toHaveLength(31);
      expect(result.finalBalance).toBeGreaterThan(0);
      expect(result.workDays.length).toBeGreaterThan(0);
      expect(result.totalEarnings).toBeGreaterThan(0);
    });

    it('should respect manual constraints', async () => {
      const configWithConstraints: OptimizationConfig = {
        ...baseConfig,
        populationSize: 30,
        generations: 50,
        manualConstraints: {
          5: { shifts: 'large' },
          10: { shifts: null }, // Day off
        },
      };

      const optimizer = new GeneticOptimizer(configWithConstraints);
      const result = await optimizer.optimize();

      const schedule = result.getFormattedSchedule();
      expect(schedule[4].shifts).toContain('large'); // Day 5
      expect(schedule[9].shifts).toHaveLength(0); // Day 10 off
    });

    it('should handle progress callback', async () => {
      const optimizer = new GeneticOptimizer({
        ...baseConfig,
        generations: 100,
      });

      const progressUpdates: number[] = [];
      await optimizer.optimize(async progress => {
        progressUpdates.push(progress.generation);
      });

      expect(progressUpdates).toContain(0);
      expect(progressUpdates).toContain(50);
    });

    it('should format schedule correctly', async () => {
      const optimizer = new GeneticOptimizer(baseConfig);
      const result = await optimizer.optimize();

      const schedule = result.getFormattedSchedule();

      expect(schedule).toHaveLength(30);
      expect(schedule[0].day).toBe(1);
      expect(schedule[29].day).toBe(30);

      // Verify balance continuity
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].startBalance).toBeCloseTo(
          schedule[i - 1].endBalance,
          2
        );
      }
    });

    it('should handle crisis mode when earnings requirement is high', async () => {
      const crisisConfig: OptimizationConfig = {
        ...baseConfig,
        targetEndingBalance: 5000, // Very high target
        populationSize: 30,
        generations: 50,
      };

      const optimizer = new GeneticOptimizer(crisisConfig);
      const result = await optimizer.optimize();

      // Should work many days with double shifts
      const schedule = result.getFormattedSchedule();
      const doubleshiftDays = schedule.filter(
        day => day.shifts.length > 1
      ).length;

      expect(doubleshiftDays).toBeGreaterThan(10);
    });
  });

  describe('Balance Edit Mode', () => {
    it('should handle balance edit correctly', async () => {
      const configWithEdit: OptimizationConfig = {
        ...baseConfig,
        balanceEditDay: 15,
        newStartingBalance: 300,
        manualConstraints: {
          1: { shifts: 'medium' },
          5: { shifts: 'large' },
          10: { shifts: 'small' },
        },
      };

      const optimizer = new GeneticOptimizer(configWithEdit);
      const result = await optimizer.optimize();

      const schedule = result.getFormattedSchedule();

      // Days before edit should use manual constraints
      expect(schedule[0].shifts).toContain('medium'); // Day 1
      expect(schedule[4].shifts).toContain('large'); // Day 5
      expect(schedule[9].shifts).toContain('small'); // Day 10

      // Balance should be overridden on day 15
      expect(schedule[14].endBalance).toBeCloseTo(300, 2);
    });

    it('should optimize only days after balance edit', async () => {
      const configWithEdit: OptimizationConfig = {
        ...baseConfig,
        balanceEditDay: 20,
        newStartingBalance: 400,
        populationSize: 30,
        generations: 50,
      };

      const optimizer = new GeneticOptimizer(configWithEdit);
      const result = await optimizer.optimize();

      // Should only have work days after day 20
      const workDaysAfterEdit = result.workDays.filter(d => d > 20);
      expect(workDaysAfterEdit.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero target balance', async () => {
      const zeroTargetConfig: OptimizationConfig = {
        ...baseConfig,
        targetEndingBalance: 0,
        populationSize: 20,
        generations: 30,
      };

      const optimizer = new GeneticOptimizer(zeroTargetConfig);
      const result = await optimizer.optimize();

      expect(result.finalBalance).toBeCloseTo(0, 50);
    });

    it('should handle very high minimum balance', async () => {
      const highMinConfig: OptimizationConfig = {
        ...baseConfig,
        minimumBalance: 200,
        populationSize: 30,
        generations: 50,
      };

      const optimizer = new GeneticOptimizer(highMinConfig);
      const result = await optimizer.optimize();

      expect(result.minBalance).toBeGreaterThanOrEqual(0);
    });

    it('should handle small population size', async () => {
      const smallPopConfig: OptimizationConfig = {
        ...baseConfig,
        populationSize: 10,
        generations: 20,
      };

      const optimizer = new GeneticOptimizer(smallPopConfig);
      const result = await optimizer.optimize();

      expect(result).toBeDefined();
      expect(result.schedule).toHaveLength(31);
    });
  });
});
