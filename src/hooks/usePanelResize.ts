import { useState, useEffect, useCallback, useRef } from 'react';

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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const deltaX = e.clientX - startXRef.current;
      const containerWidth = containerRef.current.offsetWidth;

      if (isResizing === 'left') {
        // Resizing between left and center panels
        const newLeftWidth = Math.max(
          MIN_PANEL_WIDTH,
          Math.min(
            containerWidth - sizes.right - MIN_PANEL_WIDTH * 2,
            startSizesRef.current.left + deltaX
          )
        );
        const newCenterWidth = Math.max(
          MIN_PANEL_WIDTH,
          containerWidth - newLeftWidth - sizes.right
        );

        setSizes(prev => ({
          ...prev,
          left: newLeftWidth,
          center: newCenterWidth,
        }));
      } else if (isResizing === 'right') {
        // Resizing between center and right panels
        const newCenterWidth = Math.max(
          MIN_PANEL_WIDTH,
          Math.min(
            containerWidth - sizes.left - MIN_PANEL_WIDTH,
            startSizesRef.current.center + deltaX
          )
        );
        const newRightWidth = Math.max(
          MIN_PANEL_WIDTH,
          containerWidth - sizes.left - newCenterWidth
        );

        setSizes(prev => ({
          ...prev,
          center: newCenterWidth,
          right: newRightWidth,
        }));
      }
    },
    [isResizing, sizes.left, sizes.right]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const totalCurrentWidth = sizes.left + sizes.center + sizes.right;

      if (Math.abs(containerWidth - totalCurrentWidth) > 10) {
        // Redistribute widths proportionally
        const scale = containerWidth / totalCurrentWidth;
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
    resetSizes,
  };
};
