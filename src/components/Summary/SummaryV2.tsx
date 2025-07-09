import React, { useMemo, useCallback, useState } from 'react';
import { useSchedule } from '../../hooks/useSchedule';
import { useConfiguration } from '../../context/ConfigurationContext';
import { ScheduleService } from '../../services/scheduleService/ScheduleService';
import styles from './Summary.module.css';

interface SummaryProps {
  className?: string;
}

/**
 * Summary component that displays optimization results and metrics
 * Provides export functionality and print-friendly layout
 */
export const Summary: React.FC<SummaryProps> = ({ className }) => {
  const {
    currentSchedule,
    optimizationResult,
    totalEarnings,
    totalExpenses,
    totalDeposits,
    finalBalance,
    minimumBalance,
    workDayCount,
    workDays,
    countBalanceViolations,
    getViolationDays,
  } = useSchedule();

  const { config } = useConfiguration();

  const scheduleService = useMemo(() => new ScheduleService(), []);

  // Loading state for export operations
  const [isExporting, setIsExporting] = useState(false);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!currentSchedule.length) {
      return {
        totalWorkDays: 0,
        totalEarnings: 0,
        totalExpenses: 0,
        totalDeposits: 0,
        finalBalance: 0,
        minBalance: 0,
        balanceVsTarget: 0,
        violations: 0,
        violationDays: [],
        success: false,
        hasViolations: false,
      };
    }

    const violations = countBalanceViolations(config.minimumBalance);
    const violationDays = getViolationDays(config.minimumBalance);
    const balanceVsTarget = finalBalance - config.targetEndingBalance;
    const hasViolations = violations > 0;
    const success =
      !hasViolations &&
      Math.abs(balanceVsTarget) <= config.targetEndingBalance * 0.1;

    return {
      totalWorkDays: workDayCount,
      totalEarnings,
      totalExpenses,
      totalDeposits,
      finalBalance,
      minBalance: minimumBalance,
      balanceVsTarget,
      violations,
      violationDays,
      success,
      hasViolations,
    };
  }, [
    currentSchedule,
    workDayCount,
    totalEarnings,
    totalExpenses,
    totalDeposits,
    finalBalance,
    minimumBalance,
    countBalanceViolations,
    getViolationDays,
    config.minimumBalance,
    config.targetEndingBalance,
  ]);

  // Export to CSV
  const handleExportCSV = useCallback(async () => {
    if (!currentSchedule.length) return;

    setIsExporting(true);
    setTimeout(() => {
      try {
        const csvContent = scheduleService.exportSchedule(currentSchedule);
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');

        // Ensure we have a valid DOM element and document.body exists
        if (
          !link ||
          !document.body ||
          typeof document.body.appendChild !== 'function'
        ) {
          console.warn('DOM manipulation not available in this environment');
          setIsExporting(false);
          return;
        }

        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `schedule_${new Date().toISOString().split('T')[0]}.csv`
        );
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();

        // Safely remove the link
        if (link.parentNode) {
          document.body.removeChild(link);
        }

        URL.revokeObjectURL(url);
        setIsExporting(false);
      } catch (error) {
        console.error('Failed to export CSV:', error);
        setIsExporting(false);
      }
    }, 200);
  }, [currentSchedule, scheduleService]);

  // Print
  const handlePrint = useCallback(async () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 100);
  }, []);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format percentage (available if needed)
  // const formatPercentage = (value: number, total: number): string => {
  //   if (total === 0) return '0%';
  //   return `${((value / total) * 100).toFixed(1)}%`;
  // };

  if (!currentSchedule.length) {
    return (
      <div className={`${styles.summary} ${className || ''}`}>
        <div className={styles.emptyState}>
          <p>No schedule data available. Run optimization to see results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.summary} ${className || ''}`}>
      {isExporting && (
        <div className={styles.exportingMessage}>Exporting...</div>
      )}
      <div className={styles.header}>
        <h2>Optimization Summary</h2>
        <div className={styles.actions}>
          <button
            className={styles.exportButton}
            onClick={handleExportCSV}
            aria-label="Export to CSV"
            disabled={isExporting}
          >
            Export CSV
          </button>
          <button
            className={styles.printButton}
            onClick={handlePrint}
            aria-label="Print summary"
            disabled={isExporting}
          >
            Print
          </button>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {/* Work Days Card */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>📅</div>
          <div className={styles.metricContent}>
            <h3 className={styles.metricTitle}>Work Days</h3>
            <div className={styles.metricValue}>{metrics.totalWorkDays}</div>
            <div className={styles.metricSubValue}>
              {workDays.length > 0
                ? `Days: ${workDays.slice(0, 5).join(', ')}${workDays.length > 5 ? '...' : ''}`
                : 'No work days'}
            </div>
          </div>
        </div>

        {/* Earnings Card */}
        <div
          className={`${styles.metricCard} ${metrics.totalEarnings > 0 ? styles.success : ''}`}
        >
          <div className={styles.metricIcon}>💰</div>
          <div className={styles.metricContent}>
            <h3 className={styles.metricTitle}>Total Earnings</h3>
            <div className={styles.metricValue}>
              {formatCurrency(metrics.totalEarnings)}
            </div>
            <div className={styles.metricSubValue}>
              {metrics.totalWorkDays > 0
                ? `${formatCurrency(metrics.totalEarnings / metrics.totalWorkDays)}/day`
                : 'No earnings'}
            </div>
          </div>
        </div>

        {/* Final Balance Card */}
        <div
          className={`${styles.metricCard} ${
            metrics.finalBalance >= config.targetEndingBalance
              ? styles.success
              : metrics.finalBalance >= config.targetEndingBalance * 0.9
                ? styles.warning
                : styles.error
          }`}
        >
          <div className={styles.metricIcon}>💵</div>
          <div className={styles.metricContent}>
            <h3 className={styles.metricTitle}>Final Balance</h3>
            <div className={styles.metricValue}>
              {formatCurrency(metrics.finalBalance)}
            </div>
            <div
              className={`${styles.metricSubValue} ${
                metrics.balanceVsTarget >= 0 ? styles.positive : styles.negative
              }`}
            >
              {metrics.balanceVsTarget >= 0 ? '+' : ''}
              {formatCurrency(metrics.balanceVsTarget)}
            </div>
          </div>
        </div>

        {/* Violations Card */}
        <div
          className={`${styles.metricCard} ${metrics.hasViolations ? styles.error : styles.success}`}
        >
          <div className={styles.metricIcon}>
            {metrics.hasViolations ? '⚠️' : '✅'}
          </div>
          <div className={styles.metricContent}>
            <h3 className={styles.metricTitle}>Violations</h3>
            <div className={styles.metricValue}>{metrics.violations}</div>
            <div className={styles.metricSubValue}>
              {metrics.hasViolations
                ? `Days: ${metrics.violationDays.slice(0, 5).join(', ')}${metrics.violationDays.length > 5 ? '...' : ''}`
                : 'All constraints met'}
            </div>
          </div>
        </div>

        {/* Optimization Info Card */}
        {optimizationResult && (
          <div className={styles.metricCard}>
            <h3 className={styles.metricTitle}>Optimization Details</h3>
            <div className={styles.metricDetails}>
              <span className={styles.metricLabel}>Computation time:</span>
              <span className={styles.metricSubValue}>
                {optimizationResult.computationTime || 'N/A'}
              </span>
            </div>
            <div className={styles.metricDetails}>
              <span className={styles.metricLabel}>Population size:</span>
              <span className={styles.metricSubValue}>
                {config.populationSize}
              </span>
            </div>
            <div className={styles.metricDetails}>
              <span className={styles.metricLabel}>Generations:</span>
              <span className={styles.metricSubValue}>
                {config.generations}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Status */}
      <div
        className={`${styles.summaryStatus} ${metrics.success ? styles.success : ''}`}
      >
        {metrics.success ? (
          <div className={styles.statusMessage}>
            <span className={styles.statusIcon}>✓</span>
            <span>Optimization successful! All targets met.</span>
          </div>
        ) : (
          <div className={styles.statusMessage}>
            <span className={styles.statusIcon}>!</span>
            <span>
              {metrics.hasViolations
                ? `${metrics.violations} constraint violation${metrics.violations > 1 ? 's' : ''} found.`
                : 'Target balance not achieved within acceptable range.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;
