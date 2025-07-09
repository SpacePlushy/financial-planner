import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ScheduleProvider } from './context/ScheduleContext';
import { ConfigurationProvider } from './context/ConfigurationContext';
import { PersistenceProvider } from './context/PersistenceContext';
import { UIProvider } from './context/UIContext';
import { ProgressProvider, useProgress } from './context/ProgressContext';
import { ConfigurationPanel } from './components/ConfigurationPanel/ConfigurationPanelV3';
import { ScheduleTable } from './components/ScheduleTable/ScheduleTableV2';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { Summary } from './components/Summary/SummaryV2';
import { OptimizationProgress } from './components/OptimizationProgress/OptimizationProgressV2';
import { EditModal } from './components/EditModal/EditModalV2';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { ActionBar } from './components/ActionBar/ActionBar';
import { ResizablePanel, ResizableDivider } from './components/ResizablePanel';
import { useUI } from './context/UIContext';
import { usePersistence } from './hooks/usePersistence';
import { useDualOptimizer } from './hooks/useDualOptimizer';
import { usePanelResize } from './hooks/usePanelResize';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { logger } from './utils/logger';
import './App.css';

// Import BotID client component - only import if available to avoid build errors
let BotIdClient: any;
try {
  const botIdModule = require('botid/client');
  BotIdClient = botIdModule.BotIdClient;
} catch (e) {
  // BotID client module not available
  console.warn('BotID client module not available');
}

/**
 * Main application content component with new dashboard layout
 */
function AppContent() {
  const ui = useUI();
  const persistence = usePersistence();
  const optimizer = useDualOptimizer();
  const progress = useProgress();
  const panelResize = usePanelResize();
  // const { config } = useConfiguration(); // Available if needed

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Detect mobile viewport
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      <header className="app-header" role="banner">
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
      <main className="app-main" role="main">
        <div
          className={`dashboard-grid resizable-container ${panelResize.isResizing ? 'resizing-active' : ''}`}
          ref={panelResize.containerRef}
        >
          {/* Left Panel: Configuration */}
          <ResizablePanel
            position="left"
            width={panelResize.sizes.left}
            className="panel config-panel"
          >
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
                  processingMode={optimizer.processingMode}
                  setProcessingMode={optimizer.setProcessingMode}
                  metrics={optimizer.metrics}
                  clientProgress={
                    optimizer.clientProgress
                      ? optimizer.clientProgress.progress
                      : null
                  }
                  serverProgress={
                    optimizer.serverProgress
                      ? optimizer.serverProgress.progress
                      : null
                  }
                />
              </ErrorBoundary>
            </div>

            {/* Action Bar at bottom of config panel - Desktop only */}
            {!isMobile && (
              <ActionBar
                persistence={persistence}
                onHelp={() =>
                  window.open(
                    'https://github.com/anthropics/financial-schedule-optimizer',
                    '_blank'
                  )
                }
              />
            )}
          </ResizablePanel>

          {/* Resize Divider between Left and Center */}
          <ResizableDivider
            position="left"
            onMouseDown={panelResize.handleMouseDown}
            onTouchStart={panelResize.handleTouchStart}
            isResizing={panelResize.isResizing === 'left'}
          />

          {/* Center Panel: Results & Progress */}
          <ResizablePanel
            position="center"
            width={panelResize.sizes.center}
            className="panel results-panel"
          >
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
              )}
            </div>
          </ResizablePanel>

          {/* Resize Divider between Center and Right */}
          <ResizableDivider
            position="right"
            onMouseDown={panelResize.handleMouseDown}
            onTouchStart={panelResize.handleTouchStart}
            isResizing={panelResize.isResizing === 'right'}
          />

          {/* Right Panel: Schedule */}
          <ResizablePanel
            position="right"
            width={panelResize.sizes.right}
            className="panel schedule-panel"
          >
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
          </ResizablePanel>
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

      {/* Mobile ActionBar - Fixed at bottom */}
      {isMobile && (
        <div className="mobile-action-bar">
          <ActionBar
            persistence={persistence}
            onHelp={() =>
              window.open(
                'https://github.com/anthropics/financial-schedule-optimizer',
                '_blank'
              )
            }
            compact={true}
          />
        </div>
      )}

      {/* Vercel Analytics */}
      <Analytics debug={true} />

      {/* Global Footer Action Bar */}
      <footer className="app-footer">
        <div className="footer-info">
          <span className="footer-text">
            Financial Schedule Optimizer v
            {process.env.REACT_APP_VERSION || '1.0.0'}
          </span>
          {persistence.lastSaveTime && (
            <span className="footer-text">
              Last saved: {persistence.lastSaveTime.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="footer-actions">
          <button
            className="footer-button"
            onClick={() => window.print()}
            title="Print current view"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print
          </button>
          <button
            className="footer-button"
            onClick={() =>
              window.open(
                'https://github.com/anthropics/financial-schedule-optimizer/issues',
                '_blank'
              )
            }
            title="Report an issue"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Feedback
          </button>
        </div>
      </footer>
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
      {/* Add BotID client protection for API endpoints */}
      {BotIdClient && (
        <BotIdClient
          protect={[
            {
              path: '/api/optimize',
              method: 'POST',
            },
          ]}
        />
      )}
      <UIProvider initialDebugMode={false}>
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
