# Logging System Documentation

## Overview

The Financial Schedule Optimizer includes a comprehensive logging system for debugging and monitoring application behavior. The logging system provides:

- **Context-aware logging** - Track which part of the application generated each log
- **Action logging** - Monitor state changes with before/after snapshots
- **Performance tracking** - Identify slow operations
- **Flexible filtering** - Find relevant logs quickly
- **Export capabilities** - Save logs for bug reports

## Configuration

### Environment Variables

Configure logging behavior through environment variables in your `.env` file:

```env
# Enable logging in production (default: false)
REACT_APP_ENABLE_LOGGING=true

# Disable logging entirely (overrides REACT_APP_ENABLE_LOGGING)
REACT_APP_DISABLE_LOGGING=false

# Enable state diff logging (can be verbose)
REACT_APP_LOG_STATE_DIFF=true
```

### Programmatic Configuration

You can also configure the logger programmatically:

```typescript
import { logger, LogLevel } from './utils/logger';

logger.configure({
  enabled: true,
  minLevel: LogLevel.INFO,
  enableConsole: true,
  maxLogSize: 1000,
  performanceThreshold: 100, // ms
});
```

## Usage

### Basic Logging

```typescript
import { logger } from './utils/logger';

// Log at different levels
logger.debug('MyComponent', 'Debug information', { userId: 123 });
logger.info('MyComponent', 'User logged in successfully');
logger.warn('MyComponent', 'API rate limit approaching');
logger.error('MyComponent', 'Failed to fetch data', error, { endpoint: '/api/data' });
```

### Context Integration

The logging middleware is automatically integrated with:

- **ScheduleContext** - Logs all schedule-related actions
- **ConfigurationContext** - Logs configuration changes

Example log output:
```
[2024-01-15T10:30:45.123Z] [INFO] [ScheduleContext] Action: SET_CURRENT_SCHEDULE (12ms)
[2024-01-15T10:30:45.456Z] [INFO] [ConfigurationContext] Action: UPDATE_CONFIG (5ms)
```

### Performance Monitoring

Actions taking longer than the configured threshold are automatically flagged:

```typescript
// Configure performance threshold
logger.configure({ performanceThreshold: 50 }); // 50ms

// Slow actions will generate warnings
// [WARN] [ScheduleContext] Slow action detected: APPLY_EDITS took 125ms
```

## Log Viewer Component

### Development UI

Add the LogViewer component to your app for easy debugging:

```typescript
import { LogViewer } from './components/LogViewer';

function App() {
  return (
    <>
      {/* Your app content */}
      <LogViewer />
    </>
  );
}
```

The LogViewer provides:
- Real-time log viewing
- Filtering by level and context
- Performance statistics
- Export to JSON/CSV
- Auto-refresh capability

### Features

1. **Filtering**
   - Filter by log level (Debug, Info, Warn, Error)
   - Filter by context (e.g., "ScheduleContext")
   
2. **Performance Stats**
   - Total actions executed
   - Average execution time
   - Slowest action identification

3. **Export Options**
   - JSON format for detailed analysis
   - CSV format for spreadsheet import

## Exporting Logs

### Programmatic Export

```typescript
// Export all logs
const allLogs = logger.exportLogs();

// Export with filters
const errorLogs = logger.exportLogs({
  level: LogLevel.ERROR,
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-01-16'),
  context: 'ScheduleContext'
});

// Export as JSON string
const jsonLogs = logger.exportAsJson({ level: LogLevel.WARN });

// Export as CSV
const csvLogs = logger.exportAsCsv({ context: 'ConfigurationContext' });
```

### Performance Analysis

```typescript
// Get performance statistics
const stats = logger.getPerformanceStats();
console.log(`Average action time: ${stats.averageExecutionTime}ms`);
console.log(`Slowest action: ${stats.slowestAction.action} (${stats.slowestAction.time}ms)`);

// Get stats for specific context
const scheduleStats = logger.getPerformanceStats('ScheduleContext');
```

## Best Practices

### 1. Use Appropriate Log Levels

- **DEBUG**: Detailed information for debugging
- **INFO**: General informational messages
- **WARN**: Warning messages for potential issues
- **ERROR**: Error messages for failures

### 2. Include Relevant Context

```typescript
// Good - includes relevant data
logger.info('ScheduleOptimizer', 'Optimization completed', {
  iterations: 50,
  bestFitness: 0.95,
  timeElapsed: 1234
});

// Bad - lacks context
logger.info('ScheduleOptimizer', 'Done');
```

### 3. Sanitize Sensitive Data

The logging middleware automatically sanitizes sensitive fields:
- Passwords, tokens, secrets are replaced with '[REDACTED]'
- Large arrays are truncated
- Long strings are abbreviated

### 4. Monitor Performance

Regular review of performance logs helps identify:
- Slow operations needing optimization
- Inefficient state updates
- Problematic user interactions

## Production Considerations

### 1. Disable Console Output

In production, disable console output to improve performance:

```typescript
logger.configure({
  enableConsole: false
});
```

### 2. Adjust Log Level

Increase minimum log level in production:

```typescript
logger.configure({
  minLevel: LogLevel.WARN // Only warnings and errors
});
```

### 3. Log Rotation

The logger automatically maintains a maximum number of logs (default: 1000) to prevent memory issues.

### 4. Error Reporting Integration

Export logs when errors occur:

```typescript
window.addEventListener('error', (event) => {
  const recentLogs = logger.exportLogs({
    startDate: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
  });
  
  // Send to error reporting service
  errorReportingService.report({
    error: event.error,
    logs: recentLogs
  });
});
```

## Troubleshooting

### Logs Not Appearing

1. Check if logging is enabled:
   ```typescript
   console.log('Logging enabled:', process.env.NODE_ENV !== 'production' || process.env.REACT_APP_ENABLE_LOGGING === 'true');
   ```

2. Verify minimum log level:
   ```typescript
   logger.configure({ minLevel: LogLevel.DEBUG });
   ```

3. Ensure console output is enabled for development:
   ```typescript
   logger.configure({ enableConsole: true });
   ```

### Performance Impact

If logging impacts performance:

1. Increase the performance threshold
2. Reduce the log level
3. Disable state diff logging
4. Clear logs periodically

### Memory Usage

Monitor log count and clear when needed:

```typescript
if (logger.getLogCount() > 500) {
  logger.clear();
}
```