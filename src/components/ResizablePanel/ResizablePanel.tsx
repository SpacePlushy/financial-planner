import React from 'react';
import './ResizablePanel.css';

interface ResizablePanelProps {
  position: 'left' | 'center' | 'right';
  width: number;
  children: React.ReactNode;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  position,
  width,
  children,
  className = '',
}) => {
  return (
    <div
      className={`resizable-panel ${position} ${className}`}
      style={{ width: `${width}px` }}
    >
      {children}
    </div>
  );
};
