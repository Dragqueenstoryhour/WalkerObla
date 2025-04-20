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
    
    try {
      // Initialize Howler global settings
      Howler.volume(this.volume);
      
      // Create simple sound effects with short durations
      this.sounds = {
        hover: new Howl({
          src: ['/sounds/hover.mp3'],
          volume: 0.4,
          html5: true,
          // Fallback if file doesn't exist
          onloaderror: () => {
            console.log("Fallback to simple beep for hover");
            this.sounds.hover = this.createSimpleTone(300, 0.1);
          }
        }),
        select: new Howl({
          src: ['/sounds/select.mp3'],
          volume: 0.5,
          html5: true,
          onloaderror: () => {
            console.log("Fallback to simple beep for select");
            this.sounds.select = this.createSimpleTone(440, 0.2);
          }
        }),
        click: new Howl({
          src: ['/sounds/click.mp3'],
          volume: 0.3,
          html5: true,
          onloaderror: () => {
            console.log("Fallback to simple beep for click");
            this.sounds.click = this.createSimpleTone(220, 0.15);
          }
        }),
        drag: new Howl({
          src: ['/sounds/drag.mp3'],
          volume: 0.2,
          html5: true,
          onloaderror: () => {
            console.log("Fallback to simple beep for drag");
            this.sounds.drag = this.createSimpleTone(180, 0.3);
          }
        })
      };
      
      this.isInitialized = true;
    } catch (error) {
      console.error("Error initializing sound manager:", error);
    }
  }
  
  // Create simple tone as fallback
  private createSimpleTone(frequency: number, duration: number): Howl {
    // Use a very simple audio object as fallback
    return new Howl({
      src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAIAQB8AAEAfAAABAAgAAABMYXZmNTguNDYuMTAyAA=='],
      volume: 0.3
    });
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
}