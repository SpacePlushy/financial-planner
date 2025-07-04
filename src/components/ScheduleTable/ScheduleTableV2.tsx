import React, { useMemo, useCallback, useState } from 'react';
import { useSchedule } from '../../hooks/useSchedule';
import { useUI } from '../../context/UIContext';
import styles from './ScheduleTable.module.css';

export const ScheduleTable: React.FC = () => {
  const { currentSchedule, edits, getEditsForDay, hasEditsForDay } =
    useSchedule();

  const ui = useUI();

  // Loading state for data updates
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter schedule based on UI settings
  const displaySchedule = useMemo(() => {
    return currentSchedule.filter(day => {
      if (!ui.showWeekends && ui.isWeekend(day.day)) {
        return false;
      }
      if (
        ui.filters.showWorkDaysOnly &&
        (!day.shifts || day.shifts.length === 0)
      ) {
        return false;
      }
      if (ui.filters.showEditsOnly && !hasEditsForDay(day.day)) {
        return false;
      }
      if (ui.filters.dateRange) {
        const { start, end } = ui.filters.dateRange;
        if (day.day < start || day.day > end) {
          return false;
        }
      }
      return true;
    });
  }, [currentSchedule, ui, hasEditsForDay]);

  // Sort schedule based on UI settings
  const sortedSchedule = useMemo(() => {
    const sorted = [...displaySchedule];
    const { field, direction } = ui.sort;

    sorted.sort((a, b) => {
      let aValue: number | string[] = a[field as keyof typeof a];
      let bValue: number | string[] = b[field as keyof typeof b];

      // Handle special cases
      if (field === 'shifts') {
        aValue = a.shifts ? a.shifts.length : 0;
        bValue = b.shifts ? b.shifts.length : 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [displaySchedule, ui.sort]);

  // Helper function to get edit for a specific field
  const getEditForField = useCallback(
    (day: number, field: string) => {
      const dayEdits = getEditsForDay(day);
      return dayEdits.find(edit => edit.field === field);
    },
    [getEditsForDay]
  );

  // Helper function to check if a specific field has been edited
  const hasEditForField = useCallback(
    (day: number, field: string) => {
      return getEditForField(day, field) !== undefined;
    },
    [getEditForField]
  );

  // Get the display value for a cell
  const getCellValue = useCallback(
    (
      day: number,
      field: string,
      originalValue: string[] | number | unknown
    ) => {
      const edit = getEditForField(day, field);
      if (edit) {
        return edit.newValue;
      }

      // Format arrays nicely
      if (Array.isArray(originalValue)) {
        return originalValue.join(', ') || '-';
      }

      // Format numbers nicely
      if (typeof originalValue === 'number' && field !== 'day') {
        return originalValue.toFixed(2);
      }

      // Handle string values
      if (typeof originalValue === 'string') {
        return originalValue || '-';
      }

      // Default for any other type
      return '-';
    },
    [getEditForField]
  );

  // Handle cell double click
  const handleCellDoubleClick = useCallback(
    async (day: number, field: string) => {
      setIsUpdating(true);
      setTimeout(() => {
        ui.selectCell(day, field);
        ui.openModal('edit');
        setIsUpdating(false);
      }, 50);
    },
    [ui]
  );

  // Render empty state
  if (sortedSchedule.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No schedule data to display</p>
        {ui.filters.showWorkDaysOnly && (
          <p className={styles.hint}>
            Try disabling "Show Work Days Only" filter
          </p>
        )}
        {ui.filters.showEditsOnly && (
          <p className={styles.hint}>No edits have been made yet</p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      {isUpdating && <div className={styles.updatingMessage}>Updating...</div>}
      <table className={styles.table}>
        <thead>
          <tr>
            <th
              className={`${styles.th} ${ui.sort.field === 'day' ? styles.sorted : ''}`}
              onClick={() => ui.setSort('day')}
            >
              Day{' '}
              {ui.sort.field === 'day' &&
                (ui.sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className={`${styles.th} ${ui.sort.field === 'shifts' ? styles.sorted : ''}`}
              onClick={() => ui.setSort('shifts')}
            >
              Shifts{' '}
              {ui.sort.field === 'shifts' &&
                (ui.sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className={`${styles.th} ${ui.sort.field === 'earnings' ? styles.sorted : ''}`}
              onClick={() => ui.setSort('earnings')}
            >
              Earnings{' '}
              {ui.sort.field === 'earnings' &&
                (ui.sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className={`${styles.th} ${ui.sort.field === 'expenses' ? styles.sorted : ''}`}
              onClick={() => ui.setSort('expenses')}
            >
              Expenses{' '}
              {ui.sort.field === 'expenses' &&
                (ui.sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className={`${styles.th} ${ui.sort.field === 'deposit' ? styles.sorted : ''}`}
              onClick={() => ui.setSort('deposit')}
            >
              Deposit{' '}
              {ui.sort.field === 'deposit' &&
                (ui.sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className={`${styles.th} ${ui.sort.field === 'startBalance' ? styles.sorted : ''}`}
              onClick={() => ui.setSort('startBalance')}
            >
              Start Balance{' '}
              {ui.sort.field === 'startBalance' &&
                (ui.sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className={`${styles.th} ${ui.sort.field === 'endBalance' ? styles.sorted : ''}`}
              onClick={() => ui.setSort('endBalance')}
            >
              End Balance{' '}
              {ui.sort.field === 'endBalance' &&
                (ui.sort.direction === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSchedule.map(day => {
            const hasViolation = false; // TODO: Add violation highlighting back
            const isWeekend = ui.isWeekend(day.day);

            return (
              <tr
                key={day.day}
                className={`
                    ${styles.tr}
                    ${hasViolation ? styles.violation : ''}
                    ${isWeekend ? styles.weekend : ''}
                    ${ui.selectedDay === day.day ? styles.selected : ''}
                  `}
              >
                <td className={styles.td}>{day.day}</td>
                <td
                  className={`${styles.td} ${styles.editable} ${hasEditForField(day.day, 'shifts') ? styles.edited : ''}`}
                  onDoubleClick={() => handleCellDoubleClick(day.day, 'shifts')}
                >
                  {getCellValue(day.day, 'shifts', day.shifts)}
                </td>
                <td
                  className={`${styles.td} ${styles.editable} ${styles.numeric} ${hasEditForField(day.day, 'earnings') ? styles.edited : ''}`}
                  onDoubleClick={() =>
                    handleCellDoubleClick(day.day, 'earnings')
                  }
                >
                  ${getCellValue(day.day, 'earnings', day.earnings)}
                </td>
                <td
                  className={`${styles.td} ${styles.editable} ${styles.numeric} ${hasEditForField(day.day, 'expenses') ? styles.edited : ''}`}
                  onDoubleClick={() =>
                    handleCellDoubleClick(day.day, 'expenses')
                  }
                >
                  ${getCellValue(day.day, 'expenses', day.expenses)}
                </td>
                <td
                  className={`${styles.td} ${styles.editable} ${styles.numeric} ${hasEditForField(day.day, 'deposit') ? styles.edited : ''}`}
                  onDoubleClick={() =>
                    handleCellDoubleClick(day.day, 'deposit')
                  }
                >
                  ${getCellValue(day.day, 'deposit', day.deposit)}
                </td>
                <td className={`${styles.td} ${styles.numeric}`}>
                  ${day.startBalance ? day.startBalance.toFixed(2) : '0.00'}
                </td>
                <td
                  className={`${styles.td} ${styles.numeric} ${day.endBalance && day.endBalance < 0 ? styles.negative : ''}`}
                >
                  ${day.endBalance ? day.endBalance.toFixed(2) : '0.00'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Table footer with summary */}
      <div className={styles.tableFooter}>
        <span>
          Showing {sortedSchedule.length} of {currentSchedule.length} days
        </span>
        {edits.length > 0 && (
          <span className={styles.editCount}>{edits.length} edits</span>
        )}
      </div>
    </div>
  );
};
