/**
 * Test utility for demonstrating Gemini Code Assist capabilities
 * This file contains various code patterns to test AI code review
 */

import React from 'react';

// This function has several issues that Gemini should catch
export function calculateInterest(
  principal: any,
  rate: any,
  time: any
): number {
  // No input validation
  // Using 'any' types instead of proper TypeScript
  // No error handling
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

// This React component has some issues

interface BadComponentProps {
  data: any; // Should be properly typed
}

export const BadComponent: React.FC<BadComponentProps> = ({ data }) => {
  // No error handling
  // Direct DOM manipulation (anti-pattern in React)
  // Missing key props in list
  // Inline styles instead of CSS modules

  React.useEffect(() => {
    document.getElementById('title').innerHTML = 'Updated Title';
  }, []);

  return (
    <div style={{ color: 'red', fontSize: '14px' }}>
      <h1 id="title">Financial Data</h1>
      <ul>
        {data.map(item => (
          <li>{item.name}</li>
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
