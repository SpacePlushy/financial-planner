# ARCHITECTURE.md

## Tech Stack

- **React ^19.1.0**
- **TypeScript ^4.9.5**

### Key Dependencies
- @modelcontextprotocol/server-puppeteer: ^2025.5.12
- @playwright/mcp: ^0.0.29
- @testing-library/dom: ^10.4.0
- @types/node: ^16.18.126
- @types/react: ^19.1.8
- @types/react-dom: ^19.1.6
- puppeteer-core: ^24.11.2
- react: ^19.1.0
- react-dom: ^19.1.0
- react-scripts: 5.0.1

## Directory Structure
```
project/
├── src/              # Source code
├── tests/            # Test files
├── docs/             # Documentation
├── config/           # Configuration files
└── scripts/          # Build/deployment scripts
```

## Key Architectural Decisions

### [Decision 1]
**Context**: [Why this decision was needed]
**Decision**: [What was decided]
**Rationale**: [Why this approach was chosen]
**Consequences**: [Trade-offs and implications]

## Component Architecture

### [ComponentName] Structure <!-- #component-anchor -->
```typescript
// Major classes with exact line numbers
class MainClass { /* lines 100-500 */ }    // <!-- #main-class -->
class Helper { /* lines 501-600 */ }       // <!-- #helper-class -->
```

## System Flow Diagram
```
[User] -> [Frontend] -> [API] -> [Database]
           |            |
           v            v
       [Cache]     [External Service]
```

## Common Patterns

### [Pattern Name]
**When to use**: [Circumstances]
**Implementation**: [How to implement]
**Example**: [Code example with line numbers]

## Keywords <!-- #keywords -->
- architecture
- system design
- tech stack
- components
- patterns