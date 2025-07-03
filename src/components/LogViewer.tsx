import React, { useState, useCallback, useMemo } from 'react';
import { logger, LogLevel, LogEntry } from '../utils/logger';
import styles from './LogViewer.module.css';

interface LogViewerProps {
  className?: string;
}

/**
 * LogViewer component for debugging
 * Only renders in development mode
 */
export const LogViewer: React.FC<LogViewerProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel>(LogLevel.DEBUG);
  const [filterContext, setFilterContext] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Only render in development
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.REACT_APP_ENABLE_LOGGING !== 'true'
  ) {
    return null;
  }

  const refreshLogs = useCallback(() => {
    const filtered = logger.exportLogs({
      level: filterLevel,
      context: filterContext || undefined,
    });
    setLogs(filtered);
  }, [filterLevel, filterContext]);

  React.useEffect(() => {
    if (isOpen) {
      refreshLogs();
    }
  }, [isOpen, refreshLogs]);

  React.useEffect(() => {
    if (!autoRefresh || !isOpen) return;

    const interval = setInterval(refreshLogs, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, isOpen, refreshLogs]);

  const performanceStats = useMemo(() => {
    return logger.getPerformanceStats(filterContext || undefined);
  }, [logs, filterContext]);

  const handleExportJson = () => {
    const json = logger.exportAsJson({
      level: filterLevel,
      context: filterContext || undefined,
    });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const csv = logger.exportAsCsv({
      level: filterLevel,
      context: filterContext || undefined,
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelClasses = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return { entry: styles.logDebug, badge: styles.levelDebug };
      case LogLevel.INFO:
        return { entry: styles.logInfo, badge: styles.levelInfo };
      case LogLevel.WARN:
        return { entry: styles.logWarn, badge: styles.levelWarn };
      case LogLevel.ERROR:
        return { entry: styles.logError, badge: styles.levelError };
      default:
        return { entry: styles.logDebug, badge: styles.levelDebug };
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`${styles.logViewerButton} ${className || ''}`}
        title="Open Log Viewer"
      >
        📋 Logs ({logger.getLogCount()})
      </button>
    );
  }

  return (
    <div className={`${styles.backdrop} ${className || ''}`}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Log Viewer</h2>
          <button
            onClick={() => setIsOpen(false)}
            className={styles.closeButton}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label htmlFor="filter-level" className={styles.controlLabel}>
              Level:
            </label>
            <select
              id="filter-level"
              value={filterLevel}
              onChange={e => setFilterLevel(Number(e.target.value))}
              className={styles.controlSelect}
            >
              <option value={LogLevel.DEBUG}>Debug</option>
              <option value={LogLevel.INFO}>Info</option>
              <option value={LogLevel.WARN}>Warn</option>
              <option value={LogLevel.ERROR}>Error</option>
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="filter-context" className={styles.controlLabel}>
              Context:
            </label>
            <input
              id="filter-context"
              type="text"
              value={filterContext}
              onChange={e => setFilterContext(e.target.value)}
              placeholder="All contexts"
              className={styles.controlInput}
            />
          </div>

          <label className={styles.controlGroup}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            <span className={styles.controlLabel}>Auto-refresh</span>
          </label>

          <button
            onClick={refreshLogs}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            Refresh
          </button>

          <button
            onClick={() => logger.clear()}
            className={`${styles.button} ${styles.buttonDanger}`}
          >
            Clear
          </button>

          <div className={styles.controlGroup}>
            <button
              onClick={handleExportJson}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Export JSON
            </button>
            <button
              onClick={handleExportCsv}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Performance Stats */}
        {performanceStats.totalActions > 0 && (
          <div className={styles.performanceStats}>
            <h3 className={styles.performanceTitle}>Performance Statistics</h3>
            <div className={styles.performanceGrid}>
              <div>
                <span className={styles.logContext}>Total Actions:</span>{' '}
                <span className={styles.performanceValue}>
                  {performanceStats.totalActions}
                </span>
              </div>
              <div>
                <span className={styles.logContext}>Average Time:</span>{' '}
                <span className={styles.performanceValue}>
                  {performanceStats.averageExecutionTime.toFixed(2)}ms
                </span>
              </div>
              {performanceStats.slowestAction && (
                <div>
                  <span className={styles.logContext}>Slowest:</span>{' '}
                  <span className={styles.performanceValue}>
                    {performanceStats.slowestAction.action} (
                    {performanceStats.slowestAction.time}ms)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className={styles.logList}>
          {logs.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📋</div>
              <div className={styles.emptyStateText}>No logs to display</div>
            </div>
          ) : (
            <div className={styles.logListContent}>
              {logs.map((log, index) => {
                const levelClasses = getLevelClasses(log.level);
                return (
                  <div
                    key={index}
                    className={`${styles.logEntry} ${levelClasses.entry}`}
                  >
                    <div className={styles.logEntryHeader}>
                      <div className={styles.logEntryBody}>
                        <div className={styles.logMetaRow}>
                          <span className={`${styles.levelBadge} ${levelClasses.badge}`}>
                            {LogLevel[log.level]}
                          </span>
                          <span className={styles.logContext}>
                            {log.context}
                          </span>
                          {log.action && (
                            <span className={styles.logAction}>
                              {log.action}
                            </span>
                          )}
                          {log.executionTime !== undefined && (
                            <span className={styles.logTimestamp}>
                              ({log.executionTime}ms)
                            </span>
                          )}
                        </div>
                        <div className={styles.logMessage}>{log.message}</div>
                        {log.data && (
                          <details className={styles.logDetails}>
                            <summary className={styles.logDetailsSummary}>
                              Data
                            </summary>
                            <pre className={styles.logDataPre}>
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                        {log.stateBefore && log.stateAfter && (
                          <details className={styles.logDetails}>
                            <summary className={styles.logDetailsSummary}>
                              State Change
                            </summary>
                            <div className={styles.stateChangeGrid}>
                              <div>
                                <div className={styles.stateChangeLabel}>
                                  Before:
                                </div>
                                <pre className={styles.logDataPre}>
                                  {JSON.stringify(log.stateBefore, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <div className={styles.stateChangeLabel}>
                                  After:
                                </div>
                                <pre className={styles.logDataPre}>
                                  {JSON.stringify(log.stateAfter, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                      <span className={`${styles.logTimestamp} ${styles.timestampRight}`}>
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          Showing {logs.length} of {logger.getLogCount()} total logs
        </div>
      </div>
    </div>
  );
};
