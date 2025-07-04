import React from 'react';
import './ResizablePanel.css';

interface ResizableDividerProps {
  position: 'left' | 'right';
  onMouseDown: (position: 'left' | 'right', e: React.MouseEvent) => void;
  isResizing: boolean;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  position,
  onMouseDown,
  isResizing,
}) => {
  return (
    <div
      className={`resize-divider ${position} ${isResizing ? 'resizing' : ''}`}
      onMouseDown={e => onMouseDown(position, e)}
    >
      <div className="resize-handle" />
    </div>
  );
};
