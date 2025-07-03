/**
 * Logger utility for the Financial Schedule Optimizer
 * Provides configurable logging with different levels, context awareness, and performance timing
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  action?: string;
  message: string;
  data?: any;
  stateBefore?: any;
  stateAfter?: any;
  executionTime?: number;
  error?: Error;
}

export interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  enableConsole: boolean;
  maxLogSize: number;
  performanceThreshold: number; // ms
}

class Logger {
  private logs: LogEntry[] = [];
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      enabled:
        process.env.NODE_ENV === 'test'
          ? false
          : process.env.NODE_ENV !== 'production' ||
            process.env.REACT_APP_ENABLE_LOGGING === 'true',
      minLevel: LogLevel.INFO,
      enableConsole:
        process.env.NODE_ENV === 'test'
          ? false
          : process.env.NODE_ENV !== 'production',
      maxLogSize: 1000,
      performanceThreshold: 100,
      ...config,
    };
  }

  /**
   * Updates logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Logs a debug message
   */
  debug(context: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, context, message, data);
  }

  /**
   * Logs an info message
   */
  info(context: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, context, message, data);
  }

  /**
   * Logs a warning message
   */
  warn(context: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, context, message, data);
  }

  /**
   * Logs an error message
   */
  error(context: string, message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, context, message, { ...data, error });
  }

  /**
   * Logs an action with before/after state and timing
   */
  logAction(
    context: string,
    action: string,
    stateBefore: any,
    stateAfter: any,
    executionTime: number
  ): void {
    if (!this.config.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level:
        executionTime > this.config.performanceThreshold
          ? LogLevel.WARN
          : LogLevel.INFO,
      context,
      action,
      message: `Action: ${action} (${executionTime}ms)`,
      stateBefore,
      stateAfter,
      executionTime,
    };

    this.addLog(entry);

    if (executionTime > this.config.performanceThreshold) {
      this.warn(
        context,
        `Slow action detected: ${action} took ${executionTime}ms`,
        { action, executionTime }
      );
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    context: string,
    message: string,
    data?: any
  ): void {
    if (!this.config.enabled || level < this.config.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      context,
      message,
      data,
    };

    this.addLog(entry);
  }

  /**
   * Adds a log entry and manages log size
   */
  private addLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Maintain max log size
    if (this.logs.length > this.config.maxLogSize) {
      this.logs = this.logs.slice(-this.config.maxLogSize);
    }

    // Console output
    if (this.config.enableConsole) {
      this.consoleLog(entry);
    }
  }

  /**
   * Outputs log to console
   */
  private consoleLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.context}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(
          prefix,
          entry.message,
          entry.data || '',
          entry.error || ''
        );
        break;
    }

    if (entry.stateBefore && entry.stateAfter) {
      console.groupCollapsed(`${prefix} State Change`);
      console.log('Before:', entry.stateBefore);
      console.log('After:', entry.stateAfter);
      console.groupEnd();
    }
  }

  /**
   * Exports logs for debugging
   */
  exportLogs(options?: {
    startDate?: Date;
    endDate?: Date;
    level?: LogLevel;
    context?: string;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (options?.startDate) {
      filtered = filtered.filter(log => log.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(log => log.timestamp <= options.endDate!);
    }

    if (options?.level !== undefined) {
      filtered = filtered.filter(log => log.level >= options.level!);
    }

    if (options?.context) {
      filtered = filtered.filter(log => log.context === options.context);
    }

    return filtered;
  }

  /**
   * Exports logs as JSON string
   */
  exportAsJson(options?: Parameters<typeof this.exportLogs>[0]): string {
    const logs = this.exportLogs(options);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Exports logs as CSV
   */
  exportAsCsv(options?: Parameters<typeof this.exportLogs>[0]): string {
    const logs = this.exportLogs(options);
    const headers = [
      'Timestamp',
      'Level',
      'Context',
      'Action',
      'Message',
      'Execution Time (ms)',
    ];
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      LogLevel[log.level],
      log.context,
      log.action || '',
      log.message,
      log.executionTime?.toString() || '',
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }

  /**
   * Clears all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Gets current log count
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * Gets logs by context
   */
  getLogsByContext(context: string): LogEntry[] {
    return this.logs.filter(log => log.context === context);
  }

  /**
   * Gets performance statistics
   */
  getPerformanceStats(context?: string): {
    slowestAction: { action: string; time: number } | null;
    averageExecutionTime: number;
    totalActions: number;
  } {
    const actionLogs = this.logs.filter(
      log =>
        log.executionTime !== undefined && (!context || log.context === context)
    );

    if (actionLogs.length === 0) {
      return {
        slowestAction: null,
        averageExecutionTime: 0,
        totalActions: 0,
      };
    }

    const slowest = actionLogs.reduce((max, log) =>
      log.executionTime! > (max?.executionTime || 0) ? log : max
    );

    const totalTime = actionLogs.reduce(
      (sum, log) => sum + log.executionTime!,
      0
    );

    return {
      slowestAction: slowest
        ? { action: slowest.action || 'unknown', time: slowest.executionTime! }
        : null,
      averageExecutionTime: totalTime / actionLogs.length,
      totalActions: actionLogs.length,
    };
  }
}

// Singleton instance
export const logger = new Logger();

// Re-export for convenience
export default logger;
