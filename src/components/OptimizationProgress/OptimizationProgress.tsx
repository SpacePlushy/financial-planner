import React, { useMemo, useEffect, useState } from 'react';
import { OptimizationProgress as OptimizationProgressData } from '../../types';
import styles from './OptimizationProgress.module.css';

export interface OptimizationProgressProps {
  /**
   * Current optimization progress data
   */
  progress: OptimizationProgressData | null;

  /**
   * Whether optimization is currently running
   */
  isOptimizing: boolean;

  /**
   * Callback to cancel the optimization
   */
  onCancel: () => void;

  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * OptimizationProgress component displays real-time optimization progress
 * with animated transitions and detailed metrics.
 */
export const OptimizationProgress: React.FC<OptimizationProgressProps> = ({
  progress,
  isOptimizing,
  onCancel,
  className = '',
}) => {
  // Track animation states
  const [isProgressChanging, setIsProgressChanging] = useState(false);
  const [isWorkDaysChanging, setIsWorkDaysChanging] = useState(false);
  const [isFitnessChanging, setIsFitnessChanging] = useState(false);
  const [isViolationsChanging, setIsViolationsChanging] = useState(false);

  // Track previous values for animation
  const [prevProgress, setPrevProgress] = useState(0);
  const [prevWorkDays, setPrevWorkDays] = useState(0);
  const [prevBestFitness, setPrevBestFitness] = useState(0);
  const [prevViolations, setPrevViolations] = useState(0);

  // Update previous values and trigger animations when progress changes
  useEffect(() => {
    if (progress) {
      // Check what changed
      if (progress.progress !== prevProgress) {
        setIsProgressChanging(true);
        setTimeout(() => setIsProgressChanging(false), 500);
      }
      if (progress.workDays !== prevWorkDays) {
        setIsWorkDaysChanging(true);
        setTimeout(() => setIsWorkDaysChanging(false), 500);
      }
      if (progress.bestFitness !== prevBestFitness) {
        setIsFitnessChanging(true);
        setTimeout(() => setIsFitnessChanging(false), 500);
      }
      if (progress.violations !== prevViolations) {
        setIsViolationsChanging(true);
        setTimeout(() => setIsViolationsChanging(false), 500);
      }

      // Update previous values
      setPrevProgress(progress.progress);
      setPrevWorkDays(progress.workDays);
      setPrevBestFitness(progress.bestFitness);
      setPrevViolations(progress.violations);
    }
  }, [progress, prevProgress, prevWorkDays, prevBestFitness, prevViolations]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    return progress ? Math.min(100, Math.max(0, progress.progress)) : 0;
  }, [progress]);

  // Format fitness value for display
  const formatFitness = (value: number): string => {
    if (value === Infinity) return '∞';
    if (value === -Infinity) return '-∞';
    return value.toFixed(2);
  };

  if (!progress && !isOptimizing) {
    return null;
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Optimization Progress</h3>
        {isOptimizing && (
          <button
            className={styles.cancelButton}
            onClick={onCancel}
            aria-label="Cancel optimization"
          >
            Cancel
          </button>
        )}
      </div>

      <div className={styles.content}>
        {/* Progress Bar */}
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>Progress</span>
            <span
              className={`${styles.progressValue} ${isProgressChanging ? styles.changing : ''}`}
            >
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {progress && (
            <div className={styles.generationInfo}>
              Generation {progress.generation}
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          {/* Best Fitness */}
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Best Fitness</span>
              <span
                className={`${styles.metricValue} ${isFitnessChanging ? styles.changing : ''}`}
              >
                {progress ? formatFitness(progress.bestFitness) : '—'}
              </span>
            </div>
          </div>

          {/* Work Days */}
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Work Days</span>
              <span
                className={`${styles.metricValue} ${isWorkDaysChanging ? styles.changing : ''}`}
              >
                {progress ? progress.workDays : '—'}
              </span>
            </div>
          </div>

          {/* Balance */}
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <polyline points="17 5 12 10 7 5" />
                <polyline points="17 19 12 14 7 19" />
              </svg>
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Balance</span>
              <span
                className={`${styles.metricValue} ${progress && progress.balance < 0 ? styles.negative : ''}`}
              >
                ${progress ? progress.balance.toFixed(2) : '—'}
              </span>
            </div>
          </div>

          {/* Violations */}
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Violations</span>
              <span
                className={`${styles.metricValue} ${isViolationsChanging ? styles.changing : ''} ${progress && progress.violations > 0 ? styles.hasViolations : ''}`}
              >
                {progress ? progress.violations : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {isOptimizing && (
          <div className={styles.statusMessage}>
            {progress && progress.violations > 0 ? (
              <span className={styles.warningText}>
                Searching for solution with fewer violations...
              </span>
            ) : (
              <span className={styles.infoText}>Optimizing schedule...</span>
            )}
          </div>
        )}

        {/* Loading Animation */}
        {isOptimizing && !progress && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <span className={styles.loadingText}>
              Initializing optimization...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizationProgress;
