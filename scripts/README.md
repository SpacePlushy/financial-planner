# Financial Schedule Optimizer - Server Management

This directory contains scripts for managing the development and production servers for the Financial Schedule Optimizer application.

## Quick Start

```bash
# Start development server
npm run server:start

# Start production server  
npm run server:start:prod

# Check server status
npm run server:status

# Stop server
npm run server:stop
```

## Available Scripts

### NPM Scripts (Recommended)

```bash
npm run server                    # Show help
npm run server:start             # Start development server
npm run server:start:prod        # Start production server
npm run server:stop              # Stop any running server
npm run server:restart           # Restart development server
npm run server:status            # Show server status
npm run server:logs              # Show server logs (last 50 lines)
npm run server:clean             # Clean up build files and logs
```

### Direct Script Usage

#### Cross-Platform (Node.js)
```bash
node scripts/server.js [command] [options]
```

#### Unix/Linux/macOS (Bash)
```bash
./scripts/server.sh [command] [options]
```

## Commands

### Server Management

| Command | Description | Example |
|---------|-------------|---------|
| `start [dev\|prod]` | Start server in development or production mode | `npm run server start prod` |
| `stop` | Stop the running server | `npm run server:stop` |
| `restart [dev\|prod]` | Restart the server | `npm run server restart` |
| `status` | Show current server status | `npm run server:status` |

### Logs & Monitoring

| Command | Description | Example |
|---------|-------------|---------|
| `logs [lines]` | Show last N lines of logs (default: 50) | `npm run server logs 100` |
| `logs-follow` | Follow logs in real-time (bash only) | `./scripts/server.sh logs-follow` |
| `health` | Perform comprehensive health check (bash only) | `./scripts/server.sh health` |

### Testing

| Command | Description | Example |
|---------|-------------|---------|
| `test [type]` | Run tests (unit\|e2e\|cypress\|all) | `npm run server test e2e` |

### Build & Maintenance

| Command | Description | Example |
|---------|-------------|---------|
| `build` | Build the application for production | `npm run server build` |
| `clean` | Clean up build files and logs | `npm run server:clean` |

## Server Modes

### Development Mode (Default)
- Port: 3000
- Hot reload enabled
- Source maps included
- Development dependencies available
- Started with: `npm start`

### Production Mode
- Port: 5000
- Optimized build
- Minified assets
- No hot reload
- Started with: `serve -s build`

## File Locations

```
scripts/
├── server.js          # Cross-platform Node.js script
├── server.sh          # Unix/Linux/macOS bash script  
├── server.pid         # Process ID file (auto-generated)
├── server.log         # Server log file (auto-generated)
└── README.md          # This file
```

## Examples

### Basic Server Operations

```bash
# Start development server
npm run server:start
# Server starts on http://localhost:3000

# Check if it's running
npm run server:status
# Shows PID, port, and resource usage

# View recent logs
npm run server:logs 20
# Shows last 20 log lines

# Stop the server
npm run server:stop
```

### Production Deployment

```bash
# Build and start production server
npm run server:start:prod
# Builds app and serves on http://localhost:5000

# Monitor production server
npm run server:status
npm run server:logs

# Restart if needed
npm run server restart prod
```

### Testing Workflow

```bash
# Start development server for testing
npm run server:start

# Run E2E tests (in another terminal)
npm run server test e2e

# Or run all tests
npm run server test all

# Clean up after testing
npm run server:clean
```

### Development Workflow

```bash
# Morning routine
npm run server:start          # Start dev server
npm run server:status          # Verify it's running

# During development
npm run server:logs 50         # Check for errors
npm run server restart         # Restart if needed

# End of day
npm run server:stop            # Stop server
npm run server:clean           # Clean up (optional)
```

## Troubleshooting

### Server Won't Start
1. Check if port is already in use: `lsof -i :3000`
2. Kill existing process: `npm run server:stop`
3. Clean up and retry: `npm run server:clean && npm run server:start`

### Server Won't Stop
1. Force stop: `kill -9 $(cat scripts/server.pid)`
2. Clean PID file: `rm scripts/server.pid`

### Build Errors
1. Clean build: `npm run server:clean`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Rebuild: `npm run server build`

### Port Conflicts
- Development server: Change port with `PORT=3001 npm start`
- Production server: Modify `CONFIG.buildPort` in `server.js`

### Permission Issues (Unix/Linux/macOS)
```bash
# Make script executable
chmod +x scripts/server.sh

# Run with appropriate permissions
sudo ./scripts/server.sh start prod
```

## Configuration

### Environment Variables
```bash
# Override default ports
PORT=3001 npm run server:start
SERVE_PORT=5001 npm run server:start:prod

# Enable debug logging
DEBUG=true npm run server:start
```

### Script Configuration
Edit `scripts/server.js` to modify:
- Default ports
- Log file location  
- PID file location
- Startup timeouts

## Health Monitoring

The bash script includes a comprehensive health check:

```bash
./scripts/server.sh health
```

This checks:
- ✓ Server process status
- ✓ Network connectivity
- ✓ Dependency installation
- ✓ Disk space usage
- ✓ Log file size

## Platform Support

| Platform | Node.js Script | Bash Script | Notes |
|----------|----------------|-------------|-------|
| Windows | ✅ Full support | ❌ Not supported | Use Node.js script |
| macOS | ✅ Full support | ✅ Full support | Both scripts work |
| Linux | ✅ Full support | ✅ Full support | Both scripts work |

## Security Notes

- Server logs may contain sensitive information
- PID files should not be shared
- Production servers should run with appropriate user permissions
- Consider using a process manager (PM2, systemd) for production

## Contributing

When modifying these scripts:
1. Test on multiple platforms
2. Update this README
3. Ensure error handling is robust
4. Add appropriate logging
5. Maintain backward compatibility