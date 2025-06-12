import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

// Define the interface for viseme animation data
export interface VisemeAnimationData {
  visemeId: number;
  audioOffset: number;
  animation?: string; // SVG string for 2D or JSON string for 3D blendshapes
}

// Define the interface for consolidated viseme data
export interface ConsolidatedVisemeData {
  visemes: VisemeAnimationData[];
  audioBuffer: Buffer;
  duration: number;
}

/**
 * Convert audio to WAV format for Azure Speech API
 */
async function convertAudioToWav(audioBuffer: Buffer, tempDir: string = "/tmp"): Promise<string> {
  // Create a temporary file with random name
  const tempInputPath = path.join(tempDir, `input_${Date.now()}_${Math.floor(Math.random() * 10000)}.bin`);
  const tempOutputPath = path.join(tempDir, `output_${Date.now()}_${Math.floor(Math.random() * 10000)}.wav`);
  
  try {
    // Write the input buffer to the temp file
    await promisify(fs.writeFile)(tempInputPath, audioBuffer);
    
    // Use ffmpeg to convert to WAV (16kHz, mono, PCM)
    const ffmpeg = spawn('ffmpeg', [
      '-y',  // Overwrite output files
      '-i', tempInputPath,
      '-ar', '16000',  // Sample rate: 16kHz
      '-ac', '1',      // Channels: mono
      '-c:a', 'pcm_s16le',  // Codec: PCM 16-bit little-endian
      tempOutputPath
    ]);
    
    // Wait for ffmpeg to finish
    await new Promise<void>((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (err) => {
        reject(err);
      });
    });
    
    // Read the converted file
    const wavBuffer = await promisify(fs.readFile)(tempOutputPath);
    
    // Clean up temporary files
    await Promise.all([
      promisify(fs.unlink)(tempInputPath).catch(() => {}),
      promisify(fs.unlink)(tempOutputPath).catch(() => {})
    ]);
    
    return tempOutputPath;
  } catch (error) {
    console.error('Error converting audio to WAV:', error);
    throw new Error(`Failed to convert audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate an SVG for a specific viseme
 * 
 * These are simplified mouth shapes corresponding to Azure's 22 viseme IDs (0-21)
 */
function generateVisemeSvg(visemeId: number): string {
  // Define the mouth shapes for each viseme ID (0-21) from Azure's documentation
  const visemePaths = [
    // 0: Silence - closed mouth
    `<path d="M45,70 Q65,72 85,70" stroke="black" stroke-width="2" fill="none" />`,
    
    // 1: æ, ə, ʌ - as in "bat", "about", "cut"
    `<path d="M45,65 Q65,75 85,65" stroke="black" stroke-width="2" fill="none" />`,
    
    // 2: ɑ - as in "father" - wide open mouth
    `<path d="M45,60 Q65,85 85,60" stroke="black" stroke-width="2" fill="none" />`,
    
    // 3: ɔ - as in "dog" - rounded open mouth 
    `<path d="M50,65 Q65,78 80,65" stroke="black" stroke-width="2" fill="none" />`,
    
    // 4: ɛ, ʊ - as in "pet", "book"
    `<path d="M45,65 Q65,72 85,65" stroke="black" stroke-width="2" fill="none" />`,
    
    // 5: ɝ - as in "bird"
    `<path d="M50,68 Q65,75 80,68" stroke="black" stroke-width="2" fill="none" />`,
    
    // 6: j, i, ɪ - as in "yes", "see", "sit" - slight smile
    `<path d="M45,68 Q65,72 85,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M45,68 C50,65 80,65 85,68" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 7: w, u - as in "we", "blue" - pursed lips
    `<circle cx="65" cy="70" r="5" stroke="black" stroke-width="2" fill="none" />`,
    
    // 8: o - as in "show" - rounded o shape
    `<circle cx="65" cy="70" r="8" stroke="black" stroke-width="2" fill="none" />`,
    
    // 9: aʊ - as in "how" - larger rounded shape
    `<circle cx="65" cy="70" r="12" stroke="black" stroke-width="2" fill="none" />`,
    
    // 10: ɔɪ - as in "boy" - transition from o to y
    `<path d="M50,65 Q65,75 80,65" stroke="black" stroke-width="2" fill="none" />
     <path d="M55,65 C60,63 70,63 75,65" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 11: aɪ - as in "fly" - transition from a to y
    `<path d="M45,65 Q65,75 85,65" stroke="black" stroke-width="2" fill="none" />
     <path d="M50,65 C55,63 75,63 80,65" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 12: h - as in "help" - slight opening
    `<path d="M50,68 Q65,73 80,68" stroke="black" stroke-width="2" fill="none" />`,
    
    // 13: ɹ - as in "red" - rounded with slight protrusion
    `<path d="M55,68 Q65,73 75,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M60,68 Q65,73 70,68" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 14: l - as in "look" - tongue against upper palate
    `<path d="M50,68 Q65,72 80,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M58,68 H72" stroke="black" stroke-width="1" fill="none" />
     <path d="M65,68 L65,73" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 15: s, z - as in "say", "zoo" - teeth almost closed
    `<path d="M50,69 Q65,71 80,69" stroke="black" stroke-width="2" fill="none" />
     <path d="M50,69 L80,69" stroke="black" stroke-width="1" stroke-dasharray="2,1" fill="none" />`,
    
    // 16: ʃ, tʃ, dʒ, ʒ - as in "show", "cheese", "judge" - rounded pursed
    `<path d="M55,68 Q65,72 75,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M60,68 Q65,71 70,68" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 17: ð - as in "then" - tongue between teeth
    `<path d="M50,69 Q65,70 80,69" stroke="black" stroke-width="2" fill="none" />
     <path d="M58,69 L72,69" stroke="black" stroke-width="1" fill="none" />
     <path d="M65,69 L65,74" stroke="black" stroke-width="2" fill="none" />`,
    
    // 18: f, v - as in "fan", "van" - lower lip against upper teeth
    `<path d="M50,68 Q65,70 80,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M50,65 L80,65" stroke="black" stroke-width="1" stroke-dasharray="2,1" fill="none" />
     <path d="M55,68 H75" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 19: d, t, n, θ - as in "did", "talk", "now", "thin"
    `<path d="M50,69 Q65,71 80,69" stroke="black" stroke-width="2" fill="none" />
     <path d="M60,69 L70,69" stroke="black" stroke-width="1" fill="none" />
     <path d="M65,66 L65,69" stroke="black" stroke-width="1" fill="none" />`,
    
    // 20: k, g, ŋ - as in "cat", "guest", "sing" - back of tongue against palate
    `<path d="M50,69 Q65,71 80,69" stroke="black" stroke-width="2" fill="none" />
     <path d="M55,69 C60,66 70,66 75,69" stroke="black" stroke-width="1" fill="none" />`,
    
    // 21: p, b, m - as in "put", "big", "mat" - lips pressed together
    `<path d="M50,70 L80,70" stroke="black" stroke-width="2.5" fill="none" />`,
  ];
  
  // Add face outline to make the mouth shapes more understandable
  const faceOutline = `
    <ellipse cx="65" cy="65" rx="45" ry="55" stroke="black" stroke-width="1.5" fill="none" />
    <circle cx="48" cy="50" r="3" fill="black" /> <!-- left eye -->
    <circle cx="82" cy="50" r="3" fill="black" /> <!-- right eye -->
    <path d="M65,42 L65,55 M55,95 Q65,100 75,95" stroke="black" stroke-width="1" fill="none" /> <!-- nose and chin -->
  `;
  
  // Return the corresponding SVG with the face outline
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" width="130" height="130">
    <rect width="100%" height="100%" fill="none" />
    ${faceOutline}
    <text x="65" y="20" text-anchor="middle" font-size="10" fill="black">Viseme ${visemeId}</text>
    ${visemePaths[visemeId] || visemePaths[0]}
  </svg>`;
  
  return svg;
}

/**
 * Generate blendshape values for a specific viseme
 * 
 * Maps Azure's 22 viseme IDs (0-21) to blendshape values for animation
 */
function generateVisemeBlendShapes(visemeId: number): string {
  // These values represent the blendshapes for each viseme in a normalized range (0.0-1.0)
  // The key names match common 3D mouth blendshapes
  const blendshapes = [
    // 0: Silent/neutral
    { jawOpen: 0.0, mouthClose: 0.5, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.0, mouthUpperUp: 0.0, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 1: ae, ax, eh (open mouth, slightly wide)
    { jawOpen: 0.5, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.1, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.3, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.3, mouthUpperUp: 0.2, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 2: aa (wide open mouth)
    { jawOpen: 0.8, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.2, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.5, mouthUpperUp: 0.2, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 3: ao (rounded open mouth)
    { jawOpen: 0.5, mouthClose: 0.0, mouthFunnel: 0.3, mouthPucker: 0.2, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.3, mouthUpperUp: 0.2, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 4: ey, eh, uh (slightly open)
    { jawOpen: 0.3, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.1, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.1, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.1, mouthLowerDown: 0.2, mouthUpperUp: 0.2, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 5: er (slight opening with tension)
    { jawOpen: 0.2, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.1, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.1, mouthShrugUpper: 0.0, mouthLowerDown: 0.2, mouthUpperUp: 0.1, mouthPress: 0.1, mouthNarrow: 0.2, tongueOut: 0.0 },
    
    // 6: y, iy, ih, ix (smile shape)
    { jawOpen: 0.2, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.5, mouthFrown: 0.0, mouthDimple: 0.1, mouthStretch: 0.3, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.1, mouthUpperUp: 0.1, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 7: w, uw (pursed lips)
    { jawOpen: 0.1, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.7, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.0, mouthUpperUp: 0.0, mouthPress: 0.3, mouthNarrow: 0.2, tongueOut: 0.0 },
    
    // 8: ow (rounded o)
    { jawOpen: 0.3, mouthClose: 0.0, mouthFunnel: 0.2, mouthPucker: 0.5, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.2, mouthUpperUp: 0.1, mouthPress: 0.1, mouthNarrow: 0.1, tongueOut: 0.0 },
    
    // 9: aw (larger rounded o)
    { jawOpen: 0.5, mouthClose: 0.0, mouthFunnel: 0.1, mouthPucker: 0.4, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.3, mouthUpperUp: 0.1, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 10: oy (transition from o to y)
    { jawOpen: 0.4, mouthClose: 0.0, mouthFunnel: 0.1, mouthPucker: 0.2, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.2, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.1, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.2, mouthUpperUp: 0.1, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 11: ay (transition from a to y)
    { jawOpen: 0.4, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.3, mouthFrown: 0.0, mouthDimple: 0.1, mouthStretch: 0.2, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.3, mouthUpperUp: 0.2, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 12: h (slightly open, relaxed)
    { jawOpen: 0.2, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.1, mouthUpperUp: 0.1, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 13: r (slight puckering)
    { jawOpen: 0.1, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.2, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.0, mouthUpperUp: 0.0, mouthPress: 0.1, mouthNarrow: 0.3, tongueOut: 0.0 },
    
    // 14: l (tongue against palate)
    { jawOpen: 0.2, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.1, mouthLowerDown: 0.2, mouthUpperUp: 0.0, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.3 },
    
    // 15: s, z (teeth close, slight smile)
    { jawOpen: 0.1, mouthClose: 0.1, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.2, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.3, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.0, mouthUpperUp: 0.0, mouthPress: 0.0, mouthNarrow: 0.1, tongueOut: 0.0 },
    
    // 16: sh, ch, jh, zh (rounded with slight protrusion)
    { jawOpen: 0.1, mouthClose: 0.0, mouthFunnel: 0.2, mouthPucker: 0.3, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.0, mouthUpperUp: 0.0, mouthPress: 0.1, mouthNarrow: 0.4, tongueOut: 0.0 },
    
    // 17: th, dh (tongue between teeth)
    { jawOpen: 0.2, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.1, mouthUpperUp: 0.0, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.5 },
    
    // 18: f, v (lower lip against upper teeth)
    { jawOpen: 0.1, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.1, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.0, mouthUpperUp: 0.1, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 19: d, t, n (tongue tip on alveolar ridge)
    { jawOpen: 0.1, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.1, mouthLowerDown: 0.0, mouthUpperUp: 0.0, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.1 },
    
    // 20: k, g, ng (back of tongue against soft palate)
    { jawOpen: 0.1, mouthClose: 0.0, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.0, mouthUpperUp: 0.0, mouthPress: 0.0, mouthNarrow: 0.0, tongueOut: 0.0 },
    
    // 21: p, b, m (lips pressed together)
    { jawOpen: 0.0, mouthClose: 0.3, mouthFunnel: 0.0, mouthPucker: 0.0, mouthLeft: 0.0, mouthRight: 0.0, mouthSmile: 0.0, mouthFrown: 0.0, mouthDimple: 0.0, mouthStretch: 0.0, mouthRollLower: 0.0, mouthRollUpper: 0.0, mouthShrugLower: 0.0, mouthShrugUpper: 0.0, mouthLowerDown: 0.0, mouthUpperUp: 0.0, mouthPress: 0.5, mouthNarrow: 0.0, tongueOut: 0.0 },
  ];
  
  // Return the JSON string for the blendshapes
  return JSON.stringify(visemeId >= 0 && visemeId < blendshapes.length 
    ? blendshapes[visemeId] 
    : blendshapes[0]);
}

/**
 * Generate speech with viseme data from text
 * @param text The text to convert to speech
 * @param voice The voice to use (e.g., "en-US-AriaNeural")
 * @param format The format of viseme animation data ("svg" for 2D or "blendshapes" for 3D)
 */
/**
 * Generate basic viseme sequence from text analysis
 */
function generateBasicVisemes(text: string, audioDurationMs: number): VisemeAnimationData[] {
  const words = text.toLowerCase().split(/\s+/);
  const visemes: VisemeAnimationData[] = [];
  const timePerWord = audioDurationMs / words.length;
  
  // Simple phoneme to viseme mapping
  const phonemeToViseme: { [key: string]: number } = {
    'silence': 0, 'p': 21, 'b': 21, 'm': 21, 'f': 18, 'v': 18,
    'th': 17, 'dh': 17, 't': 19, 'd': 19, 'n': 19, 's': 15, 'z': 15,
    'sh': 16, 'zh': 16, 'ch': 16, 'j': 16, 'k': 20, 'g': 20, 'ng': 20,
    'l': 14, 'r': 13, 'y': 6, 'w': 7, 'h': 12, 'aa': 2, 'ae': 1,
    'ah': 1, 'ao': 8, 'aw': 9, 'ay': 11, 'eh': 1, 'er': 13, 'ey': 6,
    'ih': 6, 'iy': 6, 'ow': 8, 'oy': 10, 'uh': 7, 'uw': 7
  };
  
  words.forEach((word, wordIndex) => {
    const wordStartTime = wordIndex * timePerWord;
    const chars = word.split('');
    
    chars.forEach((char, charIndex) => {
      const charTime = wordStartTime + (charIndex * (timePerWord / chars.length));
      let visemeId = 0;
      
      // Basic character to viseme mapping
      switch (char) {
        case 'p': case 'b': case 'm': visemeId = 21; break;
        case 'f': case 'v': visemeId = 18; break;
        case 't': case 'd': case 'n': visemeId = 19; break;
        case 's': case 'z': visemeId = 15; break;
        case 'k': case 'g': visemeId = 20; break;
        case 'l': visemeId = 14; break;
        case 'r': visemeId = 13; break;
        case 'w': visemeId = 7; break;
        case 'o': case 'u': visemeId = 8; break;
        case 'a': case 'e': visemeId = 1; break;
        case 'i': case 'y': visemeId = 6; break;
        default: visemeId = 0;
      }
      
      visemes.push({
        visemeId,
        audioOffset: charTime,
        animation: generateVisemeSvg(visemeId) // Using SVG format for consistency
      });
    });
  });
  
  return visemes;
}

export async function generateSpeechWithVisemes(
  text: string,
  voice = "en-US-GuyNeural",
  format: "svg" | "blendshapes" = "blendshapes",
  speed = 1.0
): Promise<ConsolidatedVisemeData> {
  try {
    // Use the existing working Azure synthesis from azure.ts
    const { synthesizeSpeech } = await import('./azure');
    console.log(`Generating speech and visemes for: "${text}"`);
    
    // Generate audio using the working Azure implementation
    const audioBuffer = await synthesizeSpeech(text, voice, speed);
    
    // Calculate audio duration (for 16kHz 16-bit mono PCM)
    const durationMs = (audioBuffer.length / (16000 * 2)) * 1000;
    console.log(`Audio generated successfully. Duration: ${durationMs}ms, Buffer size: ${audioBuffer.length} bytes`);
    
    // Generate visemes based on text analysis and actual audio duration
    const visemes = generateBasicVisemes(text, durationMs);
    
    // Scale viseme timing to match the actual audio duration
    if (visemes.length > 0) {
      const maxOriginalOffset = Math.max(...visemes.map(v => v.audioOffset));
      const scalingFactor = durationMs / maxOriginalOffset;
      
      visemes.forEach(viseme => {
        viseme.audioOffset = viseme.audioOffset * scalingFactor;
      });
    }
    
    console.log(`Generated ${visemes.length} visemes for lip sync animation`);
    
    return {
      visemes,
      audioBuffer,
      duration: durationMs / 1000 // Convert to seconds
    };
  } catch (error) {
    console.error('Error in generateSpeechWithVisemes:', error);
    throw new Error(`Failed to generate speech with visemes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process audio file to extract viseme data
 * This uses speech recognition with viseme events to analyze existing audio
 * @param audioBuffer The audio buffer to process
 * @param format The format of viseme animation data ("svg" for 2D or "blendshapes" for 3D)
 */
export async function processAudioForVisemes(
  audioBuffer: Buffer,
  format: "svg" | "blendshapes" = "blendshapes"
): Promise<ConsolidatedVisemeData> {
  // Validate the Azure key
  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
    throw new Error("Azure Speech credentials not found. Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION");
  }
  
  try {
    // Convert audio to WAV format for Azure Speech API
    const wavFilePath = await convertAudioToWav(audioBuffer);
    
    // Read the converted WAV file into memory
    const wavBuffer = await promisify(fs.readFile)(wavFilePath);
    
    // Create Azure Speech Config with credentials
    const speechConfig = speechsdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY, 
      process.env.AZURE_SPEECH_REGION
    );
    
    // Create a PushAudioInputStream and write the WAV data to it
    const pushStream = speechsdk.AudioInputStream.createPushStream();
    pushStream.write(wavBuffer);
    pushStream.close();
    
    // Create audio config from the push stream instead of from a file
    const audioConfig = speechsdk.AudioConfig.fromStreamInput(pushStream);
    
    // Create a speech recognizer
    const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);
    
    // Keep track of the viseme data
    const visemes: VisemeAnimationData[] = [];
    let durationMs = 0;
    
    return new Promise<ConsolidatedVisemeData>((resolve, reject) => {
      // Set up the viseme event handler
      recognizer.visemeReceived = (s, e) => {
        // Extract offset and viseme ID
        const visemeId = e.visemeId;
        const audioOffset = e.audioOffset / 10000; // Convert 100-nanosecond units to milliseconds
        
        // Map viseme ID to animation data
        const animation = format === "svg"
          ? generateVisemeSvg(visemeId)
          : generateVisemeBlendShapes(visemeId);
        
        visemes.push({
          visemeId,
          audioOffset,
          animation
        });
        
        // Update duration if this is the latest viseme
        durationMs = Math.max(durationMs, audioOffset);
      };
      
      // Start recognition
      recognizer.recognizeOnceAsync(
        result => {
          // No matter the recognition result, we just care about the visemes
          console.log(`Recognition result: ${result.text}`);
          
          // Sort visemes by audio offset
          visemes.sort((a, b) => a.audioOffset - b.audioOffset);
          
          // Clean up
          recognizer.close();
          
          // Return the consolidated data - using the original audio buffer
          resolve({
            visemes,
            audioBuffer,
            // Duration: add 1 second to last viseme to ensure animation completes
            duration: durationMs + 1000
          });
        },
        error => {
          console.error(`Error recognizing speech: ${error}`);
          recognizer.close();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Error processing audio for visemes:', error);
    throw error;
  }
}

/**
 * Convert viseme data to CSV format
 * @param visemeData The consolidated viseme data
 * @param format The format of the animation data ("svg" or "blendshapes")
 */
export function convertVisemesToCsv(visemeData: ConsolidatedVisemeData, format: "svg" | "blendshapes" = "blendshapes"): string {
  // Prepare the CSV headers based on format
  let csvHeader = "";
  if (format === "svg") {
    csvHeader = "time,viseme_id,svg\n";
  } else {
    // For 3D blendshapes, first build a comprehensive list of all possible properties
    const blendshapeSet = new Set<string>();
    for (const viseme of visemeData.visemes) {
      if (viseme.animation) {
        const blendshapeObj = JSON.parse(viseme.animation);
        Object.keys(blendshapeObj).forEach(key => blendshapeSet.add(key));
      }
    }
    
    // Create the header with all detected blendshape properties
    csvHeader = "time,viseme_id," + Array.from(blendshapeSet).join(",") + "\n";
  }
  
  // Add data rows
  let csvRows = "";
  visemeData.visemes.forEach(viseme => {
    // Convert time to seconds
    const timeInSeconds = viseme.audioOffset / 1000;
    
    if (format === "svg") {
      // For SVG format, just include the SVG data
      csvRows += `${timeInSeconds},${viseme.visemeId},"${viseme.animation?.replace(/"/g, '""')}"\n`;
    } else {
      // For blendshapes, parse the JSON and convert to CSV values
      const blendshapeObj = viseme.animation ? JSON.parse(viseme.animation) : {};
      const blendshapeSet = new Set<string>();
      Object.keys(blendshapeObj).forEach(key => blendshapeSet.add(key));
      
      // Extract and format blendshape values, ensuring order matches header
      const blendshapeValues = Array.from(blendshapeSet)
        .map(key => blendshapeObj[key] || 0)
        .join(",");
      
      csvRows += `${timeInSeconds},${viseme.visemeId},${blendshapeValues}\n`;
    }
  });
  
  return csvHeader + csvRows;
}