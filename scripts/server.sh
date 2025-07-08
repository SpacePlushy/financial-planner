#!/bin/bash

# Financial Schedule Optimizer - Server Management Script
# Usage: ./scripts/server.sh [command] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Financial Schedule Optimizer"
DEV_PORT=3000
BUILD_PORT=5000
PID_FILE="./scripts/server.pid"
LOG_FILE="./scripts/server.log"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if process is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Get process info
get_process_info() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "PID: $pid"
            echo "Command: $(ps -p $pid -o command --no-headers)"
            echo "Started: $(ps -p $pid -o lstart --no-headers)"
            echo "CPU: $(ps -p $pid -o %cpu --no-headers)%"
            echo "Memory: $(ps -p $pid -o %mem --no-headers)%"
        fi
    fi
}

# Start development server
start_dev() {
    if is_running; then
        log_warning "Development server is already running"
        status
        return 1
    fi
    
    log_info "Starting $APP_NAME development server..."
    log_info "Port: $DEV_PORT"
    log_info "Log file: $LOG_FILE"
    
    # Start the development server in background
    nohup npm start > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 3
    if is_running; then
        log_success "Development server started successfully"
        log_info "Access the application at: http://localhost:$DEV_PORT"
        log_info "PID: $pid"
    else
        log_error "Failed to start development server"
        log_error "Check log file: $LOG_FILE"
        return 1
    fi
}

# Start production server
start_prod() {
    if is_running; then
        log_warning "Server is already running"
        status
        return 1
    fi
    
    log_info "Building production version..."
    npm run build
    
    # Check if serve is installed
    if ! command -v serve &> /dev/null; then
        log_info "Installing serve globally..."
        npm install -g serve
    fi
    
    log_info "Starting $APP_NAME production server..."
    log_info "Port: $BUILD_PORT"
    log_info "Log file: $LOG_FILE"
    
    # Start the production server in background
    nohup serve -s build -l $BUILD_PORT > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 3
    if is_running; then
        log_success "Production server started successfully"
        log_info "Access the application at: http://localhost:$BUILD_PORT"
        log_info "PID: $pid"
    else
        log_error "Failed to start production server"
        log_error "Check log file: $LOG_FILE"
        return 1
    fi
}

# Stop server
stop() {
    if ! is_running; then
        log_warning "No server is currently running"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    log_info "Stopping server (PID: $pid)..."
    
    # Try graceful shutdown first
    kill "$pid" 2>/dev/null || true
    
    # Wait for graceful shutdown
    local count=0
    while [ $count -lt 10 ] && ps -p "$pid" > /dev/null 2>&1; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        log_warning "Graceful shutdown failed, forcing termination..."
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
    
    # Clean up
    rm -f "$PID_FILE"
    log_success "Server stopped successfully"
}

# Restart server
restart() {
    local mode=${1:-dev}
    log_info "Restarting server in $mode mode..."
    
    if is_running; then
        stop
        sleep 2
    fi
    
    if [ "$mode" = "prod" ]; then
        start_prod
    else
        start_dev
    fi
}

# Show server status
status() {
    echo "=== $APP_NAME Server Status ==="
    echo
    
    if is_running; then
        log_success "Server is running"
        get_process_info
        echo
        
        # Check if port is accessible
        local pid=$(cat "$PID_FILE")
        local port_check=$(lsof -Pan -p $pid -i 2>/dev/null | grep LISTEN | head -1)
        if [ -n "$port_check" ]; then
            local port=$(echo "$port_check" | awk '{print $9}' | cut -d: -f2)
            echo "Listening on port: $port"
            echo "URL: http://localhost:$port"
        fi
    else
        log_warning "Server is not running"
    fi
    
    echo
    echo "Log file: $LOG_FILE"
    if [ -f "$LOG_FILE" ]; then
        echo "Log size: $(du -h "$LOG_FILE" | cut -f1)"
    else
        echo "Log file: Not found"
    fi
}

# Show server logs
logs() {
    local lines=${1:-50}
    
    if [ ! -f "$LOG_FILE" ]; then
        log_error "Log file not found: $LOG_FILE"
        return 1
    fi
    
    echo "=== Last $lines lines of server logs ==="
    tail -n "$lines" "$LOG_FILE"
}

# Follow server logs
logs_follow() {
    if [ ! -f "$LOG_FILE" ]; then
        log_error "Log file not found: $LOG_FILE"
        return 1
    fi
    
    echo "=== Following server logs (Press Ctrl+C to stop) ==="
    tail -f "$LOG_FILE"
}

# Run tests
test() {
    local type=${1:-unit}
    
    case $type in
        unit)
            log_info "Running unit tests..."
            npm test -- --watchAll=false
            ;;
        e2e)
            log_info "Running E2E tests..."
            if ! is_running; then
                log_info "Starting server for E2E tests..."
                start_dev
                sleep 5
            fi
            npm run e2e
            ;;
        cypress)
            log_info "Opening Cypress test runner..."
            if ! is_running; then
                log_info "Starting server for Cypress tests..."
                start_dev
                sleep 5
            fi
            npm run e2e:open
            ;;
        all)
            log_info "Running all tests..."
            npm test -- --watchAll=false
            if ! is_running; then
                start_dev
                sleep 5
            fi
            npm run e2e
            ;;
        *)
            log_error "Unknown test type: $type"
            echo "Available types: unit, e2e, cypress, all"
            return 1
            ;;
    esac
}

# Build application
build() {
    log_info "Building application..."
    npm run build
    log_success "Build completed"
    
    local build_size=$(du -sh build 2>/dev/null | cut -f1 || echo "Unknown")
    log_info "Build size: $build_size"
}

# Clean up
clean() {
    log_info "Cleaning up..."
    
    # Stop server if running
    if is_running; then
        stop
    fi
    
    # Remove build directory
    if [ -d "build" ]; then
        rm -rf build
        log_info "Removed build directory"
    fi
    
    # Remove log file
    if [ -f "$LOG_FILE" ]; then
        rm -f "$LOG_FILE"
        log_info "Removed log file"
    fi
    
    # Remove node_modules (optional)
    read -p "Remove node_modules directory? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -d "node_modules" ]; then
            rm -rf node_modules
            log_info "Removed node_modules directory"
            log_info "Run 'npm install' to reinstall dependencies"
        fi
    fi
    
    log_success "Cleanup completed"
}

# Health check
health() {
    echo "=== $APP_NAME Health Check ==="
    echo
    
    # Check if server is running
    if is_running; then
        log_success "✓ Server process is running"
        
        # Try to connect to the server
        local pid=$(cat "$PID_FILE")
        local port_check=$(lsof -Pan -p $pid -i 2>/dev/null | grep LISTEN | head -1)
        
        if [ -n "$port_check" ]; then
            local port=$(echo "$port_check" | awk '{print $9}' | cut -d: -f2)
            
            if curl -s "http://localhost:$port" > /dev/null; then
                log_success "✓ Server is responding on port $port"
            else
                log_error "✗ Server is not responding on port $port"
            fi
        else
            log_error "✗ Server is not listening on any port"
        fi
    else
        log_error "✗ Server is not running"
    fi
    
    # Check dependencies
    if [ -d "node_modules" ]; then
        log_success "✓ Dependencies are installed"
    else
        log_error "✗ Dependencies are not installed (run 'npm install')"
    fi
    
    # Check disk space
    local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 90 ]; then
        log_success "✓ Disk space is adequate ($disk_usage% used)"
    else
        log_warning "⚠ Disk space is running low ($disk_usage% used)"
    fi
    
    echo
}

# Show help
help() {
    echo "=== $APP_NAME Server Management Script ==="
    echo
    echo "Usage: $0 [command] [options]"
    echo
    echo "Commands:"
    echo "  start [dev|prod]     Start the server (default: dev)"
    echo "  stop                 Stop the server"
    echo "  restart [dev|prod]   Restart the server (default: dev)"
    echo "  status               Show server status"
    echo "  logs [lines]         Show server logs (default: 50 lines)"
    echo "  logs-follow          Follow server logs in real-time"
    echo "  test [type]          Run tests (unit|e2e|cypress|all)"
    echo "  build                Build the application"
    echo "  clean                Clean up files and directories"
    echo "  health               Perform health check"
    echo "  help                 Show this help message"
    echo
    echo "Examples:"
    echo "  $0 start             Start development server"
    echo "  $0 start prod        Start production server"
    echo "  $0 logs 100          Show last 100 log lines"
    echo "  $0 test e2e          Run E2E tests"
    echo "  $0 restart prod      Restart in production mode"
    echo
}

# Main command handler
main() {
    # Create scripts directory if it doesn't exist
    mkdir -p scripts
    
    # Parse command
    local command=${1:-help}
    shift || true
    
    case $command in
        start)
            local mode=${1:-dev}
            if [ "$mode" = "prod" ]; then
                start_prod
            else
                start_dev
            fi
            ;;
        stop)
            stop
            ;;
        restart)
            restart "$@"
            ;;
        status)
            status
            ;;
        logs)
            logs "$@"
            ;;
        logs-follow)
            logs_follow
            ;;
        test)
            test "$@"
            ;;
        build)
            build
            ;;
        clean)
            clean
            ;;
        health)
            health
            ;;
        help|--help|-h)
            help
            ;;
        *)
            log_error "Unknown command: $command"
            echo
            help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"