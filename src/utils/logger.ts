/**
 * Logger utility for consistent logging across the application
 */

import { DEBUG_CONSTANTS } from '../config/user-config';

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
  data?: unknown;
  stateBefore?: unknown;
  stateAfter?: unknown;
  executionTime?: number;
  error?: Error;
}

export interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  enableConsole: boolean;
  enableLocalStorage: boolean;
  maxStoredLogs: number;
}

class Logger {
  private config: LoggerConfig = {
    enabled: process.env.NODE_ENV !== 'production',
    minLevel: LogLevel.INFO,
    enableConsole: true,
    enableLocalStorage: false,
    maxStoredLogs: DEBUG_CONSTANTS.MAX_STORED_LOGS,
  };

  private logs: LogEntry[] = [];

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && level >= this.config.minLevel;
  }

  private createLogEntry(
    level: LogLevel,
    context: string,
    message: string,
    data?: unknown
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      context,
      message,
      data,
    };
  }

  private formatData(data: unknown): string {
    if (data === undefined) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  info(context: string, message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(LogLevel.INFO, context, message, data);
    this.log(entry);
  }

  error(context: string, message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry(LogLevel.ERROR, context, message);
    entry.error = error instanceof Error ? error : new Error(String(error));
    this.log(entry);
  }

  warn(context: string, message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry(LogLevel.WARN, context, message, data);
    this.log(entry);
  }

  debug(context: string, message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry(LogLevel.DEBUG, context, message, data);
    this.log(entry);
  }

  logAction(context: string, action: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(
      LogLevel.INFO,
      context,
      `Action: ${action}`,
      data
    );
    entry.action = action;
    this.log(entry);
  }

  group(label: string, fn: () => unknown): void {
    // eslint-disable-next-line no-console
    if (this.config.enableConsole && typeof console.group === 'function') {
      // eslint-disable-next-line no-console
      console.group(label);
    }
    try {
      fn();
    } finally {
      // eslint-disable-next-line no-console
      if (this.config.enableConsole && typeof console.groupEnd === 'function') {
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    }
  }

  async groupAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    // eslint-disable-next-line no-console
    if (this.config.enableConsole && typeof console.group === 'function') {
      // eslint-disable-next-line no-console
      console.group(label);
    }
    try {
      return await fn();
    } catch (error) {
      this.error('Logger', 'Error in grouped async operation', error);
      throw error;
    } finally {
      // eslint-disable-next-line no-console
      if (this.config.enableConsole && typeof console.groupEnd === 'function') {
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    }
  }

  measure<T>(label: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.debug('Performance', label, {
        duration: `${duration.toFixed(2)}ms`,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error('Performance', `${label} failed`, error);
      this.debug('Performance', label, {
        duration: `${duration.toFixed(2)}ms`,
      });
      throw error;
    }
  }

  private log(entry: LogEntry): void {
    // Add to in-memory log store
    this.logs.push(entry);
    if (this.logs.length > this.config.maxStoredLogs) {
      this.logs.shift();
    }

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Local storage
    if (this.config.enableLocalStorage) {
      this.logToLocalStorage(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelLabel = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${levelLabel}] [${entry.context}]`;

    switch (entry.level) {
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(
          prefix,
          entry.message,
          entry.error || '',
          this.formatData(entry.data)
        );
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(prefix, entry.message, this.formatData(entry.data));
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(prefix, entry.message, this.formatData(entry.data));
        break;
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.log(prefix, entry.message, this.formatData(entry.data));
        break;
    }
  }

  private logToLocalStorage(entry: LogEntry): void {
    try {
      const key = 'app_logs';
      const existingLogs = JSON.parse(localStorage.getItem(key) || '[]');
      existingLogs.push(entry);

      // Keep only recent logs
      if (existingLogs.length > this.config.maxStoredLogs) {
        existingLogs.splice(0, existingLogs.length - this.config.maxStoredLogs);
      }

      localStorage.setItem(key, JSON.stringify(existingLogs));
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  getLogs(filter?: {
    level?: LogLevel;
    context?: string;
    startTime?: Date;
    endTime?: Date;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.level !== undefined) {
        filtered = filtered.filter(log => log.level >= filter.level!);
      }
      if (filter.context) {
        filtered = filtered.filter(log =>
          log.context.toLowerCase().includes(filter.context!.toLowerCase())
        );
      }
      if (filter.startTime) {
        filtered = filtered.filter(log => log.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        filtered = filtered.filter(log => log.timestamp <= filter.endTime!);
      }
    }

    return filtered;
  }

  clearLogs(): void {
    this.logs = [];
    if (this.config.enableLocalStorage) {
      try {
        localStorage.removeItem('app_logs');
      } catch {
        // Silently fail
      }
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export singleton instance
export const logger = new Logger();
