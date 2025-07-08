// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to select elements by data-cy attribute
Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy=${value}]`);
});

// Custom command to wait for optimization to complete
Cypress.Commands.add('waitForOptimization', () => {
  // Wait for optimization to start
  cy.get('[data-testid="optimization-progress"]', { timeout: 10000 }).should('be.visible');
  
  // Wait for optimization to complete (progress reaches 100% or result appears)
  cy.get('[data-testid="optimization-result"]', { timeout: 30000 }).should('be.visible');
});

// Custom command to setup test data in localStorage
Cypress.Commands.add('setupTestData', () => {
  const testData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    schedule: {
      currentSchedule: [],
      edits: [],
      shiftTypes: {
        large: { gross: 94.5, net: 86.5 },
        medium: { gross: 75.5, net: 67.5 },
        small: { gross: 64.0, net: 56.0 }
      },
      expenses: [],
      deposits: []
    },
    configuration: {
      config: {
        generations: 100,
        populationSize: 50,
        mutationRate: 0.01,
        eliteCount: 5,
        targetEndingBalance: 10000,
        minimumBalance: 1000,
        startingBalance: 5000
      },
      presets: [],
      selectedPresetId: null
    },
    ui: {
      viewMode: 'table',
      showWeekends: true,
      highlightViolations: true
    }
  };
  
  cy.window().then((win) => {
    win.localStorage.setItem('financial-schedule-optimizer', JSON.stringify(testData));
  });
});

// Custom command to clear all application data
Cypress.Commands.add('clearAppData', () => {
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Override default visit to always clear data first
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  cy.clearAppData();
  return originalFn(url, options);
});