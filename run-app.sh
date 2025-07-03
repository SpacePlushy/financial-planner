#!/bin/bash
echo "Starting Financial Schedule Optimizer..."
echo ""

# Kill any existing processes on port 3000
fuser -k 3000/tcp 2>/dev/null || true

# Start the server in a detached screen session
screen -dmS financial-app npm start

echo "✓ Development server is starting in the background"
echo ""
echo "Access the application at: http://localhost:3000"
echo ""
echo "The server may take 10-20 seconds to fully start."
echo ""
echo "To view server logs: screen -r financial-app"
echo "To stop the server: screen -X -S financial-app quit"
echo ""
echo "You can now open http://localhost:3000 in your browser to test the application."