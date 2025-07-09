import React, { useMemo, useCallback } from 'react';
import { DaySchedule, Edit } from '../../types';
import { useSchedule } from '../../hooks/useSchedule';
import styles from './ScheduleTable.module.css';

export interface ScheduleTableProps {
  schedule: DaySchedule[];
  edits: Edit[];
  onCellDoubleClick: (day: number, field: string) => void;
  isLoading: boolean;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedule,
  edits,
  onCellDoubleClick,
  isLoading,
}) => {
  const { getEditsForDay, workDays } = useSchedule();

  // Create a map of edits for quick lookup
  const editMap = useMemo(() => {
    const map = new Map<string, Edit>();
    edits.forEach(edit => {
      const key = `${edit.day}-${edit.field}`;
      map.set(key, edit);
    });
    return map;
  }, [edits]);

  // Check if a cell has been edited
  const hasEdit = useCallback(
    (day: number, field: Edit['field']): boolean => {
      const key = `${day}-${field}`;
      return editMap.has(key);
    },
    [editMap]
  );

  // Get the display value for a cell (edited value or original)
  const getCellValue = useCallback(
    (day: DaySchedule, field: Edit['field']): string | number => {
      const edit = editMap.get(`${day.day}-${field}`);
      if (edit) {
        // Handle array values (shifts)
        if (Array.isArray(edit.newValue)) {
          return edit.newValue.join(', ');
        }
        return edit.newValue as string | number;
      }

      switch (field) {
        case 'earnings':
          return day.earnings;
        case 'expenses':
          return day.expenses;
        case 'balance':
          return day.startBalance;
        default:
          return '';
      }
    },
    [editMap]
  );

  // Format currency values
  const formatCurrency = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Format shifts array for display
  const formatShifts = (shifts: string[]): string => {
    if (shifts.length === 0) return 'Rest Day';
    return shifts.join(', ');
  };

  // Check if balance is low
  const isLowBalance = (balance: number): boolean => {
    return balance < 100;
  };

  // Check if day is a work day
  const isWorkDay = (day: number): boolean => {
    return workDays.includes(day);
  };

  // Handle cell double click
  const handleCellDoubleClick = (day: number, field: string) => {
    if (!isLoading) {
      onCellDoubleClick(day, field);
    }
  };

  if (schedule.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No schedule data available</p>
        <p>Run optimization to generate a schedule</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p>Optimizing schedule...</p>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.scheduleTable}>
          <thead>
            <tr>
              <th>Day</th>
              <th>Date</th>
              <th>Shifts</th>
              <th className={styles.editableHeader}>Earnings</th>
              <th className={styles.editableHeader}>Expenses</th>
              <th>Deposits</th>
              <th className={styles.editableHeader}>Start Balance</th>
              <th>End Balance</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(day => {
              const dayEdits = getEditsForDay(day.day);
              const hasAnyEdits = dayEdits.length > 0;
              const isWork = isWorkDay(day.day);

              return (
                <tr
                  key={day.day}
                  className={`
                    ${hasAnyEdits ? styles.hasEdits : ''}
                    ${isWork ? styles.workDay : ''}
                  `}
                >
                  <td className={styles.dayCell}>{day.day}</td>
                  <td className={styles.dateCell}>
                    {new Date(2024, 0, day.day).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className={styles.shiftsCell}>
                    {formatShifts(day.shifts)}
                  </td>
                  <td
                    className={`
                      ${styles.editableCell}
                      ${hasEdit(day.day, 'earnings') ? styles.edited : ''}
                    `}
                    onDoubleClick={() =>
                      handleCellDoubleClick(day.day, 'earnings')
                    }
                    title="Double-click to edit"
                  >
                    {formatCurrency(getCellValue(day, 'earnings'))}
                  </td>
                  <td
                    className={`
                      ${styles.editableCell}
                      ${hasEdit(day.day, 'expenses') ? styles.edited : ''}
                    `}
                    onDoubleClick={() =>
                      handleCellDoubleClick(day.day, 'expenses')
                    }
                    title="Double-click to edit"
                  >
                    {formatCurrency(getCellValue(day, 'expenses'))}
                  </td>
                  <td className={styles.depositCell}>
                    {formatCurrency(day.deposit)}
                  </td>
                  <td
                    className={`
                      ${styles.editableCell}
                      ${hasEdit(day.day, 'balance') ? styles.edited : ''}
                    `}
                    onDoubleClick={() =>
                      handleCellDoubleClick(day.day, 'balance')
                    }
                    title="Double-click to edit"
                  >
                    {formatCurrency(getCellValue(day, 'balance'))}
                  </td>
                  <td
                    className={`
                      ${styles.balanceCell}
                      ${isLowBalance(day.endBalance) ? styles.lowBalance : ''}
                    `}
                  >
                    {formatCurrency(day.endBalance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {edits.length > 0 && (
        <div className={styles.editIndicator}>
          <span className={styles.editDot} />
          <span>
            {edits.length} unsaved {edits.length === 1 ? 'edit' : 'edits'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ScheduleTable;
