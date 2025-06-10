/**
 * Utility functions for enhanced audio playback compatibility across browsers,
 * especially mobile Safari on iPhone
 */

export interface AudioPlaybackOptions {
  onPlay?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  preload?: 'auto' | 'metadata' | 'none';
  crossOrigin?: 'anonymous' | 'use-credentials' | null;
}

/**
 * Enhanced audio playback function optimized for mobile Safari/iPhone compatibility
 */
export const playAudioWithEnhancedCompatibility = async (
  audioSource: string | Blob,
  options: AudioPlaybackOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    
    // Enhanced settings for mobile Safari compatibility
    audio.preload = options.preload || 'auto';
    if (options.crossOrigin) {
      audio.crossOrigin = options.crossOrigin;
    }
    
    // Enhanced error handling
    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      if (options.onError) {
        options.onError(e);
      }
      reject(e);
    };

    // Success callbacks
    audio.onplay = () => {
      if (options.onPlay) {
        options.onPlay();
      }
    };

    audio.onended = () => {
      if (options.onEnded) {
        options.onEnded();
      }
      // Clean up blob URLs
      if (typeof audioSource !== 'string' && audio.src) {
        URL.revokeObjectURL(audio.src);
      }
      resolve();
    };

    // Promise-based playback for better mobile support
    const attemptPlayback = () => {
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Audio playback started successfully');
        }).catch((error) => {
          console.error('Audio play promise rejected:', error);
          
          // Fallback: try creating a new audio element
          const fallbackAudio = new Audio();
          if (typeof audioSource === 'string') {
            fallbackAudio.src = audioSource;
          } else {
            fallbackAudio.src = URL.createObjectURL(audioSource);
          }
          
          fallbackAudio.play().catch(fallbackError => {
            console.error('Fallback audio play failed:', fallbackError);
            reject(fallbackError);
          });
        });
      }
    };

    // Use multiple event listeners for better compatibility
    audio.oncanplay = attemptPlayback;
    audio.onloadeddata = attemptPlayback;
    
    // Set the audio source
    if (typeof audioSource === 'string') {
      audio.src = audioSource;
    } else {
      const audioUrl = URL.createObjectURL(audioSource);
      audio.src = audioUrl;
    }
    
    // For mobile Safari, sometimes we need to explicitly trigger load
    audio.load();
  });
};

/**
 * Play user recording with enhanced compatibility
 */
export const playUserRecording = async (
  recordingBlob: Blob,
  options: AudioPlaybackOptions = {}
): Promise<void> => {
  try {
    await playAudioWithEnhancedCompatibility(recordingBlob, {
      preload: 'auto',
      crossOrigin: 'anonymous',
      ...options
    });
  } catch (error) {
    console.error('Error playing user recording:', error);
    throw error;
  }
};

/**
 * Play TTS audio with enhanced compatibility
 */
export const playTTSAudio = async (
  audioBlob: Blob,
  options: AudioPlaybackOptions = {}
): Promise<void> => {
  try {
    await playAudioWithEnhancedCompatibility(audioBlob, {
      preload: 'metadata',
      crossOrigin: 'anonymous',
      ...options
    });
  } catch (error) {
    console.error('Error playing TTS audio:', error);
    throw error;
  }
};

/**
 * Fetch and play audio from URL with enhanced compatibility
 */
export const fetchAndPlayAudio = async (
  url: string,
  options: AudioPlaybackOptions = {}
): Promise<void> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }
    
    const audioBlob = await response.blob();
    await playAudioWithEnhancedCompatibility(audioBlob, {
      preload: 'auto',
      crossOrigin: 'anonymous',
      ...options
    });
  } catch (error) {
    console.error('Error fetching and playing audio:', error);
    throw error;
  }
};