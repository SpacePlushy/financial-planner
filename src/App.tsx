import React from 'react';
import { ScheduleProvider } from './context/ScheduleContext';
import {
  ConfigurationProvider,
  useConfiguration,
} from './context/ConfigurationContext';
import { PersistenceProvider } from './context/PersistenceContext';
import { UIProvider } from './context/UIContext';
import { ProgressProvider, useProgress } from './context/ProgressContext';
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
import { logger } from './utils/logger';
import './App.css';

/**
 * Main application content component with new dashboard layout
 */
function AppContent() {
  const ui = useUI();
  const persistence = usePersistence();
  const optimizer = useOptimizer();
  const progress = useProgress();
  // const { config } = useConfiguration(); // Available if needed

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
    <div className={`app ${ui.theme}`} data-theme={ui.theme} data-testid="app">
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
                <span className="unsaved-indicator" title="Unsaved changes">
                  ●
                </span>
              )}
            </div>

            {/* Theme toggle */}
            <button
              className="theme-toggle"
              onClick={() => ui.toggleTheme()}
              aria-label="Toggle theme"
              title={`Switch to ${ui.theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {ui.theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <main className="app-main">
        <div className="dashboard-grid">
          {/* Left Panel: Configuration */}
          <div className="panel config-panel">
            <div className="panel-header">
              <h2 className="panel-title">Configuration</h2>
            </div>
            <div className="panel-content">
              <ErrorBoundary
                level="section"
                resetKeys={[]}
                onError={error =>
                  logger.error(
                    'ConfigurationPanel',
                    'Configuration error',
                    error
                  )
                }
              >
                <ConfigurationPanel
                  startOptimization={optimizer.startOptimization}
                  isOptimizing={optimizer.isOptimizing}
                />
              </ErrorBoundary>

              {/* Action buttons at bottom of config panel */}
              <div className="action-bar">
                <button
                  className="action-button save"
                  onClick={() => persistence.save()}
                  disabled={
                    persistence.isSaving || !persistence.hasUnsavedChanges
                  }
                  title="Save current configuration"
                >
                  {persistence.isSaving ? '...' : 'Save'}
                </button>

                <button
                  className="action-button export"
                  onClick={() => persistence.exportToFile()}
                  disabled={persistence.isExporting}
                  title="Export to JSON file"
                >
                  Export
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
                  title="Import from JSON file"
                >
                  Import
                </button>
              </div>
            </div>
          </div>

          {/* Center Panel: Results & Progress */}
          <div className="panel results-panel">
            <div className="panel-header">
              <h2 className="panel-title">Results & Analysis</h2>
            </div>
            <div className="panel-content">
              <ErrorBoundary
                level="section"
                onError={error =>
                  logger.error('Summary', 'Summary error', error)
                }
              >
                <Summary />
              </ErrorBoundary>

              {/* Optimization progress */}
              {(optimizer.isOptimizing || progress.lastResult) && (
                <div className="progress-section fade-in">
                  <ErrorBoundary
                    level="section"
                    onError={error =>
                      logger.error(
                        'OptimizationProgress',
                        'Progress error',
                        error
                      )
                    }
                  >
                    <OptimizationProgress />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Schedule */}
          <div className="panel schedule-panel">
            <div className="schedule-controls">
              <div className="view-toggle">
                <button
                  className={`view-button ${ui.viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => ui.setViewMode('table')}
                >
                  Table
                </button>
                <button
                  className={`view-button ${ui.viewMode === 'calendar' ? 'active' : ''}`}
                  onClick={() => ui.setViewMode('calendar')}
                >
                  Calendar
                </button>
              </div>

              <div className="schedule-actions">
                <label className="checkbox-label text-small">
                  <input
                    type="checkbox"
                    checked={ui.showWeekends}
                    onChange={() => ui.toggleWeekends()}
                  />
                  Weekends
                </label>
                <label className="checkbox-label text-small">
                  <input
                    type="checkbox"
                    checked={ui.highlightViolations}
                    onChange={() => ui.toggleHighlightViolations()}
                  />
                  Violations
                </label>
              </div>
            </div>

            <div className="schedule-table-container">
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
            </div>
          </div>
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
        logger.error('App', 'Application error', { error, errorInfo });
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
