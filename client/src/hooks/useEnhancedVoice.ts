import { useState, useRef, useCallback, useEffect } from 'react';

interface UseEnhancedVoiceOptions {
  onVoiceResult?: (result: { action: string; topic?: string; parameters?: any }) => void;
  onError?: (error: Error) => void;
  onTranscript?: (text: string) => void;
  onAudioResponse?: (audioUrl: string) => void;
}

// This hook implements enhanced voice interaction using OpenAI's gpt-4o model
export function useEnhancedVoice({
  onVoiceResult,
  onError,
  onTranscript,
  onAudioResponse,
}: UseEnhancedVoiceOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Function to process recorded audio
  const processAudio = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Create form data to send the audio
      const formData = new FormData();
      formData.append('audio', audioBlob);

      // Send to the enhanced voice processing endpoint
      const response = await fetch('/api/voice/enhanced', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update transcribed text
      setTranscribedText(data.transcript);
      if (onTranscript) {
        onTranscript(data.transcript);
      }
      
      // Process voice command result
      if (data.result && onVoiceResult) {
        // Handle AI response with message for stroke recovery patients
        if (data.result.message) {
          // If the system is about to generate content, tell the user we're processing
          // and return the supportive message from the AI
          setTranscribedText(data.result.message);
        }
        
        onVoiceResult(data.result);
      }
      
      // Handle audio response if available
      if (data.audioUrl && onAudioResponse) {
        onAudioResponse(data.audioUrl);
      }

    } catch (error) {
      console.error('Error processing audio:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Error processing audio'));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [onVoiceResult, onError, onTranscript, onAudioResponse]);

  const startListening = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create a MediaRecorder to capture audio
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.onstart = () => {
        audioChunksRef.current = [];
        setIsListening(true);
      };
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Create a Blob from all the audio chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Process the recorded audio
        await processAudio(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsListening(true);
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to start voice recognition'));
      }
      setIsListening(false);
    }
  }, [processAudio, onError]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsListening(false);
  }, []);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isListening,
    isProcessing,
    transcribedText,
    startListening,
    stopListening,
  };
}

export default useEnhancedVoice;