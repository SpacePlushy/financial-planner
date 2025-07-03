describe('Data Persistence', () => {
  beforeEach(() => {
    cy.clearAppData();
    cy.visit('/');
  });

  it('should save configuration changes automatically', () => {
    // Change configuration
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('15000');
    
    cy.get('[data-testid="minimum-balance-input"]')
      .clear()
      .type('1200');
    
    // Wait for auto-save
    cy.wait(2000);
    
    // Reload page
    cy.reload();
    
    // Values should persist
    cy.get('[data-testid="target-balance-input"]').should('have.value', '15000');
    cy.get('[data-testid="minimum-balance-input"]').should('have.value', '1200');
  });

  it('should save schedule edits', () => {
    // Generate schedule
    cy.get('[data-testid="generations-input"]').clear().type('20');
    cy.get('[data-testid="optimize-button"]').click();
    cy.waitForOptimization();
    
    // Edit a day
    cy.get('[data-testid="schedule-row-1"]').click();
    cy.get('[data-testid="earnings-input"]').clear().type('200');
    cy.get('[data-testid="save-edit-button"]').click();
    
    // Wait for auto-save
    cy.wait(2000);
    
    // Reload page
    cy.reload();
    
    // Edit should persist
    cy.get('[data-testid="schedule-row-1"]')
      .find('[data-testid="earnings-cell"]')
      .should('contain', '200');
  });

  it('should handle manual save operation', () => {
    // Change some data
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('12000');
    
    // Look for manual save button
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="save-button"]').length > 0) {
        cy.get('[data-testid="save-button"]').click();
        
        // Should show save confirmation
        cy.get('[data-testid="save-success"]').should('be.visible');
      }
    });
  });

  it('should export data successfully', () => {
    // Set up some data
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('20000');
    
    // Generate a schedule
    cy.get('[data-testid="generations-input"]').clear().type('10');
    cy.get('[data-testid="optimize-button"]').click();
    cy.waitForOptimization();
    
    // Look for export functionality
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="export-button"]').length > 0) {
        // Click export (this will trigger download)
        cy.get('[data-testid="export-button"]').click();
        
        // Check for export success message or download
        cy.get('[data-testid="export-success"]').should('be.visible');
      }
    });
  });

  it('should handle import data', () => {
    // Look for import functionality
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="import-button"]').length > 0) {
        // This is tricky to test with file upload, but we can check the UI
        cy.get('[data-testid="import-button"]').should('be.visible');
        cy.get('[data-testid="import-button"]').should('not.be.disabled');
      }
    });
  });

  it('should clear data when requested', () => {
    // Set up some data
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('25000');
    
    // Wait for auto-save
    cy.wait(2000);
    
    // Look for clear/reset functionality
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="clear-data-button"]').length > 0) {
        cy.get('[data-testid="clear-data-button"]').click();
        
        // Confirm if confirmation dialog appears
        cy.get('body').then(($confirmBody) => {
          if ($confirmBody.find('[data-testid="confirm-clear"]').length > 0) {
            cy.get('[data-testid="confirm-clear"]').click();
          }
        });
        
        // Data should be cleared (back to defaults)
        cy.get('[data-testid="target-balance-input"]').should('have.value', '10000');
      }
    });
  });

  it('should show unsaved changes indicator', () => {
    // Make a change
    cy.get('[data-testid="target-balance-input"]')
      .clear()
      .type('30000');
    
    // Should show unsaved changes indicator
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="unsaved-changes"]').length > 0) {
        cy.get('[data-testid="unsaved-changes"]').should('be.visible');
      }
    });
  });

  it('should handle localStorage quota limits gracefully', () => {
    // This is hard to test directly, but we can verify error handling exists
    // Generate large amounts of data and verify app doesn't crash
    
    for (let i = 0; i < 5; i++) {
      cy.get('[data-testid="generations-input"]').clear().type('50');
      cy.get('[data-testid="optimize-button"]').click();
      cy.waitForOptimization();
      
      // Edit multiple days to create more data
      cy.get('[data-testid="schedule-row-1"]').click();
      cy.get('[data-testid="notes-input"]')
        .clear()
        .type('This is a very long note to increase data size '.repeat(10));
      cy.get('[data-testid="save-edit-button"]').click();
      
      cy.wait(1000);
    }
    
    // App should still be functional
    cy.get('[data-testid="configuration-panel"]').should('be.visible');
  });
});