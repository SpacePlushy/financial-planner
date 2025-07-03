import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
  blur?: boolean;
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  fullScreen = false,
  blur = false,
  children,
}) => {
  if (!isLoading && !children) {
    return null;
  }

  return (
    <div
      className={`loading-overlay-container ${fullScreen ? 'loading-overlay-container--fullscreen' : ''}`}
    >
      {children && (
        <div
          className={`loading-overlay-content ${blur && isLoading ? 'loading-overlay-content--blur' : ''}`}
        >
          {children}
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay__content">
            <LoadingSpinner size="large" />
            {message && <p className="loading-overlay__message">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
