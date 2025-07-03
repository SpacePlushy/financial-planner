# Code Style Guide for Financial Schedule Optimizer

## Project Overview
This is a React TypeScript application that uses genetic algorithms to optimize work schedules based on financial constraints.

## Coding Standards

### TypeScript
- Use strict TypeScript settings
- Avoid `any` types - use proper type definitions
- Prefer interfaces over types for object shapes
- Use generic types for reusable components

### React Best Practices
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization where appropriate
- Follow the Context API patterns established in the project

### Code Organization
- Keep components focused and single-purpose
- Use custom hooks for complex logic
- Follow the established directory structure:
  - Components in `src/components/`
  - Contexts in `src/context/`
  - Services in `src/services/`
  - Utils in `src/utils/`

### Performance
- Avoid unnecessary re-renders
- Use useMemo and useCallback appropriately
- Implement proper loading states
- Consider Web Workers for heavy computations (like genetic algorithms)

### Testing
- Write unit tests for utilities and services
- Write integration tests for complex workflows
- Maintain >80% test coverage
- Use React Testing Library patterns

### Comments and Documentation
- Document complex algorithms (especially genetic optimizer logic)
- Use JSDoc for public APIs
- Explain business logic clearly
- Document any performance optimizations

### Security
- Never log sensitive financial data
- Sanitize user inputs
- Use proper error handling without exposing internals

### Git Practices
- Write clear commit messages
- Keep commits focused and atomic
- Reference issues in commit messages when applicable

## Project-Specific Guidelines

### Financial Calculations
- Always use proper number precision for financial calculations
- Handle edge cases like negative balances
- Validate financial constraints thoroughly

### Genetic Algorithm Code
- Document fitness functions clearly
- Explain crossover and mutation strategies
- Include performance metrics and optimization notes

### UI/UX
- Maintain consistent styling with CSS modules
- Ensure accessibility compliance
- Provide clear loading and error states
- Support both light and dark themes