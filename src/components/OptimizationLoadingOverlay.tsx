import React from 'react';
import styles from './OptimizationLoadingOverlay.module.css';

interface OptimizationLoadingOverlayProps {
  isVisible: boolean;
}

export const OptimizationLoadingOverlay: React.FC<
  OptimizationLoadingOverlayProps
> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.loadingText}>Loading</div>
    </div>
  );
};
