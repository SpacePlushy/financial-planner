import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';
import { SkeletonLoader, SkeletonContainer } from './SkeletonLoader';
import { LoadingOverlay } from './LoadingOverlay';
import { useLoadingState } from './useLoadingState';

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('loading-spinner--medium');
    expect(spinner).toHaveClass('loading-spinner--primary');
  });

  it('should render with custom size', () => {
    render(<LoadingSpinner size="large" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('loading-spinner--large');
  });

  it('should render with custom color', () => {
    render(<LoadingSpinner color="white" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('loading-spinner--white');
  });

  it('should apply custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-class');
  });
});

describe('SkeletonLoader', () => {
  it('should render single skeleton', () => {
    render(<SkeletonLoader />);
    const skeleton = document.querySelector('.skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('skeleton--rect');
    expect(skeleton).toHaveClass('skeleton--pulse');
  });

  it('should render multiple skeletons', () => {
    render(<SkeletonLoader count={3} />);
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('should apply custom dimensions', () => {
    render(<SkeletonLoader width={200} height={50} />);
    const skeleton = document.querySelector('.skeleton');
    expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
  });

  it('should render different variants', () => {
    const { rerender } = render(<SkeletonLoader variant="text" />);
    expect(document.querySelector('.skeleton--text')).toBeInTheDocument();

    rerender(<SkeletonLoader variant="circle" />);
    expect(document.querySelector('.skeleton--circle')).toBeInTheDocument();
  });

  it('should apply spacing between items', () => {
    render(<SkeletonLoader count={2} spacing={16} />);
    const firstSkeleton = document.querySelector('.skeleton');
    expect(firstSkeleton).toHaveStyle({ marginBottom: '16px' });
  });
});

describe('SkeletonContainer', () => {
  it('should show children when not loading', () => {
    render(
      <SkeletonContainer isLoading={false}>
        <div>Content</div>
      </SkeletonContainer>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(
      document.querySelector('.skeleton-container')
    ).not.toBeInTheDocument();
  });

  it('should show skeleton container when loading', () => {
    render(
      <SkeletonContainer isLoading={true}>
        <SkeletonLoader />
      </SkeletonContainer>
    );
    expect(document.querySelector('.skeleton-container')).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  it('should not render when not loading and no children', () => {
    const { container } = render(<LoadingOverlay isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should show overlay when loading', () => {
    render(<LoadingOverlay isLoading={true} />);
    expect(document.querySelector('.loading-overlay')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show message when provided', () => {
    render(<LoadingOverlay isLoading={true} message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should blur children when blur is enabled', () => {
    render(
      <LoadingOverlay isLoading={true} blur={true}>
        <div>Content</div>
      </LoadingOverlay>
    );
    const content = document.querySelector('.loading-overlay-content');
    expect(content).toHaveClass('loading-overlay-content--blur');
  });

  it('should render fullscreen when enabled', () => {
    render(<LoadingOverlay isLoading={true} fullScreen={true} />);
    const container = document.querySelector('.loading-overlay-container');
    expect(container).toHaveClass('loading-overlay-container--fullscreen');
  });
});

describe('useLoadingState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should manage loading state', () => {
    const { result } = renderHook(() => useLoadingState());

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.stopLoading();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should delay loading start', () => {
    const { result } = renderHook(() => useLoadingState({ delay: 500 }));

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.isLoading).toBe(false);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should enforce minimum duration', () => {
    const { result } = renderHook(() => useLoadingState({ minDuration: 1000 }));

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.stopLoading();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should call lifecycle callbacks', () => {
    const onStart = jest.fn();
    const onComplete = jest.fn();

    const { result } = renderHook(() =>
      useLoadingState({ onStart, onComplete })
    );

    act(() => {
      result.current.startLoading();
    });

    expect(onStart).toHaveBeenCalled();

    act(() => {
      result.current.stopLoading();
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('should handle withLoading wrapper', async () => {
    const { result } = renderHook(() => useLoadingState());

    const promise = new Promise<string>(resolve => {
      setTimeout(() => resolve('done'), 100);
    });

    let loadingResult: string;

    await act(async () => {
      loadingResult = await result.current.withLoading(promise);
    });

    expect(loadingResult!).toBe('done');
    expect(result.current.isLoading).toBe(false);
  });

  it('should cleanup timeouts on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useLoadingState({ delay: 1000 })
    );

    act(() => {
      result.current.startLoading();
    });

    unmount();

    // Should not throw or cause issues
    act(() => {
      jest.runAllTimers();
    });
  });
});
