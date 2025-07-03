describe('Schedule Editing', () => {
  beforeEach(() => {
    cy.visit('/');
    // Generate a basic schedule first
    cy.get('[data-testid="generations-input"]')
      .clear()
      .type('20');
    cy.get('[data-testid="optimize-button"]').click();
    cy.waitForOptimization();
  });

  it('should open edit modal when clicking on a schedule row', () => {
    // Click on first schedule row
    cy.get('[data-testid="schedule-row-1"]').click();
    
    // Edit modal should open
    cy.get('[data-testid="edit-modal"]').should('be.visible');
    cy.get('[data-testid="modal-title"]').should('contain', 'Edit Day 1');
  });

  it('should allow editing earnings', () => {
    // Open edit modal for day 1
    cy.get('[data-testid="schedule-row-1"]').click();
    
    // Edit earnings
    cy.get('[data-testid="earnings-input"]')
      .clear()
      .type('100');
    
    // Save changes
    cy.get('[data-testid="save-edit-button"]').click();
    
    // Modal should close
    cy.get('[data-testid="edit-modal"]').should('not.exist');
    
    // Schedule should be updated
    cy.get('[data-testid="schedule-row-1"]')
      .find('[data-testid="earnings-cell"]')
      .should('contain', '100');
  });

  it('should allow editing expenses', () => {
    // Open edit modal for day 1
    cy.get('[data-testid="schedule-row-1"]').click();
    
    // Edit expenses
    cy.get('[data-testid="expenses-input"]')
      .clear()
      .type('50');
    
    // Save changes
    cy.get('[data-testid="save-edit-button"]').click();
    
    // Schedule should be updated
    cy.get('[data-testid="schedule-row-1"]')
      .find('[data-testid="expenses-cell"]')
      .should('contain', '50');
  });

  it('should validate edit inputs', () => {
    // Open edit modal
    cy.get('[data-testid="schedule-row-1"]').click();
    
    // Try to enter negative earnings
    cy.get('[data-testid="earnings-input"]')
      .clear()
      .type('-100');
    
    // Save should be disabled or show validation error
    cy.get('[data-testid="save-edit-button"]').should('be.disabled');
    
    // Or check for validation message
    cy.get('[data-testid="validation-error"]').should('be.visible');
  });

  it('should cancel edits when clicking cancel', () => {
    // Get original earnings value
    cy.get('[data-testid="schedule-row-1"]')
      .find('[data-testid="earnings-cell"]')
      .invoke('text')
      .then((originalValue) => {
        // Open edit modal
        cy.get('[data-testid="schedule-row-1"]').click();
        
        // Make a change
        cy.get('[data-testid="earnings-input"]')
          .clear()
          .type('999');
        
        // Cancel
        cy.get('[data-testid="cancel-edit-button"]').click();
        
        // Modal should close and value should be unchanged
        cy.get('[data-testid="edit-modal"]').should('not.exist');
        cy.get('[data-testid="schedule-row-1"]')
          .find('[data-testid="earnings-cell"]')
          .should('contain', originalValue);
      });
  });

  it('should recalculate balances after editing', () => {
    // Get original balance for day 2
    cy.get('[data-testid="schedule-row-2"]')
      .find('[data-testid="balance-cell"]')
      .invoke('text')
      .then((originalBalance) => {
        // Edit day 1 earnings
        cy.get('[data-testid="schedule-row-1"]').click();
        cy.get('[data-testid="earnings-input"]')
          .clear()
          .type('200');
        cy.get('[data-testid="save-edit-button"]').click();
        
        // Day 2 balance should be recalculated
        cy.get('[data-testid="schedule-row-2"]')
          .find('[data-testid="balance-cell"]')
          .should('not.contain', originalBalance);
      });
  });

  it('should show edit indicators for modified days', () => {
    // Edit a day
    cy.get('[data-testid="schedule-row-1"]').click();
    cy.get('[data-testid="earnings-input"]')
      .clear()
      .type('150');
    cy.get('[data-testid="save-edit-button"]').click();
    
    // Should show edit indicator
    cy.get('[data-testid="schedule-row-1"]')
      .find('[data-testid="edit-indicator"]')
      .should('be.visible');
  });

  it('should allow adding notes to a day', () => {
    // Open edit modal
    cy.get('[data-testid="schedule-row-1"]').click();
    
    // Add notes
    cy.get('[data-testid="notes-input"]')
      .clear()
      .type('This is a test note');
    
    // Save
    cy.get('[data-testid="save-edit-button"]').click();
    
    // Notes should be saved (check tooltip or notes indicator)
    cy.get('[data-testid="schedule-row-1"]')
      .find('[data-testid="notes-indicator"]')
      .should('be.visible');
  });

  it('should handle multiple edits correctly', () => {
    // Edit multiple days
    cy.get('[data-testid="schedule-row-1"]').click();
    cy.get('[data-testid="earnings-input"]').clear().type('100');
    cy.get('[data-testid="save-edit-button"]').click();
    
    cy.get('[data-testid="schedule-row-2"]').click();
    cy.get('[data-testid="expenses-input"]').clear().type('25');
    cy.get('[data-testid="save-edit-button"]').click();
    
    cy.get('[data-testid="schedule-row-3"]').click();
    cy.get('[data-testid="earnings-input"]').clear().type('75');
    cy.get('[data-testid="save-edit-button"]').click();
    
    // All edits should be applied
    cy.get('[data-testid="schedule-row-1"]')
      .find('[data-testid="earnings-cell"]')
      .should('contain', '100');
    cy.get('[data-testid="schedule-row-2"]')
      .find('[data-testid="expenses-cell"]')
      .should('contain', '25');
    cy.get('[data-testid="schedule-row-3"]')
      .find('[data-testid="earnings-cell"]')
      .should('contain', '75');
  });
});