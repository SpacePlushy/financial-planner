import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScheduleTable } from './ScheduleTable';
import { DaySchedule, Edit } from '../../types';
import { ScheduleProvider } from '../../context/ScheduleContext';

// Mock CSS modules
jest.mock('./ScheduleTable.module.css', () => ({
  tableContainer: 'tableContainer',
  loadingOverlay: 'loadingOverlay',
  spinner: 'spinner',
  tableWrapper: 'tableWrapper',
  scheduleTable: 'scheduleTable',
  editableHeader: 'editableHeader',
  hasEdits: 'hasEdits',
  workDay: 'workDay',
  dayCell: 'dayCell',
  dateCell: 'dateCell',
  shiftsCell: 'shiftsCell',
  editableCell: 'editableCell',
  edited: 'edited',
  depositCell: 'depositCell',
  balanceCell: 'balanceCell',
  lowBalance: 'lowBalance',
  emptyState: 'emptyState',
  editIndicator: 'editIndicator',
  editDot: 'editDot',
}));

const mockSchedule: DaySchedule[] = [
  {
    day: 1,
    shifts: ['large'],
    earnings: 175,
    expenses: 50,
    deposit: 0,
    startBalance: 1000,
    endBalance: 1125,
  },
  {
    day: 2,
    shifts: [],
    earnings: 0,
    expenses: 100,
    deposit: 0,
    startBalance: 1125,
    endBalance: 1025,
  },
  {
    day: 3,
    shifts: ['medium', 'small'],
    earnings: 245,
    expenses: 75,
    deposit: 200,
    startBalance: 1025,
    endBalance: 1395,
  },
];

const mockEdits: Edit[] = [
  {
    day: 1,
    field: 'earnings',
    originalValue: 175,
    newValue: 200,
  },
  {
    day: 2,
    field: 'expenses',
    originalValue: 100,
    newValue: 150,
  },
];

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ScheduleProvider initialSchedule={mockSchedule}>
      {component}
    </ScheduleProvider>
  );
};

describe('ScheduleTable', () => {
  const mockOnCellDoubleClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render schedule data correctly', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      // Check headers
      expect(screen.getByText('Day')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Shifts')).toBeInTheDocument();
      expect(screen.getByText('Earnings')).toBeInTheDocument();
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('Deposits')).toBeInTheDocument();
      expect(screen.getByText('Start Balance')).toBeInTheDocument();
      expect(screen.getByText('End Balance')).toBeInTheDocument();

      // Check data rows
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('large')).toBeInTheDocument();
      expect(screen.getByText('$175')).toBeInTheDocument();
      expect(screen.getByText('$50')).toBeInTheDocument();
      expect(screen.getByText('$1,000')).toBeInTheDocument();
      expect(screen.getByText('$1,125')).toBeInTheDocument();

      // Check rest day
      expect(screen.getByText('Rest Day')).toBeInTheDocument();

      // Check multiple shifts
      expect(screen.getByText('medium, small')).toBeInTheDocument();
    });

    it('should render empty state when no schedule data', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={[]}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      expect(
        screen.getByText('No schedule data available')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Run optimization to generate a schedule')
      ).toBeInTheDocument();
    });

    it('should render loading overlay when isLoading is true', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={true}
        />
      );

      expect(screen.getByText('Optimizing schedule...')).toBeInTheDocument();
    });
  });

  describe('Edit Indicators', () => {
    it('should show edit indicators for edited cells', () => {
      const { container } = renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={mockEdits}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      // Check for edited class on cells
      const editedCells = container.querySelectorAll('.edited');
      expect(editedCells).toHaveLength(2);

      // Check edit indicator at bottom
      expect(screen.getByText('2 unsaved edits')).toBeInTheDocument();
    });

    it('should display edited values instead of original values', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={mockEdits}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      // Should show edited earnings value
      expect(screen.getByText('$200')).toBeInTheDocument();
      expect(screen.queryByText('$175')).not.toBeInTheDocument();

      // Should show edited expenses value
      expect(screen.getByText('$150')).toBeInTheDocument();
      expect(screen.queryByText('$100')).not.toBeInTheDocument();
    });

    it('should show singular edit text for one edit', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[mockEdits[0]]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      expect(screen.getByText('1 unsaved edit')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should handle double click on editable cells', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      // Find and double click earnings cell for day 1
      const earningsCell = screen.getAllByText('$175')[0].parentElement;
      fireEvent.doubleClick(earningsCell!);

      expect(mockOnCellDoubleClick).toHaveBeenCalledWith(1, 'earnings');
    });

    it('should not handle double click when loading', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={true}
        />
      );

      // Find and double click earnings cell
      const earningsCell = screen.getAllByText('$175')[0].parentElement;
      fireEvent.doubleClick(earningsCell!);

      expect(mockOnCellDoubleClick).not.toHaveBeenCalled();
    });

    it('should show hover tooltip on editable cells', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      const earningsCell = screen.getAllByText('$175')[0].parentElement;
      expect(earningsCell).toHaveAttribute('title', 'Double-click to edit');
    });
  });

  describe('Visual Indicators', () => {
    it('should highlight low balance', () => {
      const lowBalanceSchedule: DaySchedule[] = [
        {
          day: 1,
          shifts: [],
          earnings: 0,
          expenses: 950,
          deposit: 0,
          startBalance: 1000,
          endBalance: 50, // Low balance
        },
      ];

      const { container } = renderWithProvider(
        <ScheduleTable
          schedule={lowBalanceSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      const lowBalanceCell = container.querySelector('.lowBalance');
      expect(lowBalanceCell).toBeInTheDocument();
      expect(lowBalanceCell).toHaveTextContent('$50');
    });

    it('should highlight work days', () => {
      const { container } = renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      const workDayRows = container.querySelectorAll('.workDay');
      expect(workDayRows).toHaveLength(2); // Days 1 and 3 have shifts
    });

    it('should mark rows with edits', () => {
      const { container } = renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={mockEdits}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      const editedRows = container.querySelectorAll('.hasEdits');
      expect(editedRows).toHaveLength(2); // Days 1 and 2 have edits
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency values correctly', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      // Check various currency formats
      expect(screen.getByText('$175')).toBeInTheDocument();
      expect(screen.getByText('$1,000')).toBeInTheDocument();
      expect(screen.getByText('$1,395')).toBeInTheDocument();
    });

    it('should handle balance edit field correctly', () => {
      const balanceEdit: Edit[] = [
        {
          day: 1,
          field: 'balance',
          originalValue: 1000,
          newValue: 1500,
        },
      ];

      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={balanceEdit}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      // Should show edited balance value
      expect(screen.getByText('$1,500')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      // Check for date format (e.g., "Mon, Jan 1")
      const dateCells = screen.getAllByText(/\w{3}, \w{3} \d+/);
      expect(dateCells.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible table structure', () => {
      const { container } = renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();

      const thead = container.querySelector('thead');
      expect(thead).toBeInTheDocument();

      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();

      const headers = container.querySelectorAll('th');
      expect(headers).toHaveLength(8);
    });

    it('should indicate editable columns in headers', () => {
      const { container } = renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      const editableHeaders = container.querySelectorAll('.editableHeader');
      expect(editableHeaders).toHaveLength(3); // Earnings, Expenses, Start Balance
    });
  });

  describe('Edge Cases', () => {
    it('should handle schedule with no shifts', () => {
      const noShiftsSchedule: DaySchedule[] = [
        {
          day: 1,
          shifts: [],
          earnings: 0,
          expenses: 0,
          deposit: 0,
          startBalance: 1000,
          endBalance: 1000,
        },
      ];

      renderWithProvider(
        <ScheduleTable
          schedule={noShiftsSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      expect(screen.getByText('Rest Day')).toBeInTheDocument();
    });

    it('should handle empty edits array', () => {
      const { container } = renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={[]}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      const editIndicator = container.querySelector('.editIndicator');
      expect(editIndicator).not.toBeInTheDocument();
    });

    it('should handle multiple edits for same day', () => {
      const multipleEdits: Edit[] = [
        {
          day: 1,
          field: 'earnings',
          originalValue: 175,
          newValue: 200,
        },
        {
          day: 1,
          field: 'expenses',
          originalValue: 50,
          newValue: 75,
        },
        {
          day: 1,
          field: 'balance',
          originalValue: 1000,
          newValue: 1100,
        },
      ];

      renderWithProvider(
        <ScheduleTable
          schedule={mockSchedule}
          edits={multipleEdits}
          onCellDoubleClick={mockOnCellDoubleClick}
          isLoading={false}
        />
      );

      // Should show only one row as edited
      const table = screen.getByTestId('schedule-table');
      const editedRows = within(table)
        .getAllByRole('row')
        .filter(row => row.classList.contains('hasEdits'));
      expect(editedRows).toHaveLength(1);

      // But three cells should be marked as edited
      const editedCells = within(table)
        .getAllByRole('cell')
        .filter(cell => cell.classList.contains('edited'));
      expect(editedCells).toHaveLength(3);
    });
  });
});
