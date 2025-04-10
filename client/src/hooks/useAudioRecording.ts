import { useState, useRef, useCallback } from 'react';

interface UseAudioRecordingOptions {
  onRecordingComplete?: (blob: Blob) => void;
  onError?: (error: Error) => void;
  audioConstraints?: MediaTrackConstraints;
}

export function useAudioRecording({
  onRecordingComplete,
  onError,
  audioConstraints = {},
}: UseAudioRecordingOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  
  const startRecording = useCallback(async () => {
    try {
      // Reset state
      chunksRef.current = [];
      setAudioUrl(null);
      setRecordingDuration(0);
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { ...audioConstraints },
      });
      
      streamRef.current = stream;
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available event
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Use WAV format which works better with Azure Speech Services
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        
        setAudioUrl(url);
        setIsRecording(false);
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Clear timer
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      // Start recording
      mediaRecorder.start(100);
      setIsRecording(true);
      
      // Start duration timer
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to start recording'));
      }
    }
  }, [audioConstraints, onError, onRecordingComplete]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);
  
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Clear the chunks so no audio is created
      chunksRef.current = [];
      
      // Clear timer
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }, [isRecording]);
  
  return {
    isRecording,
    recordingDuration,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

export default useAudioRecording;
