import React from 'react';
import {
  ProcessingMode,
  ProcessingMetrics,
} from '../../hooks/useDualOptimizer';
import './ProcessingModeSelector.css';

interface ProcessingModeSelectorProps {
  mode: ProcessingMode;
  onModeChange: (mode: ProcessingMode) => void;
  metrics: ProcessingMetrics;
  isOptimizing: boolean;
  clientProgress: number | null;
  serverProgress: number | null;
}

export const ProcessingModeSelector: React.FC<ProcessingModeSelectorProps> = ({
  mode,
  onModeChange,
  metrics,
  isOptimizing,
  clientProgress,
  serverProgress,
}) => {
  const formatTime = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getSpeedComparison = () => {
    if (!metrics.clientTime || !metrics.serverTime) return null;
    const ratio = metrics.clientTime / metrics.serverTime;
    if (ratio > 1) {
      return `Server is ${ratio.toFixed(1)}x faster`;
    } else {
      return `Client is ${(1 / ratio).toFixed(1)}x faster`;
    }
  };

  return (
    <div className="processing-mode-selector">
      <div className="mode-selector-header">
        <h3>Processing Mode</h3>
        <div className="mode-buttons">
          <button
            className={`mode-button ${mode === 'client' ? 'active' : ''}`}
            onClick={() => onModeChange('client')}
            disabled={isOptimizing}
          >
            <span className="mode-icon">💻</span>
            Client (Browser)
          </button>
          <button
            className={`mode-button ${mode === 'server' ? 'active' : ''}`}
            onClick={() => onModeChange('server')}
            disabled={isOptimizing}
          >
            <span className="mode-icon">☁️</span>
            Server (Vercel)
          </button>
          <button
            className={`mode-button ${mode === 'both' ? 'active' : ''}`}
            onClick={() => onModeChange('both')}
            disabled={isOptimizing}
          >
            <span className="mode-icon">⚡</span>
            Compare Both
          </button>
        </div>
      </div>

      {((isOptimizing && (metrics.clientStarted || metrics.serverStarted)) ||
        (metrics.clientCompleted && metrics.clientTime) ||
        (metrics.serverCompleted && metrics.serverTime)) && (
        <div className="performance-metrics">
          <h4>Performance Metrics</h4>

          <div className="metrics-grid">
            <div className="metric-card client">
              <div className="metric-header">
                <span className="metric-icon">💻</span>
                <span>Client (Browser)</span>
              </div>
              <div className="metric-content">
                <div className="metric-time">
                  {formatTime(metrics.clientTime)}
                </div>
                {isOptimizing &&
                  mode !== 'server' &&
                  clientProgress !== null && (
                    <div className="metric-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${clientProgress}%` }}
                        />
                      </div>
                      <span className="progress-text">{clientProgress}%</span>
                    </div>
                  )}
                {metrics.clientStarted &&
                  !metrics.clientCompleted &&
                  isOptimizing && (
                    <div className="metric-status">Running...</div>
                  )}
                {metrics.clientCompleted && (
                  <div className="metric-status complete">Complete</div>
                )}
              </div>
            </div>

            <div className="metric-card server">
              <div className="metric-header">
                <span className="metric-icon">☁️</span>
                <span>Server (Vercel)</span>
              </div>
              <div className="metric-content">
                <div className="metric-time">
                  {formatTime(metrics.serverTime)}
                </div>
                {isOptimizing &&
                  mode !== 'client' &&
                  serverProgress !== null && (
                    <div className="metric-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${serverProgress}%` }}
                        />
                      </div>
                      <span className="progress-text">{serverProgress}%</span>
                    </div>
                  )}
                {metrics.serverStarted &&
                  !metrics.serverCompleted &&
                  isOptimizing && (
                    <div className="metric-status">Running...</div>
                  )}
                {metrics.serverCompleted && (
                  <div className="metric-status complete">
                    Complete
                    {metrics.serverRegion && (
                      <span className="server-region">
                        {' '}
                        ({metrics.serverRegion})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {mode === 'both' && metrics.clientTime && metrics.serverTime && (
            <div className="speed-comparison">{getSpeedComparison()}</div>
          )}
        </div>
      )}

      {!isOptimizing &&
        !metrics.clientCompleted &&
        !metrics.serverCompleted && (
          <div className="mode-description">
            {mode === 'client' && (
              <p>
                Processing on your device using Web Workers. Works offline, no
                data sent to server.
              </p>
            )}
            {mode === 'server' && (
              <p>
                Processing on Vercel's edge servers. Faster for complex
                schedules, requires internet.
              </p>
            )}
            {mode === 'both' && (
              <p>
                Run optimization on both client and server to compare
                performance.
              </p>
            )}
          </div>
        )}
    </div>
  );
};
