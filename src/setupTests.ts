// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Ensure DOM is properly set up for tests
import { configure } from '@testing-library/react';

// Setup DOM for Jest
import { TextEncoder, TextDecoder } from 'util';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  // Reset console mocks for each test
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock import.meta.url for Jest
(global as any).import = {
  meta: {
    url: 'file:///mock/path/to/file.js',
  },
};

// Polyfills for Jest environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set up DOM globals
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Cleanup function for tests
export const cleanup = () => {
  if (document.body) {
    document.body.innerHTML = '';
  }
};

// Mock the worker factory globally to prevent import.meta issues
jest.mock('./workers/workerFactory', () => ({
  createOptimizerWorker: jest.fn(() => {
    // Return a mock worker with the required interface
    return {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      onmessage: null,
      onmessageerror: null,
      onerror: null,
    };
  }),
}));

// Mock Worker constructor globally for any direct usage
global.Worker = jest.fn().mockImplementation(() => {
  const MockWorker = require('./workers/__mocks__/optimizer.worker').default;
  return new MockWorker();
});
