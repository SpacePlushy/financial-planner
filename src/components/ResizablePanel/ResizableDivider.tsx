import React from 'react';
import './ResizablePanel.css';

interface ResizableDividerProps {
  position: 'left' | 'right';
  onMouseDown: (position: 'left' | 'right', e: React.MouseEvent) => void;
  onTouchStart: (position: 'left' | 'right', e: React.TouchEvent) => void;
  isResizing: boolean;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  position,
  onMouseDown,
  onTouchStart,
  isResizing,
}) => {
  return (
    <div
      className={`resize-divider ${position} ${isResizing ? 'resizing' : ''}`}
      onMouseDown={e => onMouseDown(position, e)}
      onTouchStart={e => onTouchStart(position, e)}
      style={{ touchAction: 'none' }}
    >
      <div className="resize-handle" />
    </div>
  );
};
