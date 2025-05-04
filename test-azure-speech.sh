#!/bin/bash

# Test endpoint with proper audio file
echo "Testing Azure Speech pronunciation assessment..."
echo "================================================"
echo

curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@test-sine-16k-mono.wav" \
  -F "text=Hello" \
  http://localhost:5000/api/debug/pronunciation \
  -o debug-response-test.json

echo
echo "Response saved to debug-response-test.json"
echo

# Display a summary of the response
if grep -q "pronunciationScore" debug-response-test.json; then
  echo "SUCCESS! Got pronunciation scores:"
  grep -E "pronunciationScore|accuracyScore|fluencyScore|completenessScore" debug-response-test.json
else
  echo "ERROR encountered:"
  grep -E "error|message" debug-response-test.json | head -3
fi

echo
echo "================================================"
