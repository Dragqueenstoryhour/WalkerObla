#!/bin/bash

# Test Azure Speech Services configuration
echo "Testing Azure Speech Services configuration..."

# Check if environment variables are set
if [ -z "$AZURE_SPEECH_KEY" ]; then
    echo "❌ AZURE_SPEECH_KEY is not set"
    exit 1
else
    echo "✅ AZURE_SPEECH_KEY is set (length: ${#AZURE_SPEECH_KEY})"
fi

REGION=${AZURE_SPEECH_REGION:-eastus}
echo "🌍 Using region: $REGION"

# Test with curl to Azure Speech API directly
echo "🔍 Testing direct API call to Azure Speech Services..."

curl -X POST "https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1" \
  -H "Ocp-Apim-Subscription-Key: $AZURE_SPEECH_KEY" \
  -H "Content-Type: application/ssml+xml" \
  -H "X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3" \
  -d '<speak version="1.0" xml:lang="en-US"><voice xml:lang="en-US" xml:gender="Female" name="en-US-AvaNeural">Testing Azure direct API call</voice></speak>' \
  --output test_azure_direct.mp3 \
  --write-out "HTTP Status: %{http_code}\nTotal time: %{time_total}s\nSize: %{size_download} bytes\n"

echo ""
echo "File size: $(wc -c < test_azure_direct.mp3 2>/dev/null || echo '0') bytes"
