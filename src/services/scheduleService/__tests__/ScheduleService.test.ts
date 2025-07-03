import { ScheduleService } from '../ScheduleService';
import { DaySchedule, Edit, OptimizationConfig } from '../../../types';

describe('ScheduleService', () => {
  let scheduleService: ScheduleService;
  let mockSchedule: DaySchedule[];
  let mockConfig: OptimizationConfig;

  beforeEach(() => {
    scheduleService = new ScheduleService();

    mockConfig = {
      startingBalance: 100,
      targetEndingBalance: 500,
      minimumBalance: 0,
      populationSize: 100,
      generations: 1000,
    };

    mockSchedule = [
      {
        day: 1,
        shifts: ['medium'],
        earnings: 67.5,
        expenses: 50,
        deposit: 0,
        startBalance: 100,
        endBalance: 117.5,
      },
      {
        day: 2,
        shifts: [],
        earnings: 0,
        expenses: 30,
        deposit: 0,
        startBalance: 117.5,
        endBalance: 87.5,
      },
      {
        day: 3,
        shifts: ['large'],
        earnings: 86.5,
        expenses: 40,
        deposit: 366,
        startBalance: 87.5,
        endBalance: 500,
      },
    ];
  });

  describe('applyEditsToSchedule', () => {
    it('should apply earnings edit and recalculate balances', () => {
      const edits: Edit[] = [
        {
          day: 1,
          field: 'earnings',
          originalValue: 67.5,
          newValue: 100,
        },
      ];

      const result = scheduleService.applyEditsToSchedule(
        mockSchedule,
        edits,
        mockConfig
      );

      expect(result[0].earnings).toBe(100);
      expect(result[0].endBalance).toBe(150); // 100 + 100 - 50
      expect(result[1].startBalance).toBe(150);
      expect(result[1].endBalance).toBe(120); // 150 - 30
      expect(result[2].startBalance).toBe(120);
      expect(result[2].endBalance).toBe(532.5); // 120 + 366 + 86.5 - 40
    });

    it('should apply expenses edit and recalculate balances', () => {
      const edits: Edit[] = [
        {
          day: 2,
          field: 'expenses',
          originalValue: 30,
          newValue: 50,
        },
      ];

      const result = scheduleService.applyEditsToSchedule(
        mockSchedule,
        edits,
        mockConfig
      );

      expect(result[1].expenses).toBe(50);
      expect(result[1].endBalance).toBe(67.5); // 117.5 - 50
      expect(result[2].startBalance).toBe(67.5);
      expect(result[2].endBalance).toBe(480); // 67.5 + 366 + 86.5 - 40
    });

    it('should apply balance edit and recalculate subsequent days', () => {
      const edits: Edit[] = [
        {
          day: 1,
          field: 'balance',
          originalValue: 117.5,
          newValue: 150,
        },
      ];

      const result = scheduleService.applyEditsToSchedule(
        mockSchedule,
        edits,
        mockConfig
      );

      expect(result[0].endBalance).toBe(150);
      expect(result[1].startBalance).toBe(150);
      expect(result[1].endBalance).toBe(120); // 150 - 30
      expect(result[2].startBalance).toBe(120);
    });

    it('should handle multiple edits', () => {
      const edits: Edit[] = [
        {
          day: 1,
          field: 'earnings',
          originalValue: 67.5,
          newValue: 100,
        },
        {
          day: 2,
          field: 'expenses',
          originalValue: 30,
          newValue: 20,
        },
      ];

      const result = scheduleService.applyEditsToSchedule(
        mockSchedule,
        edits,
        mockConfig
      );

      expect(result[0].earnings).toBe(100);
      expect(result[1].expenses).toBe(20);
      expect(result[2].endBalance).toBe(542.5); // Recalculated
    });

    it('should ignore invalid day edits', () => {
      const edits: Edit[] = [
        {
          day: 0,
          field: 'earnings',
          originalValue: 0,
          newValue: 100,
        },
        {
          day: 31,
          field: 'expenses',
          originalValue: 0,
          newValue: 50,
        },
      ];

      const result = scheduleService.applyEditsToSchedule(
        mockSchedule,
        edits,
        mockConfig
      );

      expect(result).toEqual(mockSchedule);
    });
  });

  describe('generateManualConstraints', () => {
    it('should generate shift constraints from earnings edits', () => {
      const edits: Edit[] = [
        {
          day: 1,
          field: 'earnings',
          originalValue: 0,
          newValue: 67.5,
        },
        {
          day: 2,
          field: 'earnings',
          originalValue: 0,
          newValue: 0,
        },
      ];

      const constraints = scheduleService.generateManualConstraints(
        mockSchedule,
        edits
      );

      expect(constraints[1].shifts).toBe('medium');
      expect(constraints[2].shifts).toBeNull();
    });

    it('should generate fixed earnings for non-standard amounts', () => {
      const edits: Edit[] = [
        {
          day: 1,
          field: 'earnings',
          originalValue: 0,
          newValue: 75, // Not a standard shift amount
        },
      ];

      const constraints = scheduleService.generateManualConstraints(
        mockSchedule,
        edits
      );

      expect(constraints[1].fixedEarnings).toBe(75);
      expect(constraints[1].shifts).toBeUndefined();
    });

    it('should generate expense constraints', () => {
      const edits: Edit[] = [
        {
          day: 1,
          field: 'expenses',
          originalValue: 50,
          newValue: 75,
        },
      ];

      const constraints = scheduleService.generateManualConstraints(
        mockSchedule,
        edits
      );

      expect(constraints[1].fixedExpenses).toBe(75);
    });

    it('should generate balance constraints', () => {
      const edits: Edit[] = [
        {
          day: 1,
          field: 'balance',
          originalValue: 117.5,
          newValue: 200,
        },
      ];

      const constraints = scheduleService.generateManualConstraints(
        mockSchedule,
        edits
      );

      expect(constraints[1].fixedBalance).toBe(200);
    });

    it('should handle double shift combinations', () => {
      const edits: Edit[] = [
        {
          day: 1,
          field: 'earnings',
          originalValue: 0,
          newValue: 135, // medium+medium
        },
        {
          day: 2,
          field: 'earnings',
          originalValue: 0,
          newValue: 154, // medium+large
        },
      ];

      const constraints = scheduleService.generateManualConstraints(
        mockSchedule,
        edits
      );

      expect(constraints[1].shifts).toBe('medium+medium');
      expect(constraints[2].shifts).toBe('medium+large');
    });
  });

  describe('validateSchedule', () => {
    it('should validate a correct schedule', () => {
      const result = scheduleService.validateSchedule(mockSchedule, mockConfig);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect minimum balance violations', () => {
      const scheduleWithViolation = [...mockSchedule];
      scheduleWithViolation[1].endBalance = -10;

      const configWithMin = { ...mockConfig, minimumBalance: 0 };
      const result = scheduleService.validateSchedule(
        scheduleWithViolation,
        configWithMin
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain(
        'Day 2: Balance ($-10.00) below minimum ($0.00)'
      );
    });

    it('should detect balance calculation errors', () => {
      const scheduleWithError = [...mockSchedule];
      scheduleWithError[0].endBalance = 200; // Wrong calculation

      const result = scheduleService.validateSchedule(
        scheduleWithError,
        mockConfig
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain(
        'Day 1: Balance calculation mismatch'
      );
    });

    it('should detect significant final balance deviation', () => {
      const scheduleWithBadFinal = [...mockSchedule];
      scheduleWithBadFinal[2].endBalance = 134; // Far from target 500 but matches calculation
      scheduleWithBadFinal[2].deposit = 0; // Adjust deposit to make balance calculation correct

      const result = scheduleService.validateSchedule(
        scheduleWithBadFinal,
        mockConfig
      );

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('Final balance'))).toBe(true);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate correct metrics', () => {
      const metrics = scheduleService.calculateMetrics(mockSchedule);

      expect(metrics.totalWorkDays).toBe(2); // Days 1 and 3
      expect(metrics.totalEarnings).toBe(154); // 67.5 + 86.5
      expect(metrics.totalExpenses).toBe(120); // 50 + 30 + 40
      expect(metrics.averageBalance).toBeCloseTo(235, 2);
      expect(metrics.minBalance).toBe(87.5);
      expect(metrics.maxBalance).toBe(500);
    });

    it('should handle empty schedule', () => {
      const metrics = scheduleService.calculateMetrics([]);

      expect(metrics.totalWorkDays).toBe(0);
      expect(metrics.totalEarnings).toBe(0);
      expect(metrics.totalExpenses).toBe(0);
      expect(metrics.averageBalance).toBeNaN();
    });
  });

  describe('exportSchedule', () => {
    it('should export schedule as CSV', () => {
      const csv = scheduleService.exportSchedule(mockSchedule);

      expect(csv).toContain('Day,Shifts,Earnings,Expenses,Deposit,End Balance');
      expect(csv).toContain('1,medium,67.50,50.00,0.00,117.50');
      expect(csv).toContain('2,Off,0.00,30.00,0.00,87.50');
      expect(csv).toContain('3,large,86.50,40.00,366.00,500.00');
    });

    it('should handle double shifts', () => {
      const scheduleWithDouble = [...mockSchedule];
      scheduleWithDouble[0].shifts = ['medium', 'large'];

      const csv = scheduleService.exportSchedule(scheduleWithDouble);

      expect(csv).toContain('1,medium+large,67.50,50.00,0.00,117.50');
    });

    it('should export empty schedule', () => {
      const csv = scheduleService.exportSchedule([]);

      expect(csv).toBe('Day,Shifts,Earnings,Expenses,Deposit,End Balance');
    });
  });
});
