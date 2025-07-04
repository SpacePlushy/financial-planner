import { useState, useEffect, useCallback, useRef } from 'react';

// Helper function to extract clientX from mouse or touch event
const getClientX = (e: MouseEvent | TouchEvent): number => {
  if ('clientX' in e) {
    return e.clientX;
  }
  return e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0;
};

interface PanelSizes {
  left: number;
  center: number;
  right: number;
}

const DEFAULT_SIZES: PanelSizes = {
  left: 320,
  center: 400,
  right: 600,
};

const MIN_PANEL_WIDTH = 280;
const STORAGE_KEY = 'panel-sizes';

export const usePanelResize = () => {
  const [sizes, setSizes] = useState<PanelSizes>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_SIZES;
      }
    }
    return DEFAULT_SIZES;
  });

  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startSizesRef = useRef<PanelSizes>(sizes);

  // Save sizes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  }, [sizes]);

  const handleMouseDown = useCallback(
    (divider: 'left' | 'right', e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(divider);
      startXRef.current = e.clientX;
      startSizesRef.current = { ...sizes };
    },
    [sizes]
  );

  const handleTouchStart = useCallback(
    (divider: 'left' | 'right', e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(divider);
      startXRef.current = e.touches[0]?.clientX || 0;
      startSizesRef.current = { ...sizes };
    },
    [sizes]
  );

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isResizing || !containerRef.current) return;

      e.preventDefault();
      const deltaX = getClientX(e) - startXRef.current;
      const containerWidth = containerRef.current.offsetWidth;
      // Account for gaps between panels (2 gaps of 16px each)
      const totalGaps = 32;
      const availableWidth = containerWidth - totalGaps;

      if (isResizing === 'left') {
        // Resizing between left and center panels
        const newLeftWidth = Math.max(
          MIN_PANEL_WIDTH,
          Math.min(
            availableWidth - startSizesRef.current.right - MIN_PANEL_WIDTH,
            startSizesRef.current.left + deltaX
          )
        );
        const newCenterWidth = Math.max(
          MIN_PANEL_WIDTH,
          availableWidth - newLeftWidth - startSizesRef.current.right
        );

        setSizes({
          left: newLeftWidth,
          center: newCenterWidth,
          right: startSizesRef.current.right,
        });
      } else if (isResizing === 'right') {
        // Resizing between center and right panels
        const newCenterWidth = Math.max(
          MIN_PANEL_WIDTH,
          Math.min(
            availableWidth - startSizesRef.current.left - MIN_PANEL_WIDTH,
            startSizesRef.current.center + deltaX
          )
        );
        const newRightWidth = Math.max(
          MIN_PANEL_WIDTH,
          availableWidth - startSizesRef.current.left - newCenterWidth
        );

        setSizes({
          left: startSizesRef.current.left,
          center: newCenterWidth,
          right: newRightWidth,
        });
      }
    },
    [isResizing]
  );

  const handleEnd = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      document.addEventListener('touchcancel', handleEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMove, handleEnd]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const totalGaps = 32; // 2 gaps of 16px each
      const availableWidth = containerWidth - totalGaps;
      const totalCurrentWidth = sizes.left + sizes.center + sizes.right;

      if (Math.abs(availableWidth - totalCurrentWidth) > 10) {
        // Redistribute widths proportionally
        const scale = availableWidth / totalCurrentWidth;
        setSizes({
          left: Math.max(MIN_PANEL_WIDTH, Math.floor(sizes.left * scale)),
          center: Math.max(MIN_PANEL_WIDTH, Math.floor(sizes.center * scale)),
          right: Math.max(MIN_PANEL_WIDTH, Math.floor(sizes.right * scale)),
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sizes]);

  const resetSizes = useCallback(() => {
    setSizes(DEFAULT_SIZES);
  }, []);

  return {
    sizes,
    isResizing,
    containerRef,
    handleMouseDown,
    handleTouchStart,
    resetSizes,
  };
};
