import { Howl, Howler } from 'howler';

export class SoundManager {
  private sounds: Record<string, Howl>;
  private volume: number;
  private isMuted: boolean;
  private isInitialized: boolean;
  
  constructor() {
    this.sounds = {};
    this.volume = 0.5;
    this.isMuted = false;
    this.isInitialized = false;
  }
  
  initialize() {
    if (this.isInitialized) return;
    
    // Initialize Howler global settings
    Howler.volume(this.volume);
    
    // Create sound effects - using simple sound sprites
    this.sounds = {
      hover: new Howl({
        src: [this.generateToneDataURI(350, 0.1)],
        volume: 0.4
      }),
      select: new Howl({
        src: [this.generateToneDataURI(440, 0.3)],
        volume: 0.5
      }),
      click: new Howl({
        src: [this.generateToneDataURI(270, 0.2)],
        volume: 0.3
      }),
      drag: new Howl({
        src: [this.generateToneDataURI(200, 0.5)],
        volume: 0.2
      }),
      success: new Howl({
        src: [this.generateOscillatorToneDataURI('triangle', 600, 0.3)],
        volume: 0.6
      }),
      complete: new Howl({
        src: [this.generateCompleteSound()],
        volume: 0.7
      }),
      // Ocean ambience created procedurally
      ocean: new Howl({
        src: [this.generateOceanAmbienceURI()],
        volume: 0.3,
        loop: true
      })
    };
    
    this.isInitialized = true;
  }
  
  playSound(id: string) {
    if (!this.isInitialized || this.isMuted) return;
    
    const sound = this.sounds[id];
    if (sound) {
      sound.play();
    }
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    Howler.mute(this.isMuted);
    return this.isMuted;
  }
  
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.volume);
    return this.volume;
  }
  
  // Generate simple tones programmatically instead of loading audio files
  private generateToneDataURI(frequency: number, duration: number): string {
    // Generate a simple sine wave tone
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Simple envelope to avoid clicks
      const envelope = Math.min(1, 10 * t) * Math.min(1, 10 * (duration - t));
      samples[i] = envelope * Math.sin(2 * Math.PI * frequency * t);
    }
    
    return this.floatArrayToDataURI(samples, sampleRate);
  }
  
  // Generate more complex tones with different waveforms
  private generateOscillatorToneDataURI(waveform: 'sine' | 'square' | 'triangle' | 'sawtooth', frequency: number, duration: number): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Simple envelope to avoid clicks
      const envelope = Math.min(1, 10 * t) * Math.min(1, 10 * (duration - t));
      
      let sample = 0;
      
      switch (waveform) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
          break;
      }
      
      samples[i] = envelope * sample;
    }
    
    return this.floatArrayToDataURI(samples, sampleRate);
  }
  
  // Generate a more complex sound for completing a level
  private generateCompleteSound(): string {
    const sampleRate = 44100;
    const duration = 1.0;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);
    
    // A simple ascending arpeggio
    const baseFreq = 440; // A4
    const notes = [1, 1.25, 1.5, 2]; // Major chord intervals
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const noteIndex = Math.min(notes.length - 1, Math.floor(t * 8));
      const freq = baseFreq * notes[noteIndex];
      
      // Envelope for each note
      const noteTime = t - (noteIndex * 0.125);
      const envelope = Math.min(1, 10 * noteTime) * Math.min(1, 10 * (0.125 - noteTime));
      
      // Mix triangle and sine waves
      const triangleWave = 0.7 * (2 * Math.abs(2 * (t * freq - Math.floor(t * freq + 0.5))) - 1);
      const sineWave = 0.3 * Math.sin(2 * Math.PI * freq * t);
      
      samples[i] = envelope * (triangleWave + sineWave);
    }
    
    return this.floatArrayToDataURI(samples, sampleRate);
  }
  
  // Generate ocean ambience
  private generateOceanAmbienceURI(): string {
    const sampleRate = 44100;
    const duration = 5.0; // 5 seconds of ambient sound that can be looped
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);
    
    // Ocean waves are created by filtered noise with slow amplitude modulation
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // Multiple noise sources with different frequencies
      let noise = 0;
      for (let j = 1; j <= 5; j++) {
        noise += (Math.random() * 2 - 1) * (1 / j) * 
                 Math.sin(Math.PI * Math.sin(t * 0.1 * j + j));
      }
      
      // Slow wave modulation
      const waveAmplitude = 0.2 + 0.1 * Math.sin(2 * Math.PI * 0.05 * t) + 
                            0.05 * Math.sin(2 * Math.PI * 0.11 * t);
      
      samples[i] = waveAmplitude * noise * 0.3;
    }
    
    return this.floatArrayToDataURI(samples, sampleRate);
  }
  
  // Helper to convert audio samples to WAV format for Howler
  private floatArrayToDataURI(samples: Float32Array, sampleRate: number): string {
    // Convert Float32Array to Int16Array (WAV format)
    const buffer = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Create WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.byteLength, true);
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // sub-chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono channel
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, buffer.byteLength, true);
    
    // Combine header and data
    const blob = new Blob([header, buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }
}

// Helper function to write strings to DataView
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}