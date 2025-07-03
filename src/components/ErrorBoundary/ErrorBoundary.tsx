import React, { Component, ReactNode, ErrorInfo } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;

    // Log error to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Auto-reset after 10 seconds if this is a component-level boundary
    if (this.props.level === 'component' && this.state.errorCount < 3) {
      this.resetTimeoutId = setTimeout(() => {
        this.resetErrorBoundary();
      }, 10000);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset when resetKeys change
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== this.previousResetKeys[idx])) {
        this.resetErrorBoundary();
      }
    }

    // Reset when any props change (if enabled)
    if (
      hasError &&
      resetOnPropsChange &&
      prevProps.children !== this.props.children
    ) {
      this.resetErrorBoundary();
    }

    this.previousResetKeys = resetKeys || [];
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, isolate, level = 'component' } = this.props;

    if (hasError && error) {
      // Custom fallback UI
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI based on level
      return (
        <div className={`error-boundary error-boundary--${level}`}>
          <div className="error-boundary__content">
            <div className="error-boundary__icon">
              {level === 'page' ? '🚨' : level === 'section' ? '⚠️' : '❗'}
            </div>

            <h2 className="error-boundary__title">
              {level === 'page'
                ? 'Something went wrong'
                : level === 'section'
                  ? 'This section encountered an error'
                  : 'Component error'}
            </h2>

            <p className="error-boundary__message">
              {error.message || 'An unexpected error occurred'}
            </p>

            {process.env.NODE_ENV !== 'production' && (
              <details className="error-boundary__details">
                <summary>Error details</summary>
                <pre className="error-boundary__stack">
                  {error.stack}
                  {errorInfo && errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="error-boundary__actions">
              <button
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.resetErrorBoundary}
              >
                Try again
              </button>

              {level === 'page' && (
                <button
                  className="error-boundary__button error-boundary__button--secondary"
                  onClick={() => window.location.reload()}
                >
                  Reload page
                </button>
              )}
            </div>

            {errorCount > 1 && (
              <p className="error-boundary__warning">
                This error has occurred {errorCount} times
              </p>
            )}
          </div>
        </div>
      );
    }

    // If isolate is true, wrap children in a div to prevent error propagation
    if (isolate) {
      return <div className="error-boundary__isolated">{children}</div>;
    }

    return children;
  }
}

/**
 * Hook to trigger error boundary
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}

/**
 * HOC to wrap component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
