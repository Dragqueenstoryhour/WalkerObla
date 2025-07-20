/**
 * Comprehensive audio utilities for cross-browser recording and playback compatibility
 * Handles Safari, iOS, Chrome, and other browsers with proper fallbacks
 */

// Constants for audio processing
export const AZURE_OPTIMAL_SAMPLE_RATE = 16000; // Azure Speech Services optimal sample rate
export const IOS_PREFERRED_SAMPLE_RATE = 44100; // iOS often prefers 44.1kHz
export const AUDIO_PLAYBACK_TIMEOUT_MS = 10000; // 10 seconds
export const BLOB_URL_CLEANUP_DELAY_MS = 600000; // 10 minutes

export interface AudioRecordingOptions {
  preferredFormat?: string;
  sampleRate?: number;
  channelCount?: number;
}

export interface AudioPlaybackOptions {
  autoplay?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  crossOrigin?: string;
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
      : (supportedMimeTypes.includes('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : supportedMimeTypes[0]) // Prefer opus for quality if available
  };
}

/**
 * Get optimal recording constraints for the current browser
 */
export function getOptimalRecordingConstraints(): MediaTrackConstraints {
  const capabilities = detectAudioCapabilities();
  const constraints: MediaTrackConstraints = {
    sampleRate: AZURE_OPTIMAL_SAMPLE_RATE, 
    channelCount: 1,    // Mono
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  // On iOS/Safari, prefer specific audio settings
  if (capabilities.isIOS || capabilities.isSafari) {
    // Safari/iOS might not support advanced constraints as well, so keep it simpler
    // Or might need specific settings for better compatibility.
    // For now, stick to basic good quality settings.
    constraints.sampleRate = IOS_PREFERRED_SAMPLE_RATE; // iOS often prefers 44.1kHz
    constraints.channelCount = 1;
  }

  return constraints;
}

/**
 * Create a MediaRecorder instance with optimal settings
 */
export function createOptimalMediaRecorder(stream: MediaStream): MediaRecorder | null {
  const capabilities = detectAudioCapabilities();
  const options: MediaRecorderOptions = {};

  // Select preferred MIME type for recording
  if (capabilities.preferredMimeType) {
    options.mimeType = capabilities.preferredMimeType;
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.warn(`Preferred MIME type ${options.mimeType} not supported, trying alternatives.`);
      // Fallback to first supported type if preferred is not available
      options.mimeType = capabilities.supportedMimeTypes[0];
      if (!options.mimeType) {
        console.error("No supported MIME types found for MediaRecorder.");
        return null;
      }
    }
  } else {
    console.warn("No preferred MIME type detected, MediaRecorder will try default.");
  }

  try {
    const recorder = new MediaRecorder(stream, options);
    console.log(`[AudioUtils] MediaRecorder created with MIME type: ${recorder.mimeType}`);
    return recorder;
  } catch (error) {
    console.error("Error creating MediaRecorder:", error);
    // If specific MIME type fails, try without it
    try {
      const recorder = new MediaRecorder(stream);
      console.warn("[AudioUtils] Created MediaRecorder with default MIME type due to previous error.");
      return recorder;
    } catch (defaultError) {
      console.error("Failed to create MediaRecorder even with default settings:", defaultError);
      return null;
    }
  }
}

/**
 * Convert Blob to WAV using Web Audio API for cross-browser compatibility.
 * Especially useful for Safari/iOS which might record in unsupported formats like MP4/M4A
 * or for ensuring consistent WAV output for server processing.
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

async function convertToWav(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const currentAudioContext = getAudioContext();
    const fileReader = new FileReader();

    fileReader.onloadend = async () => {
      try {
        if (!fileReader.result || typeof fileReader.result === 'string') {
          throw new Error("Failed to read audio blob as ArrayBuffer.");
        }
        const audioBuffer = await currentAudioContext.decodeAudioData(fileReader.result);

        // Resample to 16kHz if not already
        const desiredSampleRate = AZURE_OPTIMAL_SAMPLE_RATE;
        let finalBuffer = audioBuffer;
        if (audioBuffer.sampleRate !== desiredSampleRate) {
          const numberOfChannels = audioBuffer.numberOfChannels;
          const oldSampleRate = audioBuffer.sampleRate;
          const length = audioBuffer.length * desiredSampleRate / oldSampleRate;
          const newBuffer = currentAudioContext.createBuffer(numberOfChannels, length, desiredSampleRate);

          for (let i = 0; i < numberOfChannels; i++) {
            const oldChannelData = audioBuffer.getChannelData(i);
            const newChannelData = newBuffer.getChannelData(i);
            const resampleRatio = oldSampleRate / desiredSampleRate;

            for (let j = 0; j < newChannelData.length; j++) {
              const index = Math.floor(j * resampleRatio);
              if (index < oldChannelData.length) {
                newChannelData[j] = oldChannelData[index];
              }
            }
          }
          finalBuffer = newBuffer;
          console.log(`[AudioUtils] Resampled audio from ${oldSampleRate}Hz to ${desiredSampleRate}Hz.`);
        }

        const wavBlob = audioBufferToWavBlob(finalBuffer, desiredSampleRate);
        resolve(wavBlob);
      } catch (e) {
        console.error("Error during WAV conversion:", e);
        reject(e);
      }
    };

    fileReader.onerror = (e) => {
      console.error("FileReader error:", e);
      reject(new Error("Failed to read audio blob."));
    };

    fileReader.readAsArrayBuffer(blob);
  });
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWavBlob(audioBuffer: AudioBuffer, sampleRate: number): Blob {
  const numOfChan = audioBuffer.numberOfChannels;
  const ambuf = audioBuffer.getChannelData(0); // Only process first channel for mono
  const len = ambuf.length * numOfChan;
  const buf = new Float32Array(len);
  const dataview = new DataView(new ArrayBuffer(44 + len * 2)); // 44 is header size, 2 bytes per sample

  let i = 0;
  for (let s = 0; s < ambuf.length; s++) {
    buf[i++] = ambuf[s];
  }

  function writeString(view: DataView, offset: number, s: string) {
    for (let j = 0; j < s.length; j++) {
      view.setUint8(offset + j, s.charCodeAt(j));
    }
  }

  let offset = 0;
  writeString(dataview, offset, 'RIFF'); offset += 4;
  dataview.setUint32(offset, 36 + len * 2, true); offset += 4; // file size
  writeString(dataview, offset, 'WAVE'); offset += 4;
  writeString(dataview, offset, 'fmt '); offset += 4;
  dataview.setUint32(offset, 16, true); offset += 4; // format chunk size
  dataview.setUint16(offset, 1, true); offset += 2; // compression code (1 for PCM)
  dataview.setUint16(offset, numOfChan, true); offset += 2; // number of channels
  dataview.setUint32(offset, sampleRate, true); offset += 4; // sample rate
  dataview.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4; // byte rate
  dataview.setUint16(offset, numOfChan * 2, true); offset += 2; // block align
  dataview.setUint16(offset, 16, true); offset += 2; // bits per sample
  writeString(dataview, offset, 'data'); offset += 4;
  dataview.setUint32(offset, len * 2, true); offset += 4; // data chunk size

  for (let s = 0; s < len; s++, offset += 2) {
    let val = buf[s] < 0 ? buf[s] * 0x8000 : buf[s] * 0x7FFF;
    dataview.setInt16(offset, val, true);
  }

  return new Blob([dataview.buffer], { type: 'audio/wav' });
}


/**
 * Prepare audio blob for server submission with format optimization
 */
export async function prepareAudioForSubmission(blob: Blob): Promise<Blob> {
  const capabilities = detectAudioCapabilities();

  // For Safari/iOS, always convert to WAV for maximum server compatibility
  // Also convert if the original blob type is not webm (e.g., if it's m4a from some Androids)
  if (capabilities.isIOS || capabilities.isSafari || !blob.type.includes('webm')) {
    console.log('[AudioUtils] Converting audio to WAV for server compatibility (Safari/iOS or non-webm source)');
    return await convertToWav(blob);
  }

  // For other browsers, use original if it's webm
  console.log('[AudioUtils] Using original audio blob for submission (likely webm)');
  return blob;
}

/**
 * Load an audio blob into an Audio element for playback, handling potential errors.
 */
export function loadAudioForPlayback(audioElement: HTMLAudioElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    audioElement.src = url;
    audioElement.preload = 'auto'; // Load metadata and potentially entire file

    const onCanPlay = () => {
      console.log('[AudioUtils] Audio ready for playback.');
      cleanup();
      resolve();
    };

    const onError = (e: Event) => {
      console.error('[AudioUtils] Error loading audio:', e);
      cleanup();
      reject(new Error('Failed to load audio for playback.'));
    };

    const onLoadError = () => {
      console.error('[AudioUtils] Audio loading aborted or encountered error.');
      cleanup();
      reject(new Error('Audio loading aborted or encountered error.'));
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
    }, AUDIO_PLAYBACK_TIMEOUT_MS);
  });
}

/**
 * Create an optimal audio element for the current browser environment
 */
export function createOptimalAudioElement(src: string, options: AudioPlaybackOptions = {}): HTMLAudioElement {
  const audio = new Audio();
  const capabilities = detectAudioCapabilities();
  
  // Set optimal properties based on browser
  audio.preload = options.preload || (capabilities.isIOS || capabilities.isSafari ? 'metadata' : 'auto');
  if (options.crossOrigin) {
    audio.crossOrigin = options.crossOrigin;
  }
  
  // iOS/Safari specific optimizations
  if (capabilities.isIOS || capabilities.isSafari) {
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
  }
  
  audio.src = src;
  return audio;
}

/**
 * Safely play audio with enhanced error handling and fallbacks
 */
export async function safeAudioPlay(audio: HTMLAudioElement): Promise<void> {
  const capabilities = detectAudioCapabilities();
  
  try {
    // For iOS/Safari, try to load the audio first
    if (capabilities.isIOS || capabilities.isSafari) {
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (e: Event) => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          reject(new Error('Audio loading failed'));
        };
        
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('error', onError);
        
        audio.load();
      });
    }
    
    // Attempt to play
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      await playPromise;
    }
    
  } catch (error) {
    console.error('[SafeAudioPlay] Primary play attempt failed:', error);
    
    // Fallback: try creating a new audio element
    try {
      const fallbackAudio = new Audio(audio.src);
      if (audio.crossOrigin) {
        fallbackAudio.crossOrigin = audio.crossOrigin;
      }
      
      if (capabilities.isIOS || capabilities.isSafari) {
        fallbackAudio.setAttribute('playsinline', 'true');
        fallbackAudio.setAttribute('webkit-playsinline', 'true');
      }
      
      const fallbackPlayPromise = fallbackAudio.play();
      if (fallbackPlayPromise !== undefined) {
        await fallbackPlayPromise;
      }
    } catch (fallbackError) {
      console.error('[SafeAudioPlay] Fallback play attempt failed:', fallbackError);
      throw new Error('Audio playback failed on this device');
    }
  }
}

/**
 * Create a blob URL with proper cleanup
 */
export function createAudioBlobUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);

  // Auto-cleanup after 10 minutes to prevent memory leaks
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, BLOB_URL_CLEANUP_DELAY_MS); // 10 minutes

  console.log(`[AudioUtils] Created Blob URL: ${url}`);
  return url;
}