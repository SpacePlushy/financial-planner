describe('Application Loading', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the application successfully', () => {
    // Check that the main heading is visible
    cy.contains('Financial Schedule Optimizer').should('be.visible');
    
    // Check that main components are rendered
    cy.get('[data-testid="configuration-panel"]').should('be.visible');
    cy.get('[data-testid="schedule-table"]').should('be.visible');
    cy.get('[data-testid="summary-panel"]').should('be.visible');
  });

  it('should handle loading states properly', () => {
    // Visit with test data
    cy.setupTestData();
    cy.visit('/');
    
    // Should not show loading spinner after data is loaded
    cy.get('.app-loading').should('not.exist');
    
    // All components should be visible
    cy.get('[data-testid="configuration-panel"]').should('be.visible');
    cy.get('[data-testid="schedule-table"]').should('be.visible');
  });

  it('should have proper page title and meta information', () => {
    cy.title().should('include', 'Financial Schedule Optimizer');
  });

  it('should be responsive on different viewport sizes', () => {
    // Test desktop view
    cy.viewport(1280, 720);
    cy.get('[data-testid="configuration-panel"]').should('be.visible');
    
    // Test tablet view
    cy.viewport(768, 1024);
    cy.get('[data-testid="configuration-panel"]').should('be.visible');
    
    // Test mobile view
    cy.viewport(375, 667);
    cy.get('[data-testid="configuration-panel"]').should('be.visible');
  });

  it('should handle browser refresh gracefully', () => {
    // Set some configuration
    cy.get('[data-testid="target-balance-input"]').clear().type('15000');
    
    // Refresh the page
    cy.reload();
    
    // Application should load without errors
    cy.contains('Financial Schedule Optimizer').should('be.visible');
  });
});