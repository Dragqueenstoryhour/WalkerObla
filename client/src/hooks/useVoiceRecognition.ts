import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRecognitionResult } from '@/lib/types';

interface UseVoiceRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (result: VoiceRecognitionResult) => void;
  onError?: (error: Error) => void;
}

export function useVoiceRecognition({
  continuous = false,
  interimResults = true,
  onResult,
  onError,
}: UseVoiceRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      const error = new Error('Speech recognition is not supported in this browser');
      if (onError) onError(error);
      return;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript;
        const isFinal = result.isFinal;
        
        setTranscript(transcriptText);
        
        if (onResult) {
          onResult({ transcript: transcriptText, isFinal });
        }
      };

      recognitionRef.current.onerror = (event) => {
        if (onError) onError(new Error(event.error));
        stopListening();
      };

      recognitionRef.current.onend = () => {
        if (isListening && continuous) {
          recognitionRef.current?.start();
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      if (onError) onError(error instanceof Error ? error : new Error('Unknown error'));
      setIsListening(false);
    }
  }, [continuous, interimResults, isListening, onError, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening: isListening ? stopListening : startListening,
  };
}

export default useVoiceRecognition;
