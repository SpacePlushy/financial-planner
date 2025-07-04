import React from 'react';
import styles from './ActionBar.module.css';

interface ActionBarProps {
  persistence: {
    save: () => void;
    exportToFile: () => void;
    importFromFile: (file: File) => void;
    reset?: () => void;
    isSaving: boolean;
    isExporting: boolean;
    isImporting: boolean;
    hasUnsavedChanges: boolean;
  };
  onPrint?: () => void;
  onHelp?: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  persistence,
  onPrint,
  onHelp,
}) => {
  const handleImport = () => {
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
  };

  return (
    <div className={styles.actionBar}>
      <div className={styles.actionGroup}>
        <button
          className={`${styles.actionButton} ${styles.save}`}
          onClick={persistence.save}
          disabled={persistence.isSaving || !persistence.hasUnsavedChanges}
          title="Save configuration (Ctrl+S)"
          aria-label="Save configuration"
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
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"
            />
          </svg>
          <span className={styles.buttonText}>
            {persistence.isSaving ? 'Saving...' : 'Save'}
          </span>
        </button>

        <button
          className={`${styles.actionButton} ${styles.export}`}
          onClick={persistence.exportToFile}
          disabled={persistence.isExporting}
          title="Export configuration"
          aria-label="Export configuration"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span className={styles.buttonText}>Export</span>
        </button>

        <button
          className={`${styles.actionButton} ${styles.import}`}
          onClick={handleImport}
          disabled={persistence.isImporting}
          title="Import configuration"
          aria-label="Import configuration"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"
            />
          </svg>
          <span className={styles.buttonText}>Import</span>
        </button>
      </div>

      <div className={styles.actionGroup}>
        {onPrint && (
          <button
            className={`${styles.actionButton} ${styles.secondary}`}
            onClick={onPrint}
            title="Print schedule"
            aria-label="Print schedule"
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
          </button>
        )}

        {persistence.reset && (
          <button
            className={`${styles.actionButton} ${styles.danger}`}
            onClick={persistence.reset}
            title="Reset all settings"
            aria-label="Reset all settings"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}

        {onHelp && (
          <button
            className={`${styles.actionButton} ${styles.help}`}
            onClick={onHelp}
            title="Help"
            aria-label="Help"
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
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionBar;
