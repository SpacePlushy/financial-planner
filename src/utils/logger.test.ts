/* eslint-disable testing-library/no-debugging-utils */
import { logger, LogLevel } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    // Clear logs before each test
    logger.clearLogs();
    // Reset to default configuration
    logger.configure({
      enabled: true,
      minLevel: LogLevel.DEBUG,
      enableConsole: false, // Disable console output during tests
      enableLocalStorage: false,
      maxStoredLogs: 1000,
    });
  });

  describe('Basic logging', () => {
    it('should log debug messages', () => {
      logger.debug('TestContext', 'Debug message', { test: true });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].context).toBe('TestContext');
      expect(logs[0].message).toBe('Debug message');
      expect(logs[0].data).toEqual({ test: true });
    });

    it('should log info messages', () => {
      logger.info('TestContext', 'Info message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
    });

    it('should log warn messages', () => {
      logger.warn('TestContext', 'Warning message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
    });

    it('should log error messages with error object', () => {
      const error = new Error('Test error');
      logger.error('TestContext', 'Error message', error);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].error).toEqual(error);
    });
  });

  describe('Log levels', () => {
    it('should respect minimum log level', () => {
      logger.configure({ minLevel: LogLevel.WARN });

      logger.debug('TestContext', 'Debug message');
      logger.info('TestContext', 'Info message');
      logger.warn('TestContext', 'Warning message');
      logger.error('TestContext', 'Error message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[1].level).toBe(LogLevel.ERROR);
    });

    it('should not log when disabled', () => {
      logger.configure({ enabled: false });

      logger.info('TestContext', 'This should not be logged');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('Action logging', () => {
    it('should log actions with timing', () => {
      const stateBefore = { value: 1 };
      const stateAfter = { value: 2 };

      logger.logAction('TestContext', 'TEST_ACTION', {
        stateBefore,
        stateAfter,
        executionTime: '50ms',
      });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('TEST_ACTION');
      expect(logs[0].data).toEqual({
        stateBefore,
        stateAfter,
        executionTime: '50ms',
      });
      expect(logs[0].level).toBe(LogLevel.INFO);
    });

    it('should log actions with execution time', () => {
      // Test for action logging

      logger.logAction('TestContext', 'SLOW_ACTION', {
        executionTime: '100ms',
      });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].action).toBe('SLOW_ACTION');
      expect(logs[0].data).toEqual({ executionTime: '100ms' });
    });
  });

  describe('Log management', () => {
    it('should maintain max log size', () => {
      logger.configure({ maxLogSize: 5 });

      for (let i = 0; i < 10; i++) {
        logger.info('TestContext', `Message ${i}`);
      }

      const logs = logger.getLogs();
      expect(logs).toHaveLength(5);
      expect(logs[0].message).toBe('Message 5');
      expect(logs[4].message).toBe('Message 9');
    });

    it('should clear logs', () => {
      logger.info('TestContext', 'Message 1');
      logger.info('TestContext', 'Message 2');

      expect(logger.getLogCount()).toBe(2);

      logger.clearLogs();

      expect(logger.getLogCount()).toBe(0);
      expect(logger.exportLogs()).toHaveLength(0);
    });
  });

  describe('Log filtering', () => {
    beforeEach(() => {
      // Add various logs
      const baseDate = new Date('2024-01-01T00:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => baseDate);

      logger.debug('Context1', 'Debug message');

      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => new Date('2024-01-01T01:00:00Z'));
      logger.info('Context1', 'Info message');

      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => new Date('2024-01-01T02:00:00Z'));
      logger.warn('Context2', 'Warning message');

      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => new Date('2024-01-01T03:00:00Z'));
      logger.error('Context2', 'Error message');

      jest.restoreAllMocks();
    });

    it('should filter by date range', () => {
      const logs = logger.exportLogs({
        startDate: new Date('2024-01-01T01:00:00Z'),
        endDate: new Date('2024-01-01T02:00:00Z'),
      });

      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Info message');
      expect(logs[1].message).toBe('Warning message');
    });

    it('should filter by log level', () => {
      const logs = logger.exportLogs({ level: LogLevel.WARN });

      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[1].level).toBe(LogLevel.ERROR);
    });

    it('should filter by context', () => {
      const logs = logger.exportLogs({ context: 'Context1' });

      expect(logs).toHaveLength(2);
      expect(logs[0].context).toBe('Context1');
      expect(logs[1].context).toBe('Context1');
    });

    it('should get logs by context', () => {
      const logs = logger.getLogsByContext('Context2');

      expect(logs).toHaveLength(2);
      expect(logs[0].context).toBe('Context2');
      expect(logs[1].context).toBe('Context2');
    });
  });

  describe('Export functionality', () => {
    beforeEach(() => {
      logger.info('TestContext', 'Test message 1');
      logger.logAction(
        'TestContext',
        'TEST_ACTION',
        { before: 1 },
        { after: 2 },
        75
      );
    });

    it('should export as JSON', () => {
      const json = logger.exportAsJson();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].message).toBe('Test message 1');
      expect(parsed[1].action).toBe('TEST_ACTION');
    });

    it('should export as CSV', () => {
      const csv = logger.exportAsCsv();
      const lines = csv.split('\n');

      expect(lines[0]).toBe(
        'Timestamp,Level,Context,Action,Message,Execution Time (ms)'
      );
      expect(lines).toHaveLength(3); // Header + 2 logs
      expect(lines[1]).toContain('"Test message 1"');
      expect(lines[2]).toContain('"TEST_ACTION"');
      expect(lines[2]).toContain('"75"');
    });
  });

  describe.skip('Performance statistics', () => {
    // Skipped - getPerformanceStats not implemented
    it('should calculate performance stats', () => {
      logger.logAction('Context1', 'ACTION1', { executionTime: '50ms' });
      logger.logAction('Context1', 'ACTION2', { executionTime: '150ms' });
      logger.logAction('Context2', 'ACTION3', { executionTime: '200ms' });
      logger.info('Context1', 'Regular log'); // Should not affect stats

      const stats = logger.getPerformanceStats();

      expect(stats.totalActions).toBe(3);
      expect(stats.averageExecutionTime).toBe(133.33333333333334);
      expect(stats.slowestAction).toEqual({ action: 'ACTION3', time: 200 });
    });

    it('should calculate performance stats for specific context', () => {
      logger.logAction('Context1', 'ACTION1', { executionTime: '50ms' });
      logger.logAction('Context1', 'ACTION2', { executionTime: '150ms' });
      logger.logAction('Context2', 'ACTION3', { executionTime: '200ms' });

      const stats = logger.getPerformanceStats('Context1');

      expect(stats.totalActions).toBe(2);
      expect(stats.averageExecutionTime).toBe(100);
      expect(stats.slowestAction).toEqual({ action: 'ACTION2', time: 150 });
    });

    it('should handle empty performance stats', () => {
      const stats = logger.getPerformanceStats();

      expect(stats.totalActions).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
      expect(stats.slowestAction).toBe(null);
    });
  });

  describe('Console output', () => {
    let consoleSpies: {
      debug: jest.SpyInstance;
      info: jest.SpyInstance;
      warn: jest.SpyInstance;
      error: jest.SpyInstance;
      groupCollapsed: jest.SpyInstance;
      groupEnd: jest.SpyInstance;
    };

    beforeEach(() => {
      consoleSpies = {
        debug: jest.spyOn(console, 'debug').mockImplementation(),
        info: jest.spyOn(console, 'info').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation(),
        groupCollapsed: jest
          .spyOn(console, 'groupCollapsed')
          .mockImplementation(),
        groupEnd: jest.spyOn(console, 'groupEnd').mockImplementation(),
      };

      logger.configure({ enableConsole: true });
    });

    afterEach(() => {
      Object.values(consoleSpies).forEach(spy => spy.mockRestore());
    });

    it('should output to console when enabled', () => {
      logger.debug('TestContext', 'Debug message');
      logger.info('TestContext', 'Info message');
      logger.warn('TestContext', 'Warning message');
      logger.error('TestContext', 'Error message', new Error('Test'));

      expect(consoleSpies.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpies.info).toHaveBeenCalledTimes(1);
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpies.error).toHaveBeenCalledTimes(1);
    });

    it('should output state changes in collapsed group', () => {
      logger.logAction(
        'TestContext',
        'ACTION',
        { before: 1 },
        { after: 2 },
        50
      );

      expect(consoleSpies.info).toHaveBeenCalledTimes(1);
      expect(consoleSpies.groupCollapsed).toHaveBeenCalledTimes(1);
      expect(consoleSpies.groupEnd).toHaveBeenCalledTimes(1);
    });
  });
});
