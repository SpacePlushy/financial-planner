import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { UIProvider } from '../context/UIContext';
import { ScheduleProvider } from '../context/ScheduleContext';
import { ConfigurationProvider } from '../context/ConfigurationContext';
import { ProgressProvider } from '../context/ProgressContext';
import { PersistenceProvider } from '../context/PersistenceContext';

/**
 * Test wrapper component that provides all necessary contexts
 */
interface AllTheProvidersProps {
  children: ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <UIProvider>
      <ScheduleProvider>
        <ConfigurationProvider>
          <ProgressProvider>
            <PersistenceProvider>{children}</PersistenceProvider>
          </ProgressProvider>
        </ConfigurationProvider>
      </ScheduleProvider>
    </UIProvider>
  );
};

/**
 * Custom render function that wraps components with all providers
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

/**
 * Lightweight wrapper for components that only need minimal providers
 */
const MinimalProviders = ({ children }: { children: ReactNode }) => {
  return <UIProvider>{children}</UIProvider>;
};

/**
 * Custom render function with minimal providers
 */
const renderWithMinimalProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: MinimalProviders, ...options });

/**
 * Custom render function for isolated component testing (no providers)
 */
const renderIsolated = (ui: ReactElement, options?: RenderOptions) => {
  // Ensure we have a clean DOM container for each test
  const container = document.createElement('div');
  document.body.appendChild(container);

  const result = render(ui, { container, ...options });

  return result;
};

// Re-export everything
export * from '@testing-library/react';
export {
  customRender as render,
  renderWithMinimalProviders,
  renderIsolated,
  AllTheProviders,
  MinimalProviders,
};
