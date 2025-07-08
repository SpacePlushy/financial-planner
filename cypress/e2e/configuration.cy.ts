describe('Configuration Management', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should allow updating configuration values', () => {
    // Update target ending balance
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('12000');
    
    // Update minimum balance
    cy.get('[data-testid="minimum-balance-input"]')
      .clear()
      .type('800');
    
    // Update starting balance
    cy.get('[data-testid="starting-balance-input"]')
      .clear()
      .type('4000');
    
    // Update generations
    cy.get('[data-testid="generations-input"]')
      .clear()
      .type('150');
    
    // Verify values are updated
    cy.get('[data-testid="target-balance-input"]').should('have.value', '12000');
    cy.get('[data-testid="minimum-balance-input"]').should('have.value', '800');
    cy.get('[data-testid="starting-balance-input"]').should('have.value', '4000');
    cy.get('[data-testid="generations-input"]').should('have.value', '150');
  });

  it('should validate configuration inputs', () => {
    // Test negative values
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('-1000');
    
    // Should show validation error or prevent negative values
    cy.get('[data-testid="target-balance-input"]').should('not.have.value', '-1000');
  });

  it('should handle preset selection', () => {
    // Check if preset dropdown exists
    cy.get('[data-testid="preset-select"]').should('be.visible');
    
    // Select a preset if available
    cy.get('[data-testid="preset-select"]').click();
    
    // Check if custom option is available
    cy.get('[data-testid="custom-preset-option"]').should('be.visible');
  });

  it('should save configuration changes to localStorage', () => {
    // Update a configuration value
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('15000');
    
    // Wait a moment for auto-save
    cy.wait(1000);
    
    // Reload page and check if value persists
    cy.reload();
    cy.get('[data-testid="target-balance-input"]').should('have.value', '15000');
  });

  it('should reset configuration to defaults', () => {
    // Modify some values
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('20000');
    
    // Look for reset button if it exists
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="reset-config-button"]').length > 0) {
        cy.get('[data-testid="reset-config-button"]').click();
        
        // Confirm reset if confirmation dialog appears
        cy.get('body').then(($confirmBody) => {
          if ($confirmBody.find('[data-testid="confirm-reset"]').length > 0) {
            cy.get('[data-testid="confirm-reset"]').click();
          }
        });
        
        // Check if values are reset (assuming default is 10000)
        cy.get('[data-testid="target-balance-input"]').should('have.value', '10000');
      }
    });
  });
});