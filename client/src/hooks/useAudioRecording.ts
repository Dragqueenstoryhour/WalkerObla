import { useState, useRef, useCallback } from 'react';
import { 
  detectAudioCapabilities, 
  getOptimalRecordingConstraints, 
  createOptimalMediaRecorder,
  prepareAudioForSubmission,
  createAudioBlobUrl
} from '@/lib/audioUtils';

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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      console.log('[Recording] Starting recording process');

      // Reset state
      chunksRef.current = [];
      setAudioUrl(null);
      setRecordingDuration(0);
      setAudioBlob(null); // Clear previous blob

      // Request microphone access
      const optimalConstraints = getOptimalRecordingConstraints();
      const finalConstraints = {
        audio: {
          ...optimalConstraints,
          ...audioConstraints, // Allow overrides
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      streamRef.current = stream;
      console.log('[Recording] Microphone access granted.');

      // Create MediaRecorder
      const mediaRecorder = createOptimalMediaRecorder(stream);
      if (!mediaRecorder) {
        throw new Error("Failed to create MediaRecorder.");
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[Recording] Recording stopped.');
        if (chunksRef.current.length === 0) {
          console.warn('[Recording] No audio data recorded.');
          setIsRecording(false);
          setRecordingDuration(0);
          return;
        }

        const recordedBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        console.log(`[Recording] Raw recorded blob type: ${recordedBlob.type}, size: ${recordedBlob.size} bytes`);

        // Prepare audio for submission (handles format conversion for Safari/iOS)
        const processedBlob = await prepareAudioForSubmission(recordedBlob);
        console.log(`[Recording] Processed blob type: ${processedBlob.type}, size: ${processedBlob.size} bytes`);

        setAudioBlob(processedBlob);
        const url = createAudioBlobUrl(processedBlob);
        setAudioUrl(url);

        // Call the onRecordingComplete callback if provided
        if (onRecordingComplete) {
          onRecordingComplete(processedBlob);
        }

        // Clean up stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
          console.log('[Recording] Stream tracks stopped.');
        }

        setIsRecording(false);
        setRecordingDuration(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Recording] MediaRecorder error:', event);
        setIsRecording(false);
        setRecordingDuration(0);
        if (onError) {
          onError(new Error(`MediaRecorder error: ${event.error?.name || 'Unknown error'}`));
        }
      };

      mediaRecorder.start();
      console.log('[Recording] MediaRecorder started.');
      setIsRecording(true);

      // Start duration timer
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prevDuration => prevDuration + 1);
      }, 1000);

    } catch (error: any) {
      console.error('[Recording] Error starting recording:', error);
      setIsRecording(false);
      setRecordingDuration(0);
      if (onError) {
        onError(error);
      } else {
        console.error("Microphone access denied or other error:", error.message);
      }
    }
  }, [onRecordingComplete, onError, audioConstraints]);

  const stopRecording = useCallback(() => {
    console.log('[Recording] Stop recording requested');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      console.warn('[Recording] Cannot stop: recorder not available or not recording');
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    console.log('[Recording] Cancel recording requested');
    try {
      if (mediaRecorderRef.current && isRecording) {
        console.log('[Recording] Stopping and discarding recording');
        mediaRecorderRef.current.stop();

        // Clear the chunks so no audio is created
        chunksRef.current = [];
        console.log('[Recording] Audio chunks cleared');

        // Clear timer
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
          console.log('[Recording] Timer cleared');
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log(`[Recording] Track stopped: ${track.kind}`);
          });
          streamRef.current = null;
        }

        setIsRecording(false);
        setRecordingDuration(0);
        setAudioUrl(null); // Clear any generated URL
        setAudioBlob(null); // Clear any generated blob
        console.log('[Recording] Recording canceled and resources cleaned up');
      } else {
        console.warn('[Recording] Cannot cancel: recorder not available or not recording');
      }
    } catch (error) {
      console.error('[Recording] Error canceling recording:', error);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }, [isRecording]);

  return {
    isRecording,
    recordingDuration,
    audioUrl,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

export default useAudioRecording;