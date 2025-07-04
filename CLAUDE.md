# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Financial Schedule Optimizer is a React TypeScript application that uses genetic algorithms to optimize work schedules based on financial constraints. The app helps users balance work days with financial goals while maintaining minimum balance requirements.

## Key Architecture

### Context Architecture
The app uses React Context API with a layered architecture:
- **UIProvider**: Theme, modals, error handling, view modes
- **ScheduleProvider**: Core schedule state with middleware support
- **ConfigurationProvider**: Optimization settings with reducer pattern
- **ProgressProvider**: Real-time optimization progress tracking
- **PersistenceProvider**: Local storage and import/export functionality

All contexts wrap the app in a specific order (see src/App.tsx:270-290).

### Genetic Algorithm Engine
- **GeneticOptimizer** (src/services/geneticOptimizer/GeneticOptimizer.ts): Main optimization engine with crisis mode detection for extreme financial constraints
- **FitnessManager** (src/services/geneticOptimizer/FitnessManager.ts): Strategy pattern for fitness evaluation
- **ScheduleService** (src/services/scheduleService/ScheduleService.ts): Schedule manipulation and validation

The optimizer runs in a Web Worker (src/workers/optimizer.worker.ts) to prevent UI blocking.

### Component Structure
Components follow a V2 pattern with enhanced features:
- Original components in ComponentName.tsx
- Enhanced versions in ComponentNameV2.tsx
- All components have corresponding .module.css files
- Components are wrapped with ErrorBoundary for fault tolerance

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start                  # Runs on http://localhost:3000

# Run tests
npm test                    # Interactive watch mode
npm test -- --coverage     # With coverage report
npm test -- --watchAll=false  # Single run
npm test -- ConfigurationPanel.test  # Run specific test file

# Linting
npm run lint              # Check for issues
npm run lint:fix         # Auto-fix issues

# Code Formatting
npx prettier --write .    # Format all files
npx prettier --check .    # Check formatting without changes

# Build
npm run build            # Production build

# IMPORTANT: Pre-Push Checklist
# Before pushing to remote repositories, always run:
# 1. `npm run build` - Ensures the build succeeds and catches TypeScript/ESLint errors
# 2. `npm run lint` - Checks for any linting issues
# 3. `npm test -- --watchAll=false` - Runs all tests once
# The CI/CD pipeline will fail if any of these fail, so test locally first!

# Deployment
vercel                   # Deploy to Vercel (production)
vercel --prod           # Deploy to production domain

# E2E Testing
npm run cypress:open     # Interactive Cypress
npm run cypress:run      # Headless Cypress
npm run e2e             # Start server and run E2E tests
npm run e2e:open        # Start server and open Cypress

# Server Management (for production-like testing)
# IMPORTANT: The user controls the server at all times. Always ask before starting/restarting the server.
npm run server:start     # Start server in development mode
npm run server:start:prod # Start server with production build
npm run server:stop      # Stop server
npm run server:status    # Check server status
npm run server:logs      # View server logs
```

## Testing Strategy

### Unit Tests
- Jest with React Testing Library
- Coverage threshold: 80% for all metrics
- Mock workers in src/workers/__mocks__/
- Run specific test: `npm test -- ConfigurationPanel.test`

### E2E Tests
- Cypress tests in cypress/e2e/
- Test data fixtures in cypress/fixtures/
- Custom commands in cypress/support/commands.ts

### Integration Tests
- Located in src/__tests__/integration/
- Test complete workflows and context interactions

## Key Features & Implementation Details

### Optimization Process
1. User configures settings in ConfigurationPanel
2. useOptimizer hook manages optimization lifecycle
3. GeneticOptimizer runs in Web Worker
4. Progress updates via postMessage to ProgressContext
5. Results automatically update ScheduleContext

### Edit Management
- useEdits hook provides undo/redo functionality
- Conflict resolution for overlapping edits
- Batch operations for performance
- Edit persistence across sessions

### Financial Calculations
- Balance tracking with deposits and expenses
- Crisis mode detection when required earnings exceed capacity
- Multiple fitness strategies (standard, high earning)
- Manual constraints support for fixed days/balances

### Performance Optimizations
- Memoization in useSchedule hook
- Virtual scrolling helpers for large schedules
- Debounced updates for rapid changes
- Web Worker for non-blocking optimization

## Important Patterns

### Error Handling
- ErrorBoundary components at multiple levels (page, section, component)
- Comprehensive logging with src/utils/logger.ts
- User-friendly error messages via UIContext

### State Management
- Reducer pattern for complex state (ConfigurationContext)
- Middleware support for cross-cutting concerns
- Optimistic updates with rollback capability

### Testing Patterns
- Render helpers with all required providers
- Mock implementations for external dependencies
- Accessibility testing with ARIA queries
- Performance testing for memoization

## Configuration Files

- **jest.config.js**: Test configuration with coverage thresholds
- **cypress.config.ts**: E2E test configuration
- **.eslintrc.js**: Linting rules
- **.prettierrc**: Code formatting
- **.github/workflows/ci.yml**: CI/CD pipeline with matrix testing

## Worker Communication

The optimizer uses Web Workers with specific message protocols:
- **Worker location**: src/workers/optimizer.worker.ts
- **Message types**: 'start', 'progress', 'complete', 'error'
- **Mock for testing**: src/workers/__mocks__/optimizer.worker.ts
- Progress updates are throttled to prevent UI overwhelm

## Environment Variables

React app environment variables must be prefixed with `REACT_APP_`:
- Development: `.env.local` (gitignored)
- Production: Set in deployment platform (e.g., Vercel)

## Current Implementation Status

The project is 87% complete (see implementation_plan.md for details):
- Core functionality fully implemented
- Comprehensive test coverage
- CI/CD pipeline configured
- Some UI enhancements and documentation remaining