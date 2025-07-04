import React, { useEffect, useState } from 'react';
import { useOptimizer } from '../../hooks/useOptimizer';
import { useProgress } from '../../context/ProgressContext';
import { useConfig } from '../../hooks/useConfig';
import styles from './OptimizationProgress.module.css';

/**
 * OptimizationProgress component displays real-time optimization progress
 * with animated transitions and detailed metrics.
 */
export const OptimizationProgress: React.FC = () => {
  const {
    isOptimizing,
    isPaused,
    cancelOptimization,
    pauseOptimization,
    resumeOptimization,
  } = useOptimizer();
  const {
    currentProgress,
    lastResult,
    getProgressPercentage,
    getElapsedTime,
    getEstimatedTimeRemaining,
  } = useProgress();
  const { config } = useConfig();

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

  // Initial loading state - check if we're at generation 0 with no real progress
  const [isInitializing, setIsInitializing] = useState(
    !currentProgress || currentProgress.generation === 0
  );

  // Track if user has dismissed the completed view
  const [isDismissed, setIsDismissed] = useState(false);

  // Update initialization state - once we get past generation 0, we're no longer initializing
  useEffect(() => {
    if (currentProgress && currentProgress.generation > 0) {
      setIsInitializing(false);
    }
  }, [currentProgress]);

  // Reset dismissed state and initialization when a new optimization starts
  useEffect(() => {
    if (isOptimizing) {
      setIsDismissed(false);
      setIsInitializing(true);
    }
  }, [isOptimizing]);

  // Update previous values and trigger animations when progress changes
  useEffect(() => {
    if (currentProgress) {
      const progress = getProgressPercentage();

      // Check what changed
      if (progress !== prevProgress) {
        setIsProgressChanging(true);
        setTimeout(() => setIsProgressChanging(false), 500);
      }
      if (currentProgress.workDays !== prevWorkDays) {
        setIsWorkDaysChanging(true);
        setTimeout(() => setIsWorkDaysChanging(false), 500);
      }
      if (currentProgress.bestFitness !== prevBestFitness) {
        setIsFitnessChanging(true);
        setTimeout(() => setIsFitnessChanging(false), 500);
      }
      if (currentProgress.violations !== prevViolations) {
        setIsViolationsChanging(true);
        setTimeout(() => setIsViolationsChanging(false), 500);
      }

      // Update previous values
      setPrevProgress(progress);
      setPrevWorkDays(currentProgress.workDays || 0);
      setPrevBestFitness(currentProgress.bestFitness);
      setPrevViolations(currentProgress.violations || 0);
    }
  }, [
    currentProgress,
    getProgressPercentage,
    prevProgress,
    prevWorkDays,
    prevBestFitness,
    prevViolations,
  ]);

  // Format fitness value for display
  const formatFitness = (value: number): string => {
    if (value === Infinity) return '∞';
    if (value === -Infinity) return '-∞';
    return value.toFixed(2);
  };

  // Format time
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const progressPercentage = getProgressPercentage();
  const timeElapsed = getElapsedTime();
  const estimatedTimeRemaining = getEstimatedTimeRemaining();

  // Don't show if user dismissed the completed view
  if (isDismissed) {
    return null;
  }

  // Determine if we're showing completed state
  const isCompleted = !isOptimizing && lastResult !== null;

  // Show initialization state when optimization just started
  if (
    isOptimizing &&
    (isInitializing ||
      !currentProgress ||
      (currentProgress.generation === 0 && progressPercentage === 0))
  ) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Optimization Progress</h3>
        </div>
        <div className={styles.content}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <span className={styles.loadingText}>
              Initializing optimization...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {isCompleted ? 'Optimization Complete' : 'Optimization Progress'}
        </h3>
        <div className={styles.actions}>
          {isOptimizing && !isPaused && (
            <button
              className={styles.pauseButton}
              onClick={pauseOptimization}
              aria-label="Pause optimization"
            >
              Pause
            </button>
          )}
          {isOptimizing && isPaused && (
            <button
              className={styles.resumeButton}
              onClick={resumeOptimization}
              aria-label="Resume optimization"
            >
              Resume
            </button>
          )}
          {isOptimizing && (
            <button
              className={styles.cancelButton}
              onClick={cancelOptimization}
              aria-label="Cancel optimization"
            >
              Cancel
            </button>
          )}
          {isCompleted && (
            <button
              className={styles.closeButton}
              onClick={() => setIsDismissed(true)}
              aria-label="Close optimization results"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {/* Progress Bar */}
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>Progress</span>
            <span
              className={`${styles.progressValue} ${isProgressChanging ? styles.changing : ''}`}
            >
              {isCompleted ? 100 : progressPercentage}%
            </span>
          </div>
          <div className={styles.progressBarContainer}>
            <div
              className={`${styles.progressBar} ${isPaused ? styles.paused : ''}`}
              style={{ width: `${isCompleted ? 100 : progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={isCompleted ? 100 : progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {(currentProgress || isCompleted) && (
            <div className={styles.generationInfo}>
              {isCompleted
                ? 'Optimization Complete'
                : `Generation ${currentProgress?.generation} of ${config.generations}`}
            </div>
          )}
        </div>

        {/* Time Info */}
        {timeElapsed > 0 && (
          <div className={styles.timeInfo}>
            <span className={styles.timeLabel}>Time elapsed:</span>
            <span className={styles.timeValue}>{formatTime(timeElapsed)}</span>
            {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
              <>
                <span className={styles.timeSeparator}>•</span>
                <span className={styles.timeLabel}>Remaining:</span>
                <span className={styles.timeValue}>
                  ~{formatTime(estimatedTimeRemaining)}
                </span>
              </>
            )}
          </div>
        )}

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
                {isCompleted && lastResult
                  ? formatFitness(
                      lastResult.violations === 0 ? 0 : lastResult.totalEarnings
                    )
                  : currentProgress
                    ? formatFitness(currentProgress.bestFitness)
                    : '—'}
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
                {isCompleted && lastResult
                  ? lastResult.workDays.length
                  : currentProgress?.workDays || '—'}
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
                className={`${styles.metricValue} ${(isCompleted && lastResult && lastResult.finalBalance < 0) || (currentProgress?.balance && currentProgress.balance < 0) ? styles.negative : ''}`}
              >
                {isCompleted && lastResult
                  ? `$${lastResult.finalBalance.toFixed(2)}`
                  : currentProgress?.balance
                    ? `$${currentProgress.balance.toFixed(2)}`
                    : '$—'}
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
                className={`${styles.metricValue} ${isViolationsChanging ? styles.changing : ''} ${(isCompleted && lastResult && lastResult.violations > 0) || (currentProgress?.violations && currentProgress.violations > 0) ? styles.hasViolations : ''}`}
              >
                {isCompleted && lastResult
                  ? lastResult.violations
                  : (currentProgress?.violations ?? '—')}
              </span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {(isOptimizing || isCompleted) && (
          <div className={styles.statusMessage}>
            {isCompleted ? (
              <span className={styles.successText}>
                Optimization completed successfully!
              </span>
            ) : isPaused ? (
              <span className={styles.pausedText}>
                Optimization paused. Click resume to continue.
              </span>
            ) : currentProgress?.violations &&
              currentProgress.violations > 0 ? (
              <span className={styles.warningText}>
                Searching for solution with fewer violations...
              </span>
            ) : (
              <span className={styles.infoText}>Optimizing schedule...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizationProgress;
