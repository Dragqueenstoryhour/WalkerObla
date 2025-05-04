#!/bin/bash

# Record the start time
echo "Starting debug test for pronunciation assessment"
echo "=============================================="
echo

# Create a simple test file if needed
if [ ! -f "temp-hello.webm" ]; then
  echo "Using sample recording for testing..."
else 
  echo "Using existing temp-hello.webm file"
fi

# Format the curl command with proper content type and parameters
echo "Sending request to debug endpoint..."

# Send the request to our debug endpoint
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@./test-hello.mp3" \
  -F "text=Hello" \
  http://localhost:5000/api/debug/pronunciation \
  -o debug-response.json

echo
echo "Response saved to debug-response.json"

# Display a summary of the response
echo
echo "Response summary:"
cat debug-response.json | grep -E '"error"|"pronunciationScore"|"accuracyScore"|"fluencyScore"|"message"' | head -10

echo
echo "Test completed"
echo "=============================================="
