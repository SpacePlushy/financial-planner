describe('Basic Smoke Test', () => {
  it('should load the application and show main components', () => {
    cy.visit('/');
    
    // Check that the main heading is visible
    cy.contains('Financial Schedule Optimizer').should('be.visible');
    
    // Basic components should be present
    cy.get('body').should('be.visible');
    
    // Wait a moment for any async loading
    cy.wait(1000);
    
    // Page should be interactive
    cy.get('input').first().should('be.visible');
  });
});