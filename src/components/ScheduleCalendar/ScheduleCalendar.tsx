import React, { useMemo, useCallback, useState } from 'react';
import { useSchedule } from '../../hooks/useSchedule';
import { useUI } from '../../context/UIContext';
import { DaySchedule } from '../../types';
import styles from './ScheduleCalendar.module.css';

export const ScheduleCalendar: React.FC = () => {
  const {
    currentSchedule,
    hasEditsForDay,
    optimizationResult,
    expenses,
    deposits,
    setCurrentSchedule,
  } = useSchedule();
  const ui = useUI();

  // Loading state for data updates
  const [isUpdating, setIsUpdating] = useState(false);

  // Create calendar data structure
  const calendarData = useMemo(() => {
    const scheduleMap = new Map<number, DaySchedule>();
    currentSchedule.forEach(day => {
      scheduleMap.set(day.day, day);
    });

    // Create 30-day calendar grid
    const calendar: Array<DaySchedule | null> = [];
    for (let day = 1; day <= 30; day++) {
      calendar.push(scheduleMap.get(day) || null);
    }

    return calendar;
  }, [currentSchedule]);

  // Get color class for shift type
  const getShiftColorClass = useCallback((shifts: string[]) => {
    if (shifts.length === 0) return '';

    const shiftType = shifts[0]; // Use first shift for primary color
    switch (shiftType) {
      case 'large':
        return styles.shiftLarge;
      case 'medium':
        return styles.shiftMedium;
      case 'small':
        return styles.shiftSmall;
      default:
        return styles.shiftDefault;
    }
  }, []);

  // Get balance indicator class
  const getBalanceClass = useCallback((balance: number) => {
    if (balance < 0) return styles.balanceNegative;
    if (balance < 100) return styles.balanceLow;
    if (balance > 1000) return styles.balanceHigh;
    return styles.balanceNormal;
  }, []);

  // Handle day click for editing
  const handleDayClick = useCallback(
    async (day: number) => {
      if (!currentSchedule.find(d => d.day === day)) return;

      setIsUpdating(true);
      setTimeout(() => {
        ui.selectCell(day, 'shifts');
        ui.openModal('edit');
        setIsUpdating(false);
      }, 50);
    },
    [currentSchedule, ui]
  );

  // Render empty state
  if (currentSchedule.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📅</div>
        <h3>No schedule data available</h3>
        <p>
          Run an optimization to generate schedule data for the calendar view.
        </p>
        <div
          style={{
            marginTop: '20px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          <p>Debug Info:</p>
          <p>Schedule length: {currentSchedule.length}</p>
          <p>Has optimization result: {optimizationResult ? 'Yes' : 'No'}</p>
        </div>
        <button
          onClick={() => {
            // Generate sample schedule data for testing
            const sampleSchedule: DaySchedule[] = [];
            let balance = 200; // Starting balance

            for (let day = 1; day <= 30; day++) {
              const isWeekend = day % 7 === 0 || day % 7 === 6;
              const shifts = isWeekend ? [] : ['medium'];
              const earnings = shifts.length > 0 ? 67.5 : 0;

              // Calculate expenses for this day
              const dayExpenses = expenses
                .filter(e => e.day === day)
                .reduce((sum, e) => sum + e.amount, 0);

              // Calculate deposits for this day
              const dayDeposits = deposits
                .filter(d => d.day === day)
                .reduce((sum, d) => sum + d.amount, 0);

              balance = balance + earnings + dayDeposits - dayExpenses;

              sampleSchedule.push({
                day,
                shifts,
                earnings,
                expenses: dayExpenses,
                deposit: dayDeposits,
                startBalance: balance - earnings - dayDeposits + dayExpenses,
                endBalance: balance,
              });
            }

            setCurrentSchedule(sampleSchedule);
          }}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Generate Sample Data (For Testing)
        </button>
      </div>
    );
  }

  return (
    <div className={styles.calendarWrapper}>
      {isUpdating && <div className={styles.updatingMessage}>Updating...</div>}
      <div className={styles.calendarHeader}>
        <h3>30-Day Schedule Calendar</h3>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.shiftLarge}`}></div>
            <span>Large Shifts</span>
          </div>
          <div className={styles.legendItem}>
            <div
              className={`${styles.legendColor} ${styles.shiftMedium}`}
            ></div>
            <span>Medium Shifts</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.shiftSmall}`}></div>
            <span>Small Shifts</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.noShift}`}></div>
            <span>No Shifts</span>
          </div>
        </div>
      </div>

      <div className={styles.calendarGrid}>
        {calendarData.map((dayData, index) => {
          const dayNumber = index + 1;
          const isWeekend = ui.isWeekend(dayNumber);
          const hasEdits = dayData ? hasEditsForDay(dayData.day) : false;
          const isSelected = ui.selectedDay === dayNumber;

          return (
            <div
              key={dayNumber}
              className={`
                  ${styles.calendarDay}
                  ${isWeekend ? styles.weekend : ''}
                  ${!dayData ? styles.noData : ''}
                  ${dayData ? getShiftColorClass(dayData.shifts) : styles.noShift}
                  ${hasEdits ? styles.hasEdits : ''}
                  ${isSelected ? styles.selected : ''}
                  ${dayData && dayData.endBalance < 0 ? styles.violation : ''}
                  ${!ui.showWeekends && isWeekend ? styles.hidden : ''}
                `}
              onClick={() => dayData && handleDayClick(dayData.day)}
            >
              <div className={styles.dayNumber}>{dayNumber}</div>

              {dayData ? (
                <div className={styles.dayContent}>
                  {/* Shift information */}
                  <div className={styles.shifts}>
                    {dayData.shifts.length > 0 ? (
                      dayData.shifts.map((shift, idx) => (
                        <span key={idx} className={styles.shiftTag}>
                          {shift}
                        </span>
                      ))
                    ) : (
                      <span className={styles.noShiftText}>-</span>
                    )}
                  </div>

                  {/* Earnings */}
                  <div className={styles.earnings}>
                    ${dayData.earnings.toFixed(0)}
                  </div>

                  {/* Balance */}
                  <div
                    className={`${styles.balance} ${getBalanceClass(dayData.endBalance)}`}
                  >
                    ${dayData.endBalance.toFixed(0)}
                  </div>

                  {/* Indicators */}
                  <div className={styles.indicators}>
                    {dayData.expenses > 0 && (
                      <div
                        className={styles.expenseIndicator}
                        title={`Expenses: $${dayData.expenses.toFixed(2)}`}
                      >
                        💸
                      </div>
                    )}
                    {dayData.deposit > 0 && (
                      <div
                        className={styles.depositIndicator}
                        title={`Deposit: $${dayData.deposit.toFixed(2)}`}
                      >
                        💰
                      </div>
                    )}
                    {hasEdits && (
                      <div className={styles.editIndicator} title="Has edits">
                        ✏️
                      </div>
                    )}
                    {ui.highlightViolations && dayData.endBalance < 0 && (
                      <div
                        className={styles.violationIndicator}
                        title="Balance violation"
                      >
                        ⚠️
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.noDataContent}>
                  <span className={styles.noDataText}>No data</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Calendar footer with statistics */}
      <div className={styles.calendarFooter}>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Work Days:</span>
            <span className={styles.statValue}>
              {currentSchedule.filter(day => day.shifts.length > 0).length}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Earnings:</span>
            <span className={styles.statValue}>
              $
              {currentSchedule
                .reduce((sum, day) => sum + day.earnings, 0)
                .toFixed(2)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Final Balance:</span>
            <span
              className={`${styles.statValue} ${getBalanceClass(currentSchedule[currentSchedule.length - 1]?.endBalance || 0)}`}
            >
              $
              {currentSchedule[currentSchedule.length - 1]?.endBalance.toFixed(
                2
              ) || '0.00'}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Violations:</span>
            <span className={styles.statValue}>
              {currentSchedule.filter(day => day.endBalance < 0).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
