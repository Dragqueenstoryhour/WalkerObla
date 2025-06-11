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
      
      // Get optimal constraints for current browser
      const optimalConstraints = getOptimalRecordingConstraints();
      const finalConstraints = {
        audio: {
          ...optimalConstraints,
          ...audioConstraints, // Allow overrides
        }
      };
      
      console.log('[Recording] Using optimal constraints:', finalConstraints);
      const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      
      // Log stream details
      console.log('[Recording] Media stream obtained with tracks:', stream.getTracks().length);
      stream.getTracks().forEach((track, index) => {
        console.log(`[Recording] Track ${index}: kind=${track.kind}, enabled=${track.enabled}, readyState=${track.readyState}`);
        console.log('[Recording] Track settings:', track.getSettings());
      });
      
      streamRef.current = stream;
      
      // Create media recorder with optimal settings for current browser
      console.log('[Recording] Creating MediaRecorder');
      const mediaRecorder = createOptimalMediaRecorder(stream);
      console.log('[Recording] MediaRecorder created with mimeType:', mediaRecorder.mimeType);
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available event with better logging
      mediaRecorder.ondataavailable = (e) => {
        console.log(`[Recording] Data available event: data size=${e.data.size} bytes, type=${e.data.type}`);
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log(`[Recording] Data chunk added, total chunks: ${chunksRef.current.length}`);
        } else {
          console.warn('[Recording] Empty data received from recorder');
        }
      };
      
      // Add error handling for the recorder
      mediaRecorder.onerror = (event) => {
        console.error('[Recording] MediaRecorder error:', event);
        if (onError) {
          onError(new Error('MediaRecorder error occurred'));
        }
      };
      
      // Handle recording stop with more detailed logs
      mediaRecorder.onstop = async () => {
        console.log('[Recording] MediaRecorder stopped');
        
        // Validate we have chunks
        if (chunksRef.current.length === 0) {
          console.error('[Recording] No audio data chunks collected');
          if (onError) {
            onError(new Error('No audio data was captured'));
          }
          return;
        }
        
        try {
          // Create the audio blob with the recorded format
          const originalMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const audioBlob = new Blob(chunksRef.current, { type: originalMimeType });
          console.log(`[Recording] Created audio blob of size: ${audioBlob.size} bytes with type: ${audioBlob.type}`);
          
          if (audioBlob.size === 0) {
            console.error('[Recording] Created audio blob is empty');
            if (onError) {
              onError(new Error('Empty audio recording created'));
            }
            return;
          }
          
          // Prepare audio for server submission (with format optimization)
          const optimizedBlob = await prepareAudioForSubmission(audioBlob);
          console.log(`[Recording] Optimized blob size: ${optimizedBlob.size} bytes with type: ${optimizedBlob.type}`);
          
          // Create URL for local playback using optimized blob
          const url = createAudioBlobUrl(optimizedBlob);
          console.log(`[Recording] Created object URL for playback: ${url.substring(0, 30)}...`);
          setAudioUrl(url);
          setAudioBlob(optimizedBlob); // Store the optimized blob in state
          setIsRecording(false);
          
          // Notify parent component with the optimized audio blob for processing
          if (onRecordingComplete) {
            console.log('[Recording] Sending optimized recording to parent component for processing');
            onRecordingComplete(optimizedBlob);
          }
        } catch (error) {
          console.error('[Recording] Error processing recording:', error);
          if (onError) {
            onError(error instanceof Error ? error : new Error('Failed to process recording'));
          }
        } finally {
          // Stop all tracks
          if (streamRef.current) {
            console.log('[Recording] Stopping all media stream tracks');
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          
          // Clear timer
          if (timerRef.current) {
            console.log('[Recording] Clearing recording timer');
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
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
    console.log('[Recording] Stop recording requested');
    try {
      if (mediaRecorderRef.current && isRecording) {
        const recorderState = mediaRecorderRef.current.state;
        console.log(`[Recording] Stopping recording, current state: ${recorderState}`);
        
        if (recorderState === 'inactive') {
          console.warn('[Recording] MediaRecorder already inactive');
          return;
        }
        
        // Check if we have any audio data before stopping
        console.log(`[Recording] Current chunks before stopping: ${chunksRef.current.length}`);
        
        // Stop the recorder
        mediaRecorderRef.current.stop();
        console.log('[Recording] MediaRecorder.stop() called');
      } else {
        console.warn('[Recording] Cannot stop recording: recorder not available or not recording');
        console.log(`[Recording] Recorder exists: ${!!mediaRecorderRef.current}, isRecording: ${isRecording}`);
      }
    } catch (error) {
      console.error('[Recording] Error stopping recording:', error);
      // Cleanup resources even if there was an error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
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
