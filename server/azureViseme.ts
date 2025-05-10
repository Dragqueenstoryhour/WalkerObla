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
  // Define paths for each viseme ID (0-21)
  const visemePaths = [
    // 0: Silent viseme (neutral/closed)
    '<path d="M50,70 Q65,75 80,70" stroke="black" stroke-width="2" fill="none" />',
    
    // 1: ae, ax, eh (as in "bat", "about", "met")
    '<path d="M50,65 Q65,80 80,65" stroke="black" stroke-width="2" fill="none" />',
    
    // 2: aa (as in "father")
    '<path d="M50,60 Q65,85 80,60" stroke="black" stroke-width="2" fill="none" />',
    
    // 3: ao (as in "dog")
    '<path d="M50,65 Q65,80 80,65" stroke="black" stroke-width="2" fill="none" />',
    
    // 4: ey, eh, uh (as in "say", "pet", "book")
    '<path d="M50,68 Q65,77 80,68" stroke="black" stroke-width="2" fill="none" />',
    
    // 5: er (as in "bird")
    '<path d="M50,67 Q65,77 80,67" stroke="black" stroke-width="2" fill="none" />',
    
    // 6: y, iy, ih, ix (as in "yes", "see", "sit")
    '<path d="M55,70 Q65,73 75,70" stroke="black" stroke-width="2" fill="none" />',
    
    // 7: w, uw (as in "we", "blue")
    '<circle cx="65" cy="70" r="5" stroke="black" stroke-width="2" fill="none" />',
    
    // 8: ow (as in "show")
    '<circle cx="65" cy="70" r="8" stroke="black" stroke-width="2" fill="none" />',
    
    // 9: aw (as in "how")
    '<circle cx="65" cy="70" r="10" stroke="black" stroke-width="2" fill="none" />',
    
    // 10: oy (as in "boy")
    '<path d="M55,67 Q65,77 75,67" stroke="black" stroke-width="2" fill="none" />',
    
    // 11: ay (as in "fly")
    '<path d="M50,68 Q65,78 80,68" stroke="black" stroke-width="2" fill="none" />',
    
    // 12: h (as in "help")
    '<path d="M50,68 Q65,75 80,68" stroke="black" stroke-width="2" fill="none" />',
    
    // 13: r (as in "red")
    '<path d="M55,68 Q65,73 75,68" stroke="black" stroke-width="2" fill="none" />',
    
    // 14: l (as in "look")
    '<path d="M50,70 Q65,77 80,70" stroke="black" stroke-width="2" fill="none" />',
    
    // 15: s, z (as in "say", "zoo")
    '<path d="M55,70 Q65,72 75,70" stroke="black" stroke-width="2" fill="none" />',
    
    // 16: sh, ch, jh, zh (as in "show", "cheese", "measure")
    '<path d="M55,70 Q65,75 75,70" stroke="black" stroke-width="2" fill="none" />',
    
    // 17: th, dh (as in "thin", "then")
    '<path d="M55,68 Q65,73 75,68" stroke="black" stroke-width="2" fill="none" />',
    
    // 18: f, v (as in "fan", "van")
    '<path d="M50,68 Q65,72 80,68" stroke="black" stroke-width="2" fill="none" /><path d="M65,68 L65,73" stroke="black" stroke-width="1" />',
    
    // 19: d, t, n (as in "did", "talk", "now")
    '<path d="M50,70 Q65,73 80,70" stroke="black" stroke-width="2" fill="none" />',
    
    // 20: k, g, ng (as in "cat", "guest", "sing")
    '<path d="M50,70 Q65,74 80,70" stroke="black" stroke-width="2" fill="none" />',
    
    // 21: p, b, m (as in "put", "big", "mat")
    '<path d="M50,70 Q65,72 80,70" stroke="black" stroke-width="2" fill="none" />',
  ];
  
  // Return the corresponding SVG or a default if the ID is out of range
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" width="130" height="130">
    <rect width="100%" height="100%" fill="none" />
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
export async function generateSpeechWithVisemes(
  text: string,
  voice = "en-US-GuyNeural",
  format: "svg" | "blendshapes" = "blendshapes"
): Promise<ConsolidatedVisemeData> {
  // Validate the Azure key
  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
    throw new Error("Azure Speech credentials not found. Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION");
  }

  // Create Azure Speech Config with credentials
  const speechConfig = speechsdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY, 
    process.env.AZURE_SPEECH_REGION
  );
  
  // Set the voice name
  speechConfig.speechSynthesisVoiceName = voice;
  
  // Enable viseme events
  speechConfig.setProperty(speechsdk.PropertyId.SpeechServiceResponse_RequestSentenceBoundary, "true");
  
  // Create a synthesizer instance
  const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig);
  
  // Keep track of the audio and viseme data
  const visemes: VisemeAnimationData[] = [];
  let audioData: Buffer | undefined = undefined;
  let audioReceived = false;
  let durationMs = 0;
  
  // Register event handlers
  synthesizer.visemeReceived = (s, e) => {
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
  };
  
  synthesizer.synthesisCompleted = (s, e) => {
    // Calculate the total duration from the audio data
    durationMs = e.result.audioDuration / 10000; // Convert 100-nanosecond units to milliseconds
  };
  
  return new Promise<ConsolidatedVisemeData>((resolve, reject) => {
    // Set up event to capture audio data
    synthesizer.synthesizing = (s, e) => {
      try {
        if (e.result.reason === speechsdk.ResultReason.SynthesizingAudio) {
          // The event contains audio data
          const audioBuffer = Buffer.from(e.result.audioData);
          if (audioData) {
            // Append to existing buffer
            audioData = Buffer.concat([audioData, audioBuffer]);
          } else {
            // First chunk
            audioData = audioBuffer;
          }
          audioReceived = true;
        }
      } catch (error) {
        console.error('Error processing audio data:', error);
      }
    };
    
    // Start the synthesis
    synthesizer.speakTextAsync(
      text,
      result => {
        if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
          // Sort visemes by audio offset
          visemes.sort((a, b) => a.audioOffset - b.audioOffset);
          
          if (!audioData || !audioReceived) {
            reject(new Error("No audio data received from Azure Speech service"));
            return;
          }
          
          // Return the consolidated data
          resolve({
            visemes,
            audioBuffer: audioData,
            duration: durationMs
          });
        } else {
          const error = `Speech synthesis failed: ${result.reason}`;
          console.error(error);
          reject(new Error(error));
        }
        
        // Clean up
        synthesizer.close();
      },
      error => {
        console.error(`Error synthesizing speech: ${error}`);
        synthesizer.close();
        reject(error);
      }
    );
  });
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
  
  // Convert audio to WAV format for Azure Speech API
  const wavFilePath = await convertAudioToWav(audioBuffer);
  
  // Create Azure Speech Config with credentials
  const speechConfig = speechsdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY, 
    process.env.AZURE_SPEECH_REGION
  );
  
  // Use the WAV file for recognition
  const audioConfig = speechsdk.AudioConfig.fromWavFileInput(wavFilePath);
  
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