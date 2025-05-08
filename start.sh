#!/bin/bash

# Start the Flask animation server in the background
echo "Starting the Animation Flask server..."
python3 api/animation/animation_server.py &
ANIMATION_PID=$!

# Start the main Express server
echo "Starting the main Express server..."
npm run dev

# Kill the Flask server when the script exits
kill $ANIMATION_PID