import { useState, useRef, useCallback, useEffect } from 'react';

interface UseRealTimeVoiceOptions {
  onVoiceResult?: (result: { action: string; topic?: string; parameters?: any }) => void;
  onError?: (error: Error) => void;
  onVoiceResponse?: (audioUrl: string) => void;
  onStreamingResponse?: (partialResponse: string) => void;
}

// This hook implements the multimodal speech-to-speech architecture
// with the gpt-4o-realtime-preview model for real-time voice interactions
export function useRealTimeVoice({
  onVoiceResult,
  onError,
  onVoiceResponse,
  onStreamingResponse,
}: UseRealTimeVoiceOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRealtimeSession = useCallback(async () => {
    try {
      // Get a new session ID from the server
      const response = await fetch('/api/voice/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize realtime session');
      }
      
      const { sessionId } = await response.json();
      
      // Connect to the realtime WebSocket
      const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/voice/realtime/${sessionId}`);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket connection established');
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'text') {
          // Handle text response from the model
          setTranscribedText(data.content);
          if (onStreamingResponse) {
            onStreamingResponse(data.content);
            // Update the spoken words highlighting
            const spokenWords = document.querySelectorAll('.text-primary/50');
            const transcribedWords = data.content.toLowerCase().split(' ');
            spokenWords.forEach((wordSpan: Element) => {
              if (transcribedWords.includes(wordSpan.textContent?.toLowerCase())) {
                wordSpan.classList.remove('text-primary/50');
                wordSpan.classList.add('text-black');
              }
            });
          }
        } else if (data.type === 'action') {
          // Handle action response from the model
          if (onVoiceResult) {
            onVoiceResult(data.content);
          }
        } else if (data.type === 'audio') {
          // Handle audio response
          if (onVoiceResponse) {
            onVoiceResponse(data.audioUrl);
          }
        } else if (data.type === 'error') {
          if (onError) {
            onError(new Error(data.message));
          }
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) {
          onError(new Error('WebSocket connection error'));
        }
      };
      
      socket.onclose = () => {
        console.log('WebSocket connection closed');
        setIsListening(false);
      };
      
      return true;
    } catch (error) {
      console.error('Error starting realtime session:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to initialize realtime session'));
      }
      return false;
    }
  }, [onError, onStreamingResponse, onVoiceResponse, onVoiceResult]);

  const startListening = useCallback(async () => {
    try {
      // Initialize the realtime session first
      const sessionStarted = await startRealtimeSession();
      if (!sessionStarted || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        throw new Error('Failed to initialize realtime session');
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create a MediaRecorder to capture audio
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Convert the audio chunk to base64 and send it to the server
          const reader = new FileReader();
          reader.readAsDataURL(event.data);
          reader.onloadend = () => {
            const base64data = reader.result?.toString().split(',')[1];
            if (base64data && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({
                type: 'audio',
                content: base64data
              }));
            }
          };
        }
      };
      
      mediaRecorder.onstop = () => {
        // Clean up when recording stops
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsListening(false);
        setIsProcessing(false);
      };
      
      // Start recording audio in chunks
      mediaRecorder.start(250); // Send audio chunks every 250ms
      setIsListening(true);
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to start voice recognition'));
      }
      setIsListening(false);
      setIsProcessing(false);
    }
  }, [onError, startRealtimeSession]);

  const stopListening = useCallback(() => {
    // Stop the media recorder if it's running
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop all tracks in the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close the WebSocket connection
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'stop' }));
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setIsListening(false);
    setIsProcessing(false);
    setTranscribedText('');
  }, []);

  // Clean up resources when the component unmounts
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isProcessing,
    transcribedText,
    startListening,
    stopListening,
    toggleListening: isListening ? stopListening : startListening,
  };
}

export default useRealTimeVoice;