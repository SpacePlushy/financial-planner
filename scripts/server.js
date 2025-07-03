#!/usr/bin/env node

/**
 * Cross-platform Node.js wrapper for server management
 * This provides the same functionality as server.sh but works on Windows
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Configuration
const CONFIG = {
  appName: 'Financial Schedule Optimizer',
  devPort: 3000,
  buildPort: 5000,
  pidFile: path.join(__dirname, 'server.pid'),
  logFile: path.join(__dirname, 'server.log')
};

// Helper functions
function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
}

function isRunning() {
  if (!fs.existsSync(CONFIG.pidFile)) {
    return false;
  }
  
  try {
    const pid = fs.readFileSync(CONFIG.pidFile, 'utf8').trim();
    process.kill(pid, 0); // Check if process exists
    return true;
  } catch (error) {
    // Process doesn't exist, clean up stale PID file
    try {
      fs.unlinkSync(CONFIG.pidFile);
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

function getPid() {
  if (fs.existsSync(CONFIG.pidFile)) {
    return fs.readFileSync(CONFIG.pidFile, 'utf8').trim();
  }
  return null;
}

function startDev() {
  if (isRunning()) {
    log('yellow', 'Development server is already running');
    return showStatus();
  }
  
  log('blue', `Starting ${CONFIG.appName} development server...`);
  log('blue', `Port: ${CONFIG.devPort}`);
  log('blue', `Log file: ${CONFIG.logFile}`);
  
  // Ensure log directory exists
  fs.mkdirSync(path.dirname(CONFIG.logFile), { recursive: true });
  
  // Start development server with proper stdio handling
  const child = spawn('npm', ['start'], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore']
  });
  
  // Save PID
  fs.writeFileSync(CONFIG.pidFile, child.pid.toString());
  
  // Unref so parent can exit
  child.unref();
  
  // Wait a moment and check if it started
  setTimeout(() => {
    if (isRunning()) {
      log('green', 'Development server started successfully');
      log('blue', `Access the application at: http://localhost:${CONFIG.devPort}`);
      log('blue', `PID: ${child.pid}`);
    } else {
      log('red', 'Failed to start development server');
      log('red', `Check log file: ${CONFIG.logFile}`);
    }
  }, 3000);
}

function startProd() {
  if (isRunning()) {
    log('yellow', 'Server is already running');
    return showStatus();
  }
  
  log('blue', 'Building production version...');
  
  // Build first
  const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
  
  buildProcess.on('close', (code) => {
    if (code !== 0) {
      log('red', 'Build failed');
      return;
    }
    
    // Check if serve is available
    exec('npm list -g serve', (error) => {
      if (error) {
        log('blue', 'Installing serve globally...');
        const installProcess = spawn('npm', ['install', '-g', 'serve'], { stdio: 'inherit' });
        
        installProcess.on('close', (installCode) => {
          if (installCode === 0) {
            startProdServer();
          } else {
            log('red', 'Failed to install serve');
          }
        });
      } else {
        startProdServer();
      }
    });
  });
}

function startProdServer() {
  log('blue', `Starting ${CONFIG.appName} production server...`);
  log('blue', `Port: ${CONFIG.buildPort}`);
  log('blue', `Log file: ${CONFIG.logFile}`);
  
  // Create log file stream
  const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'w' });
  
  // Start production server
  const child = spawn('serve', ['-s', 'build', '-l', CONFIG.buildPort.toString()], {
    detached: true,
    stdio: ['ignore', logStream, logStream]
  });
  
  // Save PID
  fs.writeFileSync(CONFIG.pidFile, child.pid.toString());
  
  // Unref so parent can exit
  child.unref();
  
  // Wait a moment and check if it started
  setTimeout(() => {
    if (isRunning()) {
      log('green', 'Production server started successfully');
      log('blue', `Access the application at: http://localhost:${CONFIG.buildPort}`);
      log('blue', `PID: ${child.pid}`);
    } else {
      log('red', 'Failed to start production server');
      log('red', `Check log file: ${CONFIG.logFile}`);
    }
  }, 3000);
}

function stop() {
  if (!isRunning()) {
    log('yellow', 'No server is currently running');
    return;
  }
  
  const pid = getPid();
  log('blue', `Stopping server (PID: ${pid})...`);
  
  try {
    process.kill(pid, 'SIGTERM');
    
    // Wait for graceful shutdown
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (!isRunning() || attempts > 10) {
        clearInterval(checkInterval);
        
        if (isRunning() && attempts > 10) {
          // Force kill
          log('yellow', 'Graceful shutdown failed, forcing termination...');
          try {
            process.kill(pid, 'SIGKILL');
          } catch (e) {
            // Process might already be dead
          }
        }
        
        // Clean up PID file
        try {
          fs.unlinkSync(CONFIG.pidFile);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        log('green', 'Server stopped successfully');
      }
    }, 1000);
    
  } catch (error) {
    log('red', `Failed to stop server: ${error.message}`);
  }
}

function restart(mode = 'dev') {
  log('blue', `Restarting server in ${mode} mode...`);
  
  if (isRunning()) {
    stop();
    // Wait a moment before restarting
    setTimeout(() => {
      if (mode === 'prod') {
        startProd();
      } else {
        startDev();
      }
    }, 2000);
  } else {
    if (mode === 'prod') {
      startProd();
    } else {
      startDev();
    }
  }
}

function showStatus() {
  console.log(`=== ${CONFIG.appName} Server Status ===`);
  console.log();
  
  if (isRunning()) {
    const pid = getPid();
    log('green', 'Server is running');
    console.log(`PID: ${pid}`);
    
    // Try to get port info (Unix-like systems only)
    if (os.platform() !== 'win32') {
      exec(`lsof -Pan -p ${pid} -i 2>/dev/null | grep LISTEN`, (error, stdout) => {
        if (!error && stdout) {
          const portMatch = stdout.match(/:(\d+)/);
          if (portMatch) {
            const port = portMatch[1];
            console.log(`Listening on port: ${port}`);
            console.log(`URL: http://localhost:${port}`);
          }
        }
      });
    }
  } else {
    log('yellow', 'Server is not running');
  }
  
  console.log();
  console.log(`Log file: ${CONFIG.logFile}`);
  
  if (fs.existsSync(CONFIG.logFile)) {
    const stats = fs.statSync(CONFIG.logFile);
    console.log(`Log size: ${(stats.size / 1024).toFixed(2)} KB`);
  } else {
    console.log('Log file: Not found');
  }
}

function showLogs(lines = 50) {
  if (!fs.existsSync(CONFIG.logFile)) {
    log('red', `Log file not found: ${CONFIG.logFile}`);
    return;
  }
  
  console.log(`=== Last ${lines} lines of server logs ===`);
  
  // Simple implementation - read file and show last N lines
  try {
    const content = fs.readFileSync(CONFIG.logFile, 'utf8');
    const allLines = content.split('\n');
    const lastLines = allLines.slice(-lines);
    console.log(lastLines.join('\n'));
  } catch (error) {
    log('red', `Failed to read log file: ${error.message}`);
  }
}

function runTests(type = 'unit') {
  switch (type) {
    case 'unit':
      log('blue', 'Running unit tests...');
      spawn('npm', ['test', '--', '--watchAll=false'], { stdio: 'inherit' });
      break;
      
    case 'e2e':
      log('blue', 'Running E2E tests...');
      if (!isRunning()) {
        log('blue', 'Starting server for E2E tests...');
        startDev();
        setTimeout(() => {
          spawn('npm', ['run', 'e2e'], { stdio: 'inherit' });
        }, 5000);
      } else {
        spawn('npm', ['run', 'e2e'], { stdio: 'inherit' });
      }
      break;
      
    case 'cypress':
      log('blue', 'Opening Cypress test runner...');
      if (!isRunning()) {
        log('blue', 'Starting server for Cypress tests...');
        startDev();
        setTimeout(() => {
          spawn('npm', ['run', 'e2e:open'], { stdio: 'inherit' });
        }, 5000);
      } else {
        spawn('npm', ['run', 'e2e:open'], { stdio: 'inherit' });
      }
      break;
      
    default:
      log('red', `Unknown test type: ${type}`);
      console.log('Available types: unit, e2e, cypress');
  }
}

function build() {
  log('blue', 'Building application...');
  const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
  
  buildProcess.on('close', (code) => {
    if (code === 0) {
      log('green', 'Build completed');
      
      // Show build size if possible
      try {
        if (fs.existsSync('build')) {
          exec('du -sh build 2>/dev/null || echo "Unknown"', (error, stdout) => {
            if (!error) {
              log('blue', `Build size: ${stdout.trim()}`);
            }
          });
        }
      } catch (e) {
        // Ignore errors
      }
    } else {
      log('red', 'Build failed');
    }
  });
}

function clean() {
  log('blue', 'Cleaning up...');
  
  // Stop server if running
  if (isRunning()) {
    stop();
  }
  
  // Remove build directory
  if (fs.existsSync('build')) {
    fs.rmSync('build', { recursive: true, force: true });
    log('blue', 'Removed build directory');
  }
  
  // Remove log file
  if (fs.existsSync(CONFIG.logFile)) {
    fs.unlinkSync(CONFIG.logFile);
    log('blue', 'Removed log file');
  }
  
  log('green', 'Cleanup completed');
}

function showHelp() {
  console.log(`=== ${CONFIG.appName} Server Management Script ===`);
  console.log();
  console.log('Usage: node scripts/server.js [command] [options]');
  console.log('   or: npm run server [command] [options]');
  console.log();
  console.log('Commands:');
  console.log('  start [dev|prod]     Start the server (default: dev)');
  console.log('  stop                 Stop the server');
  console.log('  restart [dev|prod]   Restart the server (default: dev)');
  console.log('  status               Show server status');
  console.log('  logs [lines]         Show server logs (default: 50 lines)');
  console.log('  test [type]          Run tests (unit|e2e|cypress)');
  console.log('  build                Build the application');
  console.log('  clean                Clean up files and directories');
  console.log('  help                 Show this help message');
  console.log();
  console.log('Examples:');
  console.log('  node scripts/server.js start        Start development server');
  console.log('  npm run server start prod           Start production server');
  console.log('  npm run server logs 100             Show last 100 log lines');
  console.log('  npm run server test e2e              Run E2E tests');
  console.log();
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options = args.slice(1);
  
  // Create scripts directory if it doesn't exist
  if (!fs.existsSync(__dirname)) {
    fs.mkdirSync(__dirname, { recursive: true });
  }
  
  switch (command) {
    case 'start':
      const mode = options[0] || 'dev';
      if (mode === 'prod') {
        startProd();
      } else {
        startDev();
      }
      break;
      
    case 'stop':
      stop();
      break;
      
    case 'restart':
      restart(options[0] || 'dev');
      break;
      
    case 'status':
      showStatus();
      break;
      
    case 'logs':
      showLogs(parseInt(options[0]) || 50);
      break;
      
    case 'test':
      runTests(options[0] || 'unit');
      break;
      
    case 'build':
      build();
      break;
      
    case 'clean':
      clean();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      log('red', `Unknown command: ${command}`);
      console.log();
      showHelp();
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  startDev,
  startProd,
  stop,
  restart,
  showStatus,
  showLogs,
  runTests,
  build,
  clean,
  showHelp
};