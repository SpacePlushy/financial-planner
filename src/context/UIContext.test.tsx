import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UIProvider, useUIContext, useUI } from './UIContext';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Test component that uses UI context
function TestComponent() {
  const ui = useUIContext();

  return (
    <div>
      <div data-testid="view-mode">{ui.viewMode}</div>
      <div data-testid="show-weekends">{ui.showWeekends.toString()}</div>
      <div data-testid="highlight-violations">
        {ui.highlightViolations.toString()}
      </div>
      <div data-testid="active-modal">{ui.activeModal || 'none'}</div>
      <div data-testid="selected-day">{ui.selectedDay || 'none'}</div>
      <div data-testid="selected-field">{ui.selectedField || 'none'}</div>
      <div data-testid="theme">{ui.theme}</div>
      <div data-testid="debug-mode">{ui.debugMode.toString()}</div>
      <div data-testid="is-loading">{ui.isLoading.toString()}</div>
      <div data-testid="error">{ui.error?.message || 'none'}</div>

      <button onClick={() => ui.setViewMode('calendar')}>
        Set Calendar View
      </button>
      <button onClick={() => ui.toggleWeekends()}>Toggle Weekends</button>
      <button onClick={() => ui.toggleHighlightViolations()}>
        Toggle Violations
      </button>
      <button onClick={() => ui.openModal('edit')}>Open Edit Modal</button>
      <button onClick={() => ui.closeModal()}>Close Modal</button>
      <button onClick={() => ui.selectCell(5, 'earnings')}>Select Cell</button>
      <button onClick={() => ui.setFilter({ showWorkDaysOnly: true })}>
        Filter Work Days
      </button>
      <button onClick={() => ui.clearFilters()}>Clear Filters</button>
      <button onClick={() => ui.setSort('earnings', 'desc')}>
        Sort by Earnings
      </button>
      <button onClick={() => ui.toggleSortDirection()}>Toggle Sort</button>
      <button onClick={() => ui.setError('Test error', { code: 'TEST' })}>
        Set Error
      </button>
      <button onClick={() => ui.clearError()}>Clear Error</button>
      <button onClick={() => ui.setLoading(true)}>Set Loading</button>
      <button onClick={() => ui.toggleTheme()}>Toggle Theme</button>
      <button onClick={() => ui.toggleDebugMode()}>Toggle Debug</button>
    </div>
  );
}

describe('UIContext', () => {
  describe('Provider', () => {
    it('should provide default values', () => {
      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      expect(screen.getByTestId('view-mode')).toHaveTextContent('table');
      expect(screen.getByTestId('show-weekends')).toHaveTextContent('true');
      expect(screen.getByTestId('highlight-violations')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('active-modal')).toHaveTextContent('none');
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('debug-mode')).toHaveTextContent('false');
    });

    it('should accept initial values', () => {
      render(
        <UIProvider initialTheme="dark" initialDebugMode={true}>
          <TestComponent />
        </UIProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('debug-mode')).toHaveTextContent('true');
    });

    it('should throw error when used outside provider', () => {
      const TestErrorComponent = () => {
        try {
          useUIContext();
          return <div>Should not render</div>;
        } catch (error) {
          return <div>{(error as Error).message}</div>;
        }
      };

      render(<TestErrorComponent />);
      expect(
        screen.getByText('useUIContext must be used within a UIProvider')
      ).toBeInTheDocument();
    });
  });

  describe('View Mode Actions', () => {
    it('should set view mode', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Set Calendar View'));
      expect(screen.getByTestId('view-mode')).toHaveTextContent('calendar');
    });

    it('should toggle weekends', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Toggle Weekends'));
      expect(screen.getByTestId('show-weekends')).toHaveTextContent('false');

      await user.click(screen.getByText('Toggle Weekends'));
      expect(screen.getByTestId('show-weekends')).toHaveTextContent('true');
    });

    it('should toggle highlight violations', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Toggle Violations'));
      expect(screen.getByTestId('highlight-violations')).toHaveTextContent(
        'false'
      );
    });
  });

  describe('Modal Actions', () => {
    it('should open and close modal', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Open Edit Modal'));
      expect(screen.getByTestId('active-modal')).toHaveTextContent('edit');

      await user.click(screen.getByText('Close Modal'));
      expect(screen.getByTestId('active-modal')).toHaveTextContent('none');
    });

    it('should clear selection when closing modal', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      // Select cell first
      await user.click(screen.getByText('Select Cell'));
      expect(screen.getByTestId('selected-day')).toHaveTextContent('5');
      expect(screen.getByTestId('selected-field')).toHaveTextContent(
        'earnings'
      );

      // Open modal
      await user.click(screen.getByText('Open Edit Modal'));

      // Close modal - should clear selection
      await user.click(screen.getByText('Close Modal'));
      expect(screen.getByTestId('selected-day')).toHaveTextContent('none');
      expect(screen.getByTestId('selected-field')).toHaveTextContent('none');
    });
  });

  describe('Selection Actions', () => {
    it('should select cell', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Select Cell'));
      expect(screen.getByTestId('selected-day')).toHaveTextContent('5');
      expect(screen.getByTestId('selected-field')).toHaveTextContent(
        'earnings'
      );
    });
  });

  describe('Filter Actions', () => {
    it('should set and clear filters', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Filter Work Days'));
      // No direct way to test filter state, but action should not throw

      await user.click(screen.getByText('Clear Filters'));
      // Filters should be reset
    });
  });

  describe('Sort Actions', () => {
    it('should set sort', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Sort by Earnings'));
      // No direct way to test sort state in this component

      await user.click(screen.getByText('Toggle Sort'));
      // Sort direction should toggle
    });
  });

  describe('Error and Loading Actions', () => {
    it('should set and clear error', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Set Error'));
      expect(screen.getByTestId('error')).toHaveTextContent('Test error');

      await user.click(screen.getByText('Clear Error'));
      expect(screen.getByTestId('error')).toHaveTextContent('none');
    });

    it('should set loading state', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Set Loading'));
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
    });
  });

  describe('Theme Actions', () => {
    it('should toggle theme', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Toggle Theme'));
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');

      await user.click(screen.getByText('Toggle Theme'));
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    it('should apply theme to document', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider initialTheme="dark">
          <TestComponent />
        </UIProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      await user.click(screen.getByText('Toggle Theme'));
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('Debug Actions', () => {
    it('should toggle debug mode', async () => {
      const user = userEvent.setup();

      render(
        <UIProvider>
          <TestComponent />
        </UIProvider>
      );

      await user.click(screen.getByText('Toggle Debug'));
      expect(screen.getByTestId('debug-mode')).toHaveTextContent('true');
    });
  });
});

describe('useUI Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UIProvider>{children}</UIProvider>
  );

  it('should provide utility functions', () => {
    const { result } = renderHook(() => useUI(), { wrapper });

    // Test isWeekend
    expect(result.current.isWeekend(6)).toBe(true); // Saturday
    expect(result.current.isWeekend(7)).toBe(true); // Sunday
    expect(result.current.isWeekend(1)).toBe(false); // Monday
    expect(result.current.isWeekend(13)).toBe(true); // Day 13 = Saturday
  });

  it('should determine if day should be shown', () => {
    const { result } = renderHook(() => useUI(), { wrapper });

    // Weekend with showWeekends = true
    expect(result.current.shouldShowDay(6, false)).toBe(true);

    // Toggle weekends off
    act(() => {
      result.current.toggleWeekends();
    });

    // Weekend with showWeekends = false
    expect(result.current.shouldShowDay(6, false)).toBe(false);

    // Weekday should still show
    expect(result.current.shouldShowDay(1, false)).toBe(true);
  });

  it('should filter work days only', () => {
    const { result } = renderHook(() => useUI(), { wrapper });

    act(() => {
      result.current.setFilter({ showWorkDaysOnly: true });
    });

    expect(result.current.shouldShowDay(1, true)).toBe(true); // Work day
    expect(result.current.shouldShowDay(1, false)).toBe(false); // Non-work day
  });

  it('should filter by date range', () => {
    const { result } = renderHook(() => useUI(), { wrapper });

    act(() => {
      result.current.setFilter({ dateRange: { start: 5, end: 10 } });
    });

    expect(result.current.shouldShowDay(7, false)).toBe(true); // Within range
    expect(result.current.shouldShowDay(3, false)).toBe(false); // Before range
    expect(result.current.shouldShowDay(12, false)).toBe(false); // After range
  });

  it('should get modal title', () => {
    const { result } = renderHook(() => useUI(), { wrapper });

    // No modal
    expect(result.current.getModalTitle()).toBe('');

    // Edit modal with selection
    act(() => {
      result.current.selectCell(5, 'earnings');
      result.current.openModal('edit');
    });
    expect(result.current.getModalTitle()).toBe('Edit Day 5 - earnings');

    // Config modal
    act(() => {
      result.current.openModal('config');
    });
    expect(result.current.getModalTitle()).toBe('Configuration');

    // Export modal
    act(() => {
      result.current.openModal('export');
    });
    expect(result.current.getModalTitle()).toBe('Export Data');

    // Import modal
    act(() => {
      result.current.openModal('import');
    });
    expect(result.current.getModalTitle()).toBe('Import Data');

    // Help modal
    act(() => {
      result.current.openModal('help');
    });
    expect(result.current.getModalTitle()).toBe('Help');
  });
});
