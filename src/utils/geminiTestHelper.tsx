/**
 * Test utility for demonstrating Gemini Code Assist capabilities
 * This file contains various code patterns to test AI code review
 */

import React from 'react';
import styles from './ImprovedComponent.module.css';

// This function has been fixed based on Gemini's feedback
export function calculateInterest(
  principal: number,
  rate: number,
  time: number
): number {
  // Added input validation as suggested by Gemini
  if (principal <= 0 || rate < 0 || time <= 0) {
    throw new Error(
      'Invalid parameters for interest calculation. All values must be positive.'
    );
  }
  // Added proper error handling
  return principal * rate * time;
}

// This function has better practices
export interface LoanCalculationParams {
  principal: number;
  annualRate: number;
  years: number;
}

export interface LoanCalculationResult {
  totalAmount: number;
  totalInterest: number;
  monthlyPayment: number;
}

export function calculateLoanPayment(
  params: LoanCalculationParams
): LoanCalculationResult {
  const { principal, annualRate, years } = params;

  // Input validation
  if (principal <= 0 || annualRate < 0 || years <= 0) {
    throw new Error('Invalid loan parameters');
  }

  const monthlyRate = annualRate / 12;
  const numberOfPayments = years * 12;

  // Calculate monthly payment using standard loan formula
  const monthlyPayment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  const totalAmount = monthlyPayment * numberOfPayments;
  const totalInterest = totalAmount - principal;

  return {
    totalAmount,
    totalInterest,
    monthlyPayment,
  };
}

// This React component has been fixed based on Gemini's feedback

interface ImprovedComponentProps {
  data: Array<{ id: string | number; name: string }>; // Fixed: Proper typing instead of 'any'
}

export const ImprovedComponent: React.FC<ImprovedComponentProps> = ({
  data,
}) => {
  // Fixed: Using React state instead of direct DOM manipulation
  const [title, setTitle] = React.useState('Financial Data');

  React.useEffect(() => {
    setTitle('Updated Title');
  }, []);

  // Fixed: Added error handling for data validation
  if (!Array.isArray(data)) {
    return <div className={styles.error}>Invalid data provided</div>;
  }

  return (
    <div className={styles['improved-component']}>
      {' '}
      {/* Fixed: Using CSS modules instead of inline styles */}
      <h1>{title}</h1>{' '}
      {/* Fixed: Using state instead of direct DOM manipulation */}
      <ul>
        {data.map(item => (
          <li key={item.id}>{item.name}</li> // Fixed: Added key prop
        ))}
      </ul>
    </div>
  );
};

// This component follows better practices
interface FinancialDataProps {
  data: Array<{
    id: string;
    name: string;
    value: number;
  }>;
  onItemClick?: (id: string) => void;
}

export const FinancialDataComponent: React.FC<FinancialDataProps> = ({
  data,
  onItemClick,
}) => {
  const handleItemClick = React.useCallback(
    (id: string) => {
      onItemClick?.(id);
    },
    [onItemClick]
  );

  if (!data || data.length === 0) {
    return <div className="no-data">No financial data available</div>;
  }

  return (
    <div className="financial-data">
      <h2>Financial Summary</h2>
      <ul className="data-list">
        {data.map(item => (
          <li
            key={item.id}
            className="data-item"
            onClick={() => handleItemClick(item.id)}
          >
            <span className="item-name">{item.name}</span>
            <span className="item-value">${item.value.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
