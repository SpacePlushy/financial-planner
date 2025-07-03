import React from 'react';
import { ScheduleProvider } from './context/ScheduleContext';
import {
  ConfigurationProvider,
  useConfiguration,
} from './context/ConfigurationContext';
import { PersistenceProvider } from './context/PersistenceContext';
import { UIProvider } from './context/UIContext';
import { ProgressProvider } from './context/ProgressContext';
import { ConfigurationPanel } from './components/ConfigurationPanel/ConfigurationPanelV2';
import { ScheduleTable } from './components/ScheduleTable/ScheduleTableV2';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { Summary } from './components/Summary/SummaryV2';
import { OptimizationProgress } from './components/OptimizationProgress/OptimizationProgressV2';
import { EditModal } from './components/EditModal/EditModalV2';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { useUI } from './context/UIContext';
import { usePersistence } from './hooks/usePersistence';
import { useOptimizer } from './hooks/useOptimizer';
// import { useSchedule } from './hooks/useSchedule'; // TODO: Add for future features
import { logger } from './utils/logger';
import './App.css';

/**
 * Main application content component
 */
function AppContent() {
  const ui = useUI();
  const persistence = usePersistence();
  const optimizer = useOptimizer();
  // const schedule = useSchedule(); // TODO: Use for future features
  const { config } = useConfiguration();

  // Show loading state while restoring data
  if (persistence.isRestoring) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading saved data...</p>
      </div>
    );
  }

  return (
    <div className={`app ${ui.theme}`} data-theme={ui.theme}>
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>Financial Schedule Optimizer</h1>
          <div className="header-actions">
            {/* Persistence status */}
            <div className="persistence-status">
              {persistence.lastSaveTime && (
                <span className="last-saved">
                  Last saved: {persistence.lastSaveTime.toLocaleTimeString()}
                </span>
              )}
              {persistence.hasUnsavedChanges && (
                <span className="unsaved-indicator">●</span>
              )}
            </div>

            {/* Theme toggle */}
            <button
              className="theme-toggle"
              onClick={() => ui.toggleTheme()}
              aria-label="Toggle theme"
            >
              {ui.theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        <div className="app-container">
          {/* Configuration section */}
          <section className="configuration-section">
            <ErrorBoundary
              level="section"
              resetKeys={[]}
              onError={error =>
                logger.error('ConfigurationPanel', 'Configuration error', error)
              }
            >
              <ConfigurationPanel />
            </ErrorBoundary>
          </section>

          {/* Summary section */}
          <section className="summary-section">
            <ErrorBoundary
              level="section"
              onError={error => logger.error('Summary', 'Summary error', error)}
            >
              <Summary />
            </ErrorBoundary>
          </section>

          {/* Schedule table section */}
          <section className="schedule-section">
            <div className="section-header">
              <h2>Schedule</h2>
              <div className="view-controls">
                <button
                  className={`view-button ${ui.viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => ui.setViewMode('table')}
                >
                  Table View
                </button>
                <button
                  className={`view-button ${ui.viewMode === 'calendar' ? 'active' : ''}`}
                  onClick={() => ui.setViewMode('calendar')}
                >
                  Calendar View
                </button>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={ui.showWeekends}
                    onChange={() => ui.toggleWeekends()}
                  />
                  Show Weekends
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={ui.highlightViolations}
                    onChange={() => ui.toggleHighlightViolations()}
                  />
                  Highlight Violations
                </label>
              </div>
            </div>
            <ErrorBoundary
              level="section"
              onError={error =>
                logger.error('ScheduleTable', 'Schedule table error', error)
              }
            >
              {ui.viewMode === 'table' ? (
                <ScheduleTable />
              ) : (
                <ScheduleCalendar />
              )}
            </ErrorBoundary>
          </section>

          {/* Optimization progress */}
          {optimizer.isOptimizing && (
            <section className="progress-section">
              <ErrorBoundary
                level="section"
                onError={error =>
                  logger.error('OptimizationProgress', 'Progress error', error)
                }
              >
                <OptimizationProgress />
              </ErrorBoundary>
            </section>
          )}

          {/* Action buttons */}
          <section className="actions-section">
            <div className="action-buttons">
              {/* Save/Load actions */}
              <button
                className="action-button save"
                onClick={() => persistence.save()}
                disabled={
                  persistence.isSaving || !persistence.hasUnsavedChanges
                }
              >
                {persistence.isSaving ? 'Saving...' : 'Save'}
              </button>

              <button
                className="action-button export"
                onClick={() => persistence.exportToFile()}
                disabled={persistence.isExporting}
              >
                {persistence.isExporting ? 'Exporting...' : 'Export'}
              </button>

              <button
                className="action-button import"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = e => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      persistence.importFromFile(file);
                    }
                  };
                  input.click();
                }}
                disabled={persistence.isImporting}
              >
                {persistence.isImporting ? 'Importing...' : 'Import'}
              </button>

              {/* Optimization actions */}
              {!optimizer.isOptimizing ? (
                <button
                  className="action-button optimize primary"
                  onClick={() => optimizer.startOptimization(config)}
                  disabled={false}
                >
                  Start Optimization
                </button>
              ) : (
                <>
                  {optimizer.isPaused ? (
                    <button
                      className="action-button resume"
                      onClick={() => optimizer.resumeOptimization()}
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      className="action-button pause"
                      onClick={() => optimizer.pauseOptimization()}
                    >
                      Pause
                    </button>
                  )}
                  <button
                    className="action-button cancel"
                    onClick={() => optimizer.cancelOptimization()}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Modals */}
      {ui.activeModal === 'edit' && (
        <ErrorBoundary
          level="component"
          resetKeys={[ui.selectedDay || 0, ui.selectedField || '']}
          onError={error => {
            logger.error('EditModal', 'Edit modal error', error);
            ui.closeModal();
          }}
        >
          <EditModal />
        </ErrorBoundary>
      )}

      {/* Error display */}
      {ui.error && (
        <div className="error-toast">
          <span>{ui.error.message}</span>
          <button onClick={() => ui.clearError()}>×</button>
        </div>
      )}

      {/* Debug mode indicator */}
      {ui.debugMode && <div className="debug-indicator">Debug Mode</div>}
      
      {/* Optimization state debug */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999
      }}>
        Optimization State: {optimizer.isOptimizing ? 'RUNNING' : 'STOPPED'}
      </div>
    </div>
  );
}

/**
 * Root App component with all context providers and page-level error boundary
 */
function App() {
  return (
    <ErrorBoundary
      level="page"
      onError={(error, errorInfo) => {
        logger.error('App', 'Application error', error, { errorInfo });
        // In production, you might want to send this to an error tracking service
      }}
    >
      <UIProvider initialTheme="light" initialDebugMode={false}>
        <ScheduleProvider>
          <ConfigurationProvider>
            <ProgressProvider>
              <PersistenceProvider>
                <AppContent />
              </PersistenceProvider>
            </ProgressProvider>
          </ConfigurationProvider>
        </ScheduleProvider>
      </UIProvider>
    </ErrorBoundary>
  );
}

export default App;
