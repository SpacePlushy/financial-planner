describe('Schedule Optimization', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should start optimization process', () => {
    // Set basic configuration
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('10000');
    
    cy.get('[data-testid="starting-balance-input"]')
      .clear()
      .type('5000');
    
    // Start optimization
    cy.get('[data-testid="optimize-button"]').click();
    
    // Should show optimization progress
    cy.get('[data-testid="optimization-progress"]', { timeout: 10000 })
      .should('be.visible');
    
    // Progress should show generation information
    cy.get('[data-testid="generation-counter"]').should('be.visible');
    cy.get('[data-testid="progress-bar"]').should('be.visible');
  });

  it('should display optimization results', () => {
    // Set a simple configuration for faster optimization
    cy.get('[data-testid="generations-input"]')
      .clear()
      .type('20');
    
    cy.get('[data-testid="population-size-input"]')
      .clear()
      .type('10');
    
    // Start optimization
    cy.get('[data-testid="optimize-button"]').click();
    
    // Wait for optimization to complete
    cy.waitForOptimization();
    
    // Should show results
    cy.get('[data-testid="optimization-result"]').should('be.visible');
    cy.get('[data-testid="final-balance"]').should('be.visible');
    cy.get('[data-testid="work-days-count"]').should('be.visible');
  });

  it('should be able to stop optimization', () => {
    // Set longer optimization
    cy.get('[data-testid="generations-input"]')
      .clear()
      .type('200');
    
    // Start optimization
    cy.get('[data-testid="optimize-button"]').click();
    
    // Wait for optimization to start
    cy.get('[data-testid="optimization-progress"]', { timeout: 10000 })
      .should('be.visible');
    
    // Stop optimization
    cy.get('[data-testid="stop-optimization-button"]').click();
    
    // Should show stopped state
    cy.get('[data-testid="optimization-stopped"]').should('be.visible');
  });

  it('should update progress during optimization', () => {
    // Start optimization
    cy.get('[data-testid="optimize-button"]').click();
    
    // Wait for optimization to start
    cy.get('[data-testid="optimization-progress"]', { timeout: 10000 })
      .should('be.visible');
    
    // Check that generation counter increases
    cy.get('[data-testid="generation-counter"]')
      .invoke('text')
      .then((initialValue) => {
        cy.wait(2000);
        cy.get('[data-testid="generation-counter"]')
          .invoke('text')
          .should('not.eq', initialValue);
      });
  });

  it('should show fitness improvement over time', () => {
    // Start optimization
    cy.get('[data-testid="optimize-button"]').click();
    
    // Wait for optimization to start
    cy.get('[data-testid="optimization-progress"]', { timeout: 10000 })
      .should('be.visible');
    
    // Should show best fitness value
    cy.get('[data-testid="best-fitness"]').should('be.visible');
    
    // Wait for some progress and check fitness changes
    cy.wait(3000);
    cy.get('[data-testid="fitness-chart"]').should('be.visible');
  });

  it('should handle optimization errors gracefully', () => {
    // Set invalid configuration that might cause errors
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('0');
    
    cy.get('[data-testid="starting-balance-input"]')
      .clear()
      .type('0');
    
    // Try to start optimization
    cy.get('[data-testid="optimize-button"]').click();
    
    // Should either prevent optimization or show error
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="optimization-error"]').length > 0) {
        cy.get('[data-testid="optimization-error"]').should('be.visible');
      } else {
        // Optimization might be prevented by validation
        cy.get('[data-testid="validation-error"]').should('be.visible');
      }
    });
  });
});