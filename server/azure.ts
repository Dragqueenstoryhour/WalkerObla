import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { PronunciationAssessmentResult } from "@shared/schema";
import fs from "fs";

// Azure Speech Service configuration
const speechKey = process.env.AZURE_SPEECH_KEY || "dummy-key-for-development";
const speechRegion = process.env.AZURE_SPEECH_REGION || "eastus";

/**
 * Assess pronunciation from audio buffer
 */
export async function assessPronunciation(audioBuffer: Buffer, referenceText: string): Promise<PronunciationAssessmentResult> {
  try {
    // Write the buffer to a temporary file
    const tempFilePath = `/tmp/pronunciation-${Date.now()}.wav`;
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Set up the speech config
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    
    // Create audio config from the file
    const audioConfig = sdk.AudioConfig.fromWavFileInput(tempFilePath);
    
    // Create pronunciation assessment config
    const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word
    );
    
    // Create speech recognizer
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    
    // Apply pronunciation assessment config
    pronunciationConfig.applyTo(recognizer);
    
    return new Promise((resolve, reject) => {
      // Start recognition
      recognizer.recognizeOnceAsync(result => {
        // Clean up
        recognizer.close();
        fs.unlinkSync(tempFilePath);
        
        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
          // Get pronunciation assessment results
          const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
          
          // Create word-level results
          const wordLevelResults = pronunciationResult.detailResult?.Words?.map(word => ({
            word: word.Word,
            accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
            errorType: word.PronunciationAssessment?.ErrorType,
          })) || [];
          
          // Create a mock assessment result when using dummy key
          if (speechKey === "dummy-key-for-development") {
            resolve({
              pronunciationScore: 86,
              fluencyScore: 72,
              completenessScore: 94,
              accuracyScore: 89,
              wordLevelResults: [
                { word: "container", accuracyScore: 60, errorType: "mispronunciation" },
                { word: "gardening", accuracyScore: 92 },
                { word: "advantage", accuracyScore: 75, errorType: "mispronunciation" },
              ],
            });
          } else {
            // Process real assessment results
            resolve({
              pronunciationScore: pronunciationResult.pronunciationScore || 0,
              fluencyScore: pronunciationResult.fluencyScore || 0,
              completenessScore: pronunciationResult.completenessScore || 0,
              accuracyScore: pronunciationResult.accuracyScore || 0,
              wordLevelResults,
            });
          }
        } else {
          // Handle recognition errors
          reject(new Error(`Speech recognition failed: ${result.reason}`));
        }
      }, error => {
        // Clean up on error
        recognizer.close();
        fs.existsSync(tempFilePath) && fs.unlinkSync(tempFilePath);
        reject(error);
      });
    });
  } catch (error) {
    console.error("Error assessing pronunciation:", error);
    throw new Error("Failed to assess pronunciation");
  }
}

/**
 * Get phonetic pronunciation for a word
 */
export async function getWordPronunciation(word: string): Promise<string> {
  // This would typically use a dictionary API or Azure's lexical services
  // For simplicity, we'll use a basic implementation
  
  // Convert word to a simplified phonetic form
  const phonetics: Record<string, string> = {
    "container": "kun-tey-ner",
    "gardening": "gar-den-ing",
    "advantage": "uhd-van-tij",
    "apartment": "uh-part-ment",
    "balcony": "bal-kuh-nee",
  };
  
  return phonetics[word.toLowerCase()] || word.split('').join('-');
}

/**
 * Synthesize speech from text
 */
export async function synthesizeSpeech(text: string, voice = "default"): Promise<Buffer> {
  try {
    // Configure speech service
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    
    // Set speech synthesis voice
    switch (voice) {
      case "male":
        speechConfig.speechSynthesisVoiceName = "en-US-GuyNeural";
        break;
      case "child":
        speechConfig.speechSynthesisVoiceName = "en-US-AnaNeural";
        break;
      case "default":
      default:
        speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
        break;
    }
    
    // Create temporary output file
    const tempFilePath = `/tmp/synthesized-${Date.now()}.mp3`;
    
    // For demo purposes when using dummy key
    if (speechKey === "dummy-key-for-development") {
      // Return a small empty audio buffer as a placeholder
      return Buffer.from([]);
    }
    
    // Set up audio config for file output
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(tempFilePath);
    
    // Create speech synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
    
    return new Promise((resolve, reject) => {
      // Start synthesis
      synthesizer.speakTextAsync(
        text,
        result => {
          // Close synthesizer
          synthesizer.close();
          
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            // Read the audio file
            const audioData = fs.readFileSync(tempFilePath);
            // Clean up
            fs.unlinkSync(tempFilePath);
            resolve(audioData);
          } else {
            reject(new Error(`Speech synthesis failed: ${result.reason}`));
          }
        },
        error => {
          // Clean up on error
          synthesizer.close();
          fs.existsSync(tempFilePath) && fs.unlinkSync(tempFilePath);
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    throw new Error("Failed to synthesize speech");
  }
}
