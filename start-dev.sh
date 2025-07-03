#!/bin/bash
echo "Starting development server..."
npm start &
SERVER_PID=$!
echo "Server starting with PID: $SERVER_PID"
echo ""
echo "The development server is running in the background."
echo "Access the application at: http://localhost:3000"
echo ""
echo "To stop the server later, run: kill $SERVER_PID"
echo ""
echo "Control returned to terminal. Server running in background."