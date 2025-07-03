import React, { useState, useCallback, useMemo } from 'react';
import { logger, LogLevel, LogEntry } from '../utils/logger';

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

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG:
        return '#6B7280';
      case LogLevel.INFO:
        return '#3B82F6';
      case LogLevel.WARN:
        return '#F59E0B';
      case LogLevel.ERROR:
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors ${className}`}
        title="Open Log Viewer"
      >
        📋 Logs ({logger.getLogCount()})
      </button>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${className}`}>
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-4xl bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Log Viewer</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-300 hover:text-white"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="bg-gray-100 p-4 border-b flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-level" className="text-sm font-medium">
              Level:
            </label>
            <select
              id="filter-level"
              value={filterLevel}
              onChange={e => setFilterLevel(Number(e.target.value))}
              className="px-2 py-1 border rounded"
            >
              <option value={LogLevel.DEBUG}>Debug</option>
              <option value={LogLevel.INFO}>Info</option>
              <option value={LogLevel.WARN}>Warn</option>
              <option value={LogLevel.ERROR}>Error</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-context" className="text-sm font-medium">
              Context:
            </label>
            <input
              id="filter-context"
              type="text"
              value={filterContext}
              onChange={e => setFilterContext(e.target.value)}
              placeholder="All contexts"
              className="px-2 py-1 border rounded"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            <span className="text-sm">Auto-refresh</span>
          </label>

          <button
            onClick={refreshLogs}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>

          <button
            onClick={() => logger.clear()}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>

          <div className="ml-auto flex gap-2">
            <button
              onClick={handleExportJson}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Performance Stats */}
        {performanceStats.totalActions > 0 && (
          <div className="bg-yellow-50 p-4 border-b">
            <h3 className="font-medium mb-2">Performance Statistics</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Actions:</span>{' '}
                <span className="font-medium">
                  {performanceStats.totalActions}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Average Time:</span>{' '}
                <span className="font-medium">
                  {performanceStats.averageExecutionTime.toFixed(2)}ms
                </span>
              </div>
              {performanceStats.slowestAction && (
                <div>
                  <span className="text-gray-600">Slowest:</span>{' '}
                  <span className="font-medium">
                    {performanceStats.slowestAction.action} (
                    {performanceStats.slowestAction.time}ms)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No logs to display
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="border rounded p-3 hover:bg-gray-50"
                  style={{
                    borderLeftColor: getLevelColor(log.level),
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: getLevelColor(log.level) + '20',
                            color: getLevelColor(log.level),
                          }}
                        >
                          {LogLevel[log.level]}
                        </span>
                        <span className="text-xs text-gray-600">
                          {log.context}
                        </span>
                        {log.action && (
                          <span className="text-xs font-medium text-purple-600">
                            {log.action}
                          </span>
                        )}
                        {log.executionTime !== undefined && (
                          <span className="text-xs text-gray-500">
                            ({log.executionTime}ms)
                          </span>
                        )}
                      </div>
                      <div className="text-sm">{log.message}</div>
                      {log.data && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            Data
                          </summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.stateBefore && log.stateAfter && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            State Change
                          </summary>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                              <div className="text-xs font-medium text-gray-600">
                                Before:
                              </div>
                              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.stateBefore, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-600">
                                After:
                              </div>
                              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.stateAfter, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 ml-2">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-2 text-center text-xs text-gray-600">
          Showing {logs.length} of {logger.getLogCount()} total logs
        </div>
      </div>
    </div>
  );
};
