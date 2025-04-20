declare module 'howler' {
  export interface HowlOptions {
    src: string[];
    volume?: number;
    html5?: boolean;
    loop?: boolean;
    preload?: boolean;
    autoplay?: boolean;
    mute?: boolean;
    sprite?: Record<string, [number, number]>;
    rate?: number;
    pool?: number;
    format?: string[];
    xhr?: {
      method?: string;
      headers?: Record<string, string>;
      withCredentials?: boolean;
    };
    onload?: () => void;
    onloaderror?: (soundId: number, error: any) => void;
    onplay?: (soundId: number) => void;
    onend?: (soundId: number) => void;
    onpause?: (soundId: number) => void;
    onstop?: (soundId: number) => void;
    onmute?: (soundId: number) => void;
    onvolume?: (soundId: number) => void;
    onrate?: (soundId: number) => void;
    onseek?: (soundId: number) => void;
    onfade?: (soundId: number) => void;
    onunlock?: () => void;
  }

  export class Howl {
    constructor(options: HowlOptions);
    play(sprite?: string | number): number;
    pause(id?: number): this;
    stop(id?: number): this;
    mute(muted?: boolean, id?: number): this | boolean;
    volume(vol?: number, id?: number): this | number;
    fade(from: number, to: number, duration: number, id?: number): this;
    rate(rate?: number, id?: number): this | number;
    seek(seek?: number, id?: number): this | number;
    playing(id?: number): boolean;
    duration(id?: number): number;
    state(): 'unloaded' | 'loading' | 'loaded';
    on(event: string, callback: (...args: any[]) => void, id?: number): this;
    once(event: string, callback: (...args: any[]) => void, id?: number): this;
    off(event: string, callback?: (...args: any[]) => void, id?: number): this;
    loop(loop?: boolean, id?: number): this | boolean;
  }

  export const Howler: {
    volume(vol?: number): number | this;
    mute(muted?: boolean): boolean | this;
    codecs(ext: string): boolean;
    unload(): void;
    usingWebAudio: boolean;
    noAudio: boolean;
    ctx: AudioContext;
    masterGain: GainNode;
  };
}