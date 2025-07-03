#!/bin/bash
echo "Starting Financial Schedule Optimizer..."
echo ""

# Kill any existing processes on port 3000
pkill -f "react-scripts start" 2>/dev/null || true
sleep 2

# Start the server in background with nohup
nohup npm start > server.log 2>&1 &
echo $! > server.pid

echo "✓ Development server is starting (PID: $(cat server.pid))"
echo ""
echo "The application will be available at: http://localhost:3000"
echo ""
echo "Please wait 10-20 seconds for the server to fully start."
echo ""
echo "To check if it's ready, look for 'Compiled successfully' in: tail -f server.log"
echo "To stop the server: kill $(cat server.pid)"
echo ""
echo "You can now test the application by opening http://localhost:3000 in your browser."