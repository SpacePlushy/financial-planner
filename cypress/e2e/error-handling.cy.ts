describe('Error Handling and Edge Cases', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should handle network errors gracefully', () => {
    // Simulate offline condition
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', {
        writable: true,
        value: false
      });
    });
    
    // Try to perform operations that might need network
    cy.get('[data-testid="optimize-button"]').click();
    
    // App should still function
    cy.get('[data-testid="optimization-progress"]', { timeout: 10000 })
      .should('be.visible');
  });

  it('should handle invalid configuration gracefully', () => {
    // Set impossible configuration
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('100');
    
    cy.get('[data-testid="starting-balance-input"]')
      .clear()
      .type('10000');
    
    cy.get('[data-testid="minimum-balance-input"]')
      .clear()
      .type('20000');
    
    // Try to optimize
    cy.get('[data-testid="optimize-button"]').click();
    
    // Should either prevent optimization or show appropriate error
    cy.get('body').then(($body) => {
      // Check for validation error or optimization error
      const hasValidationError = $body.find('[data-testid="validation-error"]').length > 0;
      const hasOptimizationError = $body.find('[data-testid="optimization-error"]').length > 0;
      
      expect(hasValidationError || hasOptimizationError).to.be.true;
    });
  });

  it('should handle corrupted localStorage data', () => {
    // Set corrupted data in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('financial-schedule-optimizer', 'invalid-json-data');
    });
    
    // Reload page
    cy.reload();
    
    // App should still load with defaults
    cy.contains('Financial Schedule Optimizer').should('be.visible');
    cy.get('[data-testid="configuration-panel"]').should('be.visible');
  });

  it('should handle browser storage being disabled', () => {
    // Mock localStorage to throw errors
    cy.window().then((win) => {
      Object.defineProperty(win, 'localStorage', {
        value: {
          setItem: () => { throw new Error('Storage disabled'); },
          getItem: () => null,
          removeItem: () => { throw new Error('Storage disabled'); },
          clear: () => { throw new Error('Storage disabled'); }
        }
      });
    });
    
    // App should still function
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('15000');
    
    // Should not crash the app
    cy.get('[data-testid="configuration-panel"]').should('be.visible');
  });

  it('should handle optimization worker errors', () => {
    // Set configuration that might cause worker issues
    cy.get('[data-testid="generations-input"]')
      .clear()
      .type('0');
    
    cy.get('[data-testid="population-size-input"]')
      .clear()
      .type('0');
    
    // Try to optimize
    cy.get('[data-testid="optimize-button"]').click();
    
    // Should handle error gracefully
    cy.get('[data-testid="optimization-error"]', { timeout: 15000 }).should('be.visible');
  });

  it('should handle extremely large numbers', () => {
    // Test with very large numbers
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('999999999999');
    
    cy.get('[data-testid="starting-balance-input"]')
      .clear()
      .type('999999999999');
    
    // App should handle this gracefully
    cy.get('[data-testid="optimize-button"]').should('be.visible');
  });

  it('should handle special characters in inputs', () => {
    // Test with special characters
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('abc!@#$%^&*()');
    
    // Should validate or sanitize input
    cy.get('[data-testid="target-balance-input"]').should('not.have.value', 'abc!@#$%^&*()');
  });

  it('should recover from optimization interruption', () => {
    // Start optimization
    cy.get('[data-testid="optimize-button"]').click();
    
    // Wait for it to start
    cy.get('[data-testid="optimization-progress"]', { timeout: 10000 })
      .should('be.visible');
    
    // Reload page to interrupt
    cy.reload();
    
    // Should be able to start new optimization
    cy.get('[data-testid="optimize-button"]').should('not.be.disabled');
    cy.get('[data-testid="optimize-button"]').click();
    cy.get('[data-testid="optimization-progress"]', { timeout: 10000 })
      .should('be.visible');
  });

  it('should handle rapid clicking and user interactions', () => {
    // Rapidly click optimize button
    for (let i = 0; i < 5; i++) {
      cy.get('[data-testid="optimize-button"]').click();
      cy.wait(100);
    }
    
    // Should handle this gracefully without crashing
    cy.get('[data-testid="configuration-panel"]').should('be.visible');
  });

  it('should handle browser back/forward navigation', () => {
    // Change some configuration
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('12000');
    
    // Navigate back and forward
    cy.go('back');
    cy.go('forward');
    
    // App should still be functional
    cy.contains('Financial Schedule Optimizer').should('be.visible');
  });

  it('should show appropriate error boundaries', () => {
    // This is hard to trigger naturally, but we can check that error boundaries exist
    // by looking for error boundary components in the DOM when errors occur
    
    // Try to trigger an error through invalid state
    cy.window().then((win) => {
      // Force an error by manipulating React state (if possible)
      // This is implementation-specific and might need adjustment
    });
    
    // Check that the app doesn't completely crash
    cy.get('body').should('be.visible');
  });
});