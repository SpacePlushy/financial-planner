import React, { useState, useCallback } from 'react';
import { logger, LogLevel } from '../utils/logger';
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
  const [logs, setLogs] = useState<string>('[]');
  const [filterLevel, setFilterLevel] = useState<LogLevel>(LogLevel.DEBUG);
  const [filterContext, setFilterContext] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refreshLogs = useCallback(() => {
    const filtered = logger.getLogs({
      level: filterLevel,
      context: filterContext || undefined,
    });
    setLogs(JSON.stringify(filtered, null, 2));
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

  const handleExport = () => {
    const json = logger.exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    logger.clearLogs();
    refreshLogs();
  };

  // Only render in development
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.REACT_APP_ENABLE_LOGGING !== 'true'
  ) {
    return null;
  }

  return (
    <div className={`${styles.logViewer} ${className || ''}`}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close log viewer' : 'Open log viewer'}
      >
        {isOpen ? '🔽' : '🔼'} Logs
      </button>

      {isOpen && (
        <div className={styles.logPanel}>
          <div className={styles.header}>
            <h3>Application Logs</h3>
            <div className={styles.controls}>
              <label>
                Level:
                <select
                  value={filterLevel}
                  onChange={e => setFilterLevel(Number(e.target.value))}
                >
                  <option value={LogLevel.DEBUG}>Debug</option>
                  <option value={LogLevel.INFO}>Info</option>
                  <option value={LogLevel.WARN}>Warn</option>
                  <option value={LogLevel.ERROR}>Error</option>
                </select>
              </label>

              <label>
                Context:
                <input
                  type="text"
                  value={filterContext}
                  onChange={e => setFilterContext(e.target.value)}
                  placeholder="Filter by context..."
                />
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>

              <button onClick={refreshLogs}>Refresh</button>
              <button onClick={handleClear}>Clear</button>
              <button onClick={handleExport}>Export</button>
            </div>
          </div>

          <div className={styles.logContent}>
            <pre>{logs}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
