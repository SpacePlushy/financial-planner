import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ErrorBoundary,
  useErrorHandler,
  withErrorBoundary,
} from './ErrorBoundary';

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({
  shouldThrow = true,
  message = 'Test error',
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

// Test component that throws error on click
const ThrowErrorOnClick: React.FC = () => {
  const throwError = useErrorHandler();

  return (
    <button onClick={() => throwError(new Error('Clicked error'))}>
      Throw Error
    </button>
  );
};

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch errors and display error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.queryByText('No error')).not.toBeInTheDocument();
    expect(screen.getByText('Component error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('should display custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Component error')).not.toBeInTheDocument();
  });

  it('should reset error state when clicking try again', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component error')).toBeInTheDocument();

    // First, update the component to not throw
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Then click try again
    fireEvent.click(screen.getByText('Try again'));

    expect(screen.queryByText('Component error')).not.toBeInTheDocument();
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('should show different UI for different error levels', () => {
    const { rerender } = render(
      <ErrorBoundary level="page">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Reload page')).toBeInTheDocument();

    rerender(
      <ErrorBoundary level="section">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(
      screen.getByText('This section encountered an error')
    ).toBeInTheDocument();
  });

  it('should show error count when error occurs multiple times', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} message="Error 1" />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Try again'));

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} message="Error 2" />
      </ErrorBoundary>
    );

    expect(
      screen.getByText('This error has occurred 2 times')
    ).toBeInTheDocument();
  });

  it('should reset on prop changes when resetOnPropsChange is true', () => {
    const { rerender } = render(
      <ErrorBoundary resetOnPropsChange={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component error')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetOnPropsChange={true}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Component error')).not.toBeInTheDocument();
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should reset when resetKeys change', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['key1']}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component error')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['key2']}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Component error')).not.toBeInTheDocument();
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should isolate errors when isolate prop is true', () => {
    render(
      <ErrorBoundary isolate={true}>
        <div>Test content</div>
      </ErrorBoundary>
    );

    const container = screen.getByText('Test content').parentElement;
    expect(container).toHaveClass('error-boundary__isolated');
  });
});

describe('useErrorHandler', () => {
  it('should throw error when called', () => {
    // Component that throws error inside render
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);

      if (shouldThrow) {
        throw new Error('Hook error');
      }

      return <button onClick={() => setShouldThrow(true)}>Throw</button>;
    };

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Throw'));

    expect(screen.getByText('Hook error')).toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const TestComponent = () => <ThrowError />;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Component error')).toBeInTheDocument();
  });

  it('should pass props to wrapped component', () => {
    const TestComponent: React.FC<{ message: string }> = ({ message }) => (
      <div>{message}</div>
    );
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent message="Test prop" />);

    expect(screen.getByText('Test prop')).toBeInTheDocument();
  });

  it('should accept error boundary props', () => {
    const TestComponent = () => <ThrowError />;
    const WrappedComponent = withErrorBoundary(TestComponent, {
      level: 'page',
      fallback: <div>HOC error</div>,
    });

    render(<WrappedComponent />);

    expect(screen.getByText('HOC error')).toBeInTheDocument();
  });
});
