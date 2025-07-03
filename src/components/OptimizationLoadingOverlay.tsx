import React from 'react';
import { useProgress } from '../context/ProgressContext';
import styles from './OptimizationLoadingOverlay.module.css';

interface OptimizationLoadingOverlayProps {
  isVisible: boolean;
}

export const OptimizationLoadingOverlay: React.FC<
  OptimizationLoadingOverlayProps
> = ({ isVisible }) => {
  const { currentProgress } = useProgress();

  if (!isVisible) return null;

  const progress = currentProgress?.progress || 0;
  const generation = currentProgress?.generation || 0;
  const message = currentProgress?.message || 'Initializing optimization...';

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <h2 className={styles.title}>Optimizing Schedule</h2>

        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>Progress</span>
            <span className={styles.progressValue}>
              {Math.round(progress)}%
            </span>
          </div>

          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className={styles.generationInfo}>Generation: {generation}</div>
        </div>

        <div className={styles.message}>{message}</div>

        <div className={styles.loadingDots}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};
