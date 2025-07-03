import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className = '',
}) => {
  return (
    <div
      className={`loading-spinner loading-spinner--${size} loading-spinner--${color} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div className="loading-spinner__circle" />
    </div>
  );
};
