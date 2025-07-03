import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rect' | 'circle';
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
  count?: number;
  spacing?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  variant = 'rect',
  animation = 'pulse',
  className = '',
  count = 1,
  spacing = 8,
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <>
      {items.map(index => (
        <div
          key={index}
          className={`skeleton skeleton--${variant} skeleton--${animation} ${className}`}
          style={{
            ...style,
            marginBottom: index < items.length - 1 ? spacing : 0,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

// Skeleton container for complex layouts
interface SkeletonContainerProps {
  children: React.ReactNode;
  isLoading: boolean;
}

export const SkeletonContainer: React.FC<SkeletonContainerProps> = ({
  children,
  isLoading,
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return <div className="skeleton-container">{children}</div>;
};
