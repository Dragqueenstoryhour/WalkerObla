/**
 * Comprehensive audio utilities for cross-browser recording and playback compatibility
 * Handles Safari, iOS, Chrome, and other browsers with proper fallbacks
 */

export interface AudioRecordingOptions {
  preferredFormat?: string;
  sampleRate?: number;
  channelCount?: number;
}

export interface AudioPlaybackOptions {
  autoplay?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
}

/**
 * Detect browser capabilities and return optimal audio settings
 */
export function detectAudioCapabilities() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isChrome = /chrome/i.test(navigator.userAgent);
  const isFirefox = /firefox/i.test(navigator.userAgent);

  // Check MediaRecorder support and formats
  const supportedMimeTypes = [
    'audio/wav',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ].filter(type => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type));

  return {
    isIOS,
    isSafari,
    isChrome,
    isFirefox,
    supportedMimeTypes,
    // Preferred format based on browser
    preferredMimeType: isIOS || isSafari 
      ? (supportedMimeTypes.includes('audio/mp4') ? 'audio/mp4' : supportedMimeTypes[0])
      : (supportedMimeTypes.includes('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : supportedMimeTypes[0])
  };
}

/**
 * Get optimal recording constraints for the current browser
 */
export function getOptimalRecordingConstraints(): MediaTrackConstraints {
  const capabilities = detectAudioCapabilities();
  
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1, // Mono for better compatibility and smaller file size
    sampleRate: capabilities.isIOS || capabilities.isSafari ? 44100 : 16000, // iOS prefers 44.1kHz
  };
}

/**
 * Create a MediaRecorder with optimal settings for the current browser
 */
export function createOptimalMediaRecorder(stream: MediaStream): MediaRecorder {
  const capabilities = detectAudioCapabilities();
  
  let recorder: MediaRecorder;
  
  // Try preferred format first, then fallback to supported formats
  const formatsToTry = [
    capabilities.preferredMimeType,
    ...capabilities.supportedMimeTypes
  ].filter(Boolean);

  for (const mimeType of formatsToTry) {
    try {
      if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
        recorder = new MediaRecorder(stream, { mimeType });
        console.log(`[AudioUtils] Created MediaRecorder with format: ${mimeType}`);
        return recorder;
      }
    } catch (error) {
      console.warn(`[AudioUtils] Failed to create recorder with ${mimeType}:`, error);
    }
  }
  
  // Final fallback - let browser choose
  recorder = new MediaRecorder(stream);
  console.log(`[AudioUtils] Created MediaRecorder with default format: ${recorder.mimeType}`);
  return recorder;
}

/**
 * Convert audio blob to WAV format for maximum compatibility
 * This is crucial for Safari and iOS compatibility
 */
export async function convertToWav(audioBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Convert to WAV
          const wavBlob = audioBufferToWav(audioBuffer);
          resolve(wavBlob);
        } catch (error) {
          console.error('[AudioUtils] Error converting to WAV:', error);
          // If conversion fails, return original blob
          resolve(audioBlob);
        }
      };
      
      fileReader.onerror = () => {
        console.error('[AudioUtils] Error reading audio file for conversion');
        resolve(audioBlob); // Return original on error
      };
      
      fileReader.readAsArrayBuffer(audioBlob);
    } catch (error) {
      console.error('[AudioUtils] Error in WAV conversion setup:', error);
      resolve(audioBlob); // Return original on error
    }
  });
}

/**
 * Convert AudioBuffer to WAV blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);
  
  // Convert audio data
  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Create an optimized audio element for playback across all browsers
 */
export function createOptimalAudioElement(src: string, options: AudioPlaybackOptions = {}): HTMLAudioElement {
  const audio = new Audio();
  const capabilities = detectAudioCapabilities();
  
  // Set optimal properties for cross-browser compatibility
  audio.preload = options.preload || 'metadata';
  audio.crossOrigin = 'anonymous';
  
  // iOS/Safari specific optimizations
  if (capabilities.isIOS || capabilities.isSafari) {
    // Safari requires user interaction before playing
    audio.muted = false;
    (audio as any).playsInline = true;
    (audio as any).webkitPreservesPitch = false;
  }
  
  audio.src = src;
  
  return audio;
}

/**
 * Safe audio playback with fallback handling
 */
export async function safeAudioPlay(audioElement: HTMLAudioElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const capabilities = detectAudioCapabilities();
    
    // Set up event listeners
    const onCanPlay = () => {
      cleanup();
      
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[AudioUtils] Audio playback started successfully');
            resolve();
          })
          .catch((error) => {
            console.error('[AudioUtils] Audio play promise rejected:', error);
            
            // Try fallback for mobile browsers
            if (capabilities.isIOS || capabilities.isSafari) {
              setTimeout(() => {
                audioElement.play().catch((fallbackError) => {
                  console.error('[AudioUtils] Fallback play failed:', fallbackError);
                  reject(fallbackError);
                });
              }, 100);
            } else {
              reject(error);
            }
          });
      } else {
        // Older browsers
        try {
          audioElement.play();
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    };
    
    const onError = (error: Event) => {
      cleanup();
      console.error('[AudioUtils] Audio loading error:', error);
      reject(new Error('Audio loading failed'));
    };
    
    const onLoadError = () => {
      cleanup();
      console.error('[AudioUtils] Audio load error');
      reject(new Error('Audio failed to load'));
    };
    
    const cleanup = () => {
      audioElement.removeEventListener('canplay', onCanPlay);
      audioElement.removeEventListener('error', onError);
      audioElement.removeEventListener('abort', onLoadError);
    };
    
    // Set up listeners
    audioElement.addEventListener('canplay', onCanPlay);
    audioElement.addEventListener('error', onError);
    audioElement.addEventListener('abort', onLoadError);
    
    // Start loading
    audioElement.load();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      cleanup();
      reject(new Error('Audio playback timeout'));
    }, 10000);
  });
}

/**
 * Create a blob URL with proper cleanup
 */
export function createAudioBlobUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  
  // Auto-cleanup after 10 minutes to prevent memory leaks
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 600000);
  
  return url;
}

/**
 * Prepare audio blob for server submission with format optimization
 */
export async function prepareAudioForSubmission(blob: Blob): Promise<Blob> {
  const capabilities = detectAudioCapabilities();
  
  // For Safari/iOS, always convert to WAV for maximum server compatibility
  if (capabilities.isIOS || capabilities.isSafari || !blob.type.includes('webm')) {
    console.log('[AudioUtils] Converting audio to WAV for server compatibility');
    return await convertToWav(blob);
  }
  
  // For other browsers, use original if it's already in a good format
  return blob;
}