import { FitnessManager } from '../FitnessManager';
import { FitnessContext } from '../../../types';

describe('FitnessManager', () => {
  let fitnessManager: FitnessManager;

  beforeEach(() => {
    fitnessManager = new FitnessManager();
  });

  describe('Normal Mode Strategy', () => {
    const normalContext: FitnessContext = {
      balance: 490.5,
      workDays: 10,
      violations: 0,
      totalEarnings: 865,
      minBalance: 50,
      workDaysList: [3, 5, 8, 10, 12, 15, 18, 20, 23, 26],
      inCrisisMode: false,
      targetEndingBalance: 490.5,
      minimumBalance: 0,
      requiredFlexNet: 850,
      balanceEditDay: null,
    };

    it('should calculate fitness for perfect solution', () => {
      const chromosome = new Array(31).fill(null);
      const fitness = fitnessManager.evaluateChromosome(
        chromosome,
        normalContext
      );

      expect(fitness).toBeLessThan(1000); // Low fitness for good solution
    });

    it('should penalize consecutive work days', () => {
      const contextWithConsecutive: FitnessContext = {
        ...normalContext,
        workDaysList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All consecutive
      };

      const fitness = fitnessManager.evaluateChromosome(
        new Array(31).fill(null),
        contextWithConsecutive
      );

      expect(fitness).toBeGreaterThan(
        fitnessManager.evaluateChromosome(
          new Array(31).fill(null),
          normalContext
        )
      );
    });

    it('should penalize minimum balance violations', () => {
      const contextWithViolations: FitnessContext = {
        ...normalContext,
        violations: 5,
        minBalance: -50,
      };

      const fitness = fitnessManager.evaluateChromosome(
        new Array(31).fill(null),
        contextWithViolations
      );

      expect(fitness).toBeGreaterThan(25000); // High penalty for violations
    });
  });

  describe('Crisis Mode Strategy', () => {
    const crisisContext: FitnessContext = {
      balance: 450,
      workDays: 25,
      violations: 0,
      totalEarnings: 2500,
      minBalance: 10,
      workDaysList: Array.from({ length: 25 }, (_, i) => i + 1),
      inCrisisMode: true,
      targetEndingBalance: 490.5,
      minimumBalance: 0,
      requiredFlexNet: 2400,
      balanceEditDay: null,
    };

    it('should heavily penalize insufficient balance', () => {
      const fitness = fitnessManager.evaluateChromosome(
        new Array(31).fill(null),
        crisisContext
      );

      expect(fitness).toBeGreaterThan(40000); // High penalty for below target
    });

    it('should allow overshoot with minimal penalty', () => {
      const overshootContext: FitnessContext = {
        ...crisisContext,
        balance: 550, // Above target
      };

      const fitness = fitnessManager.evaluateChromosome(
        new Array(31).fill(null),
        overshootContext
      );

      expect(fitness).toBeLessThan(100); // Very low penalty for overshoot
    });

    it('should penalize insufficient work days', () => {
      const insufficientWorkContext: FitnessContext = {
        ...crisisContext,
        workDays: 10,
        workDaysList: Array.from({ length: 10 }, (_, i) => i * 3 + 1),
        totalEarnings: 1000,
      };

      const fitness = fitnessManager.evaluateChromosome(
        new Array(31).fill(null),
        insufficientWorkContext
      );

      expect(fitness).toBeGreaterThan(100000); // Very high penalty
    });
  });

  describe('Debug Mode', () => {
    it('should log when debug is enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      fitnessManager.enableDebug();

      const context: FitnessContext = {
        balance: 490.5,
        workDays: 10,
        violations: 0,
        totalEarnings: 865,
        minBalance: 50,
        workDaysList: [3, 5, 8, 10, 12, 15, 18, 20, 23, 26],
        inCrisisMode: false,
        targetEndingBalance: 490.5,
        minimumBalance: 0,
        requiredFlexNet: 850,
        balanceEditDay: null,
      };

      fitnessManager.evaluateChromosome(new Array(31).fill(null), context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using Normal Mode fitness strategy')
      );

      consoleSpy.mockRestore();
    });

    it('should not log when debug is disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      fitnessManager.disableDebug();

      const context: FitnessContext = {
        balance: 490.5,
        workDays: 10,
        violations: 0,
        totalEarnings: 865,
        minBalance: 50,
        workDaysList: [],
        inCrisisMode: false,
        targetEndingBalance: 490.5,
        minimumBalance: 0,
        requiredFlexNet: 850,
        balanceEditDay: null,
      };

      fitnessManager.evaluateChromosome(new Array(31).fill(null), context);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
