import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";

// Define the PronunciationAssessmentResult interface
interface PronunciationAssessmentResult {
  pronunciationScore: number;   // Overall score, referred to as PronScore in docs
  fluencyScore: number;         // How closely the speech matches a native speaker's use of silent breaks between words
  completenessScore: number;    // Calculated by the ratio of pronounced words to the input reference text
  accuracyScore: number;        // How closely the phonemes match a native speaker's pronunciation
  prosodyScore?: number;        // Indicates how natural the given speech is (stress, intonation, rhythm, etc.)
  wordLevelResults: {
    word: string;
    accuracyScore: number;
    errorType?: string;         // None, Omission, Insertion, Mispronunciation, UnexpectedBreak, MissingBreak, Monotone
  }[];
}

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
    
    // Use the PushAudioInputStream method to create an audio config from the buffer
    const pushStream = sdk.AudioInputStream.createPushStream();
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    
    // Push the audio data to the stream
    pushStream.write(audioBuffer);
    pushStream.close();
    
    // Create pronunciation assessment config with more detailed options
    const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme, // Phoneme level for more detailed analysis
      true // Enable miscue detection
    );
    
    // Enable prosody assessment for better feedback on intonation, rhythm, and stress
    // Note: This may only be available in newer SDK versions
    try {
      // @ts-ignore - Handle potential API differences across SDK versions
      pronunciationConfig.enableProsodyAssessment();
    } catch (error) {
      console.log("Prosody assessment not available in this SDK version");
    }
    
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
          
          // Create simplified word-level results focusing on core assessment data
          const wordLevelResults = pronunciationResult.detailResult?.Words?.map(word => {
            return {
              word: word.Word,
              accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
              errorType: word.PronunciationAssessment?.ErrorType
            };
          }) || [];
          
          // Create a mock assessment result when using dummy key
          if (speechKey === "dummy-key-for-development") {
            resolve({
              pronunciationScore: 86,
              fluencyScore: 72,
              completenessScore: 94,
              accuracyScore: 89,
              prosodyScore: 78, // Added prosody score
              wordLevelResults: [
                { word: "container", accuracyScore: 60, errorType: "Mispronunciation" },
                { word: "gardening", accuracyScore: 92 },
                { word: "advantage", accuracyScore: 75, errorType: "Mispronunciation" },
              ],
            });
          } else {
            // Process real assessment results with prosody score if available
            resolve({
              pronunciationScore: pronunciationResult.pronunciationScore || 0,
              fluencyScore: pronunciationResult.fluencyScore || 0,
              completenessScore: pronunciationResult.completenessScore || 0,
              accuracyScore: pronunciationResult.accuracyScore || 0,
              prosodyScore: pronunciationResult.prosodyScore,
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
    
    // Set output format for better browser compatibility
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    
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
      console.log("Using dummy key for speech synthesis, returning demo audio buffer");
      // Return a small valid MP3 buffer to avoid playback errors
      // This is a minimal MP3 header
      return Buffer.from([
        0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
    }
    
    // Set up audio config for file output
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(tempFilePath);
    
    // Create speech synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
    
    return new Promise((resolve, reject) => {
      // Add logging for debugging
      console.log(`Synthesizing speech for text: "${text}"`);
      
      // Start synthesis with SSML to ensure proper pronunciation
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
          <voice name="${speechConfig.speechSynthesisVoiceName}">
            <prosody rate="medium" pitch="medium">
              ${text}
            </prosody>
          </voice>
        </speak>
      `;
      
      synthesizer.speakSsmlAsync(
        ssml,
        result => {
          // Close synthesizer
          synthesizer.close();
          
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log("Speech synthesis completed successfully");
            // Read the audio file
            try {
              const audioData = fs.readFileSync(tempFilePath);
              // Clean up
              fs.unlinkSync(tempFilePath);
              console.log(`Audio data size: ${audioData.length} bytes`);
              resolve(audioData);
            } catch (readError) {
              console.error("Error reading speech output file:", readError);
              reject(new Error("Failed to read speech output file"));
            }
          } else {
            console.error(`Speech synthesis failed with reason: ${result.reason}`);
            reject(new Error(`Speech synthesis failed: ${result.reason}`));
          }
        },
        error => {
          // Clean up on error
          console.error("Speech synthesis error:", error);
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
