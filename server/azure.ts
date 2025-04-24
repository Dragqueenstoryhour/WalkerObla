import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";
import { execSync } from "child_process";
import { join } from "path";
import * as wav from "wav";
import ffmpegPath from "ffmpeg-static";

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

// Check if Azure key is properly configured
const isAzureConfigured = speechKey !== "dummy-key-for-development";

// Log Azure setup status on startup
if (!isAzureConfigured) {
  console.warn("⚠️ WARNING: Using dummy Azure key. Speech services will use demo data.");
  console.warn("To use actual Azure Speech services, set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in environment variables.");
} else {
  console.log("✅ Azure Speech Services configured successfully.");
}

// Helper function to convert audio buffer to WAV using ffmpeg
async function convertAudioToWav(audioBuffer: Buffer, tempDir: string = "/tmp"): Promise<string> {
  const timestamp = Date.now();
  const inputPath = join(tempDir, `input-${timestamp}.webm`);
  const outputPath = join(tempDir, `output-${timestamp}.wav`);
  
  try {
    // Write input buffer to temporary file
    fs.writeFileSync(inputPath, audioBuffer);
    console.log(`Created temporary input file at ${inputPath} (${audioBuffer.length} bytes)`);
    
    // Convert audio format using ffmpeg
    const ffmpegCommand = `"${ffmpegPath}" -i "${inputPath}" -ac 1 -ar 16000 "${outputPath}"`;
    console.log(`Running ffmpeg command: ${ffmpegCommand}`);
    
    // Execute ffmpeg command
    execSync(ffmpegCommand);
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`Successfully created WAV file at ${outputPath} (${stats.size} bytes)`);
      return outputPath;
    } else {
      throw new Error("WAV file was not created");
    }
  } catch (error) {
    // Clean up and propagate error
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    throw error;
  }
}

/**
 * Helper function to generate mock pronunciation assessment results for testing
 * This is only used in development mode when no Azure key is available
 */
function createMockAssessmentResults(referenceText: string): PronunciationAssessmentResult {
  // Extract all words from the reference text to use in the mock results
  const words = referenceText.split(/\s+/).filter(w => w.trim().length > 0);
  
  // Create word level results for each word in the reference text
  const wordLevelResults = words.map(word => {
    // Generate realistic scores with more variation
    const accuracyScore = Math.floor(Math.random() * 30) + 70; // Score between 70-99
    
    // Determine error type based on score threshold
    let errorType: string | undefined;
    if (accuracyScore < 75) {
      errorType = "Mispronunciation";
    } else if (accuracyScore < 85 && Math.random() > 0.7) {
      errorType = "UnexpectedBreak";
    } else {
      errorType = undefined; // No error
    }
    
    return {
      word: word.replace(/[.,?!]/g, ''), // Remove punctuation from words
      accuracyScore,
      errorType
    };
  });

  // Calculate global scores based on word-level results for more realistic relationship
  const avgAccuracy = wordLevelResults.reduce((sum, w) => sum + w.accuracyScore, 0) / wordLevelResults.length;
  
  // Generate related scores that would be typical from Azure (fluency usually lower than accuracy)
  const fluencyScore = Math.max(50, Math.min(100, avgAccuracy - 5 - Math.floor(Math.random() * 15)));
  const pronunciationScore = Math.max(60, Math.min(100, (avgAccuracy + fluencyScore) / 2 + (Math.random() * 10 - 5)));
  const completenessScore = Math.max(70, Math.min(100, avgAccuracy + 10 - Math.floor(Math.random() * 10)));
  const prosodyScore = Math.max(60, Math.min(100, fluencyScore + (Math.random() * 20 - 10)));
  
  // Return mock results with words from the actual text and realistic score relationships
  return {
    pronunciationScore,
    fluencyScore,
    completenessScore,
    accuracyScore: avgAccuracy,
    prosodyScore,
    wordLevelResults: wordLevelResults.length ? wordLevelResults : [
      { word: "sample", accuracyScore: 75, errorType: "Mispronunciation" },
    ],
  };
}

/**
 * Assess pronunciation from audio buffer
 */
export async function assessPronunciation(audioBuffer: Buffer, referenceText: string): Promise<PronunciationAssessmentResult> {
  // Temporary file paths
  let wavFilePath: string | null = null;
  
  try {
    // Log diagnostic information
    console.log(`Processing audio buffer length: ${audioBuffer.length} bytes`);
    console.log(`Reference text: "${referenceText}"`);

    // Check if Azure key is properly configured
    if (speechKey === "dummy-key-for-development") {
      console.error("No Azure Speech key provided. Cannot assess pronunciation.");
      throw new Error("Azure Speech key is required for pronunciation assessment");
    }

    try {
      // Convert the audio buffer to WAV format using ffmpeg
      wavFilePath = await convertAudioToWav(audioBuffer);
      console.log(`Using converted WAV file: ${wavFilePath}`);
      
      // Set up the speech config with our credentials
      const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
      speechConfig.speechRecognitionLanguage = "en-US";
      
      // Read the WAV file into a buffer and create audio config
      const wavFileData = fs.readFileSync(wavFilePath);
      
      // Create audio config from the WAV file buffer
      const audioConfig = sdk.AudioConfig.fromWavFileInput(wavFileData);
      
      // Clean and normalize the reference text
      const cleanedText = referenceText
        .trim()
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/[^\w\s.,?!]/g, '') // Remove special characters that might cause issues
        .slice(0, 1000);  // Limit length to avoid Azure limits
      
      console.log(`Cleaned reference text: "${cleanedText}"`);
      
      // Create pronunciation assessment config just like in Python example
      const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
        cleanedText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme, // Match Python code's Phoneme granularity
        true // Enable miscue detection
      );
      
      // Create speech recognizer
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      pronunciationConfig.applyTo(recognizer);
      
      // Process the audio and get assessment results - similar to Python example
      return new Promise((resolve, reject) => {
        recognizer.recognizeOnceAsync(
          async (result) => {
            try {
              console.log(`Recognition result reason: ${result.reason}`);
              console.log(`Recognized text: "${result.text}"`);
              
              // Close the recognizer when done with it
              recognizer.close();
              
              if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                try {
                  // Get the JSON response just like the Python code
                  const jsonResponse = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
                  console.log("Azure Raw JSON Response:", jsonResponse);
                  
                  const jsonResult = JSON.parse(jsonResponse);
                  
                  if (jsonResult && jsonResult.NBest && jsonResult.NBest.length > 0) {
                    const best = jsonResult.NBest[0];
                    
                    if (best.PronunciationAssessment) {
                      // Extract scores exactly as in the Python example
                      const pronScores = best.PronunciationAssessment;
                      
                      // Create word-level results from the Words array if available
                      let wordLevelResults: any[] = [];
                      
                      if (best.Words && best.Words.length > 0) {
                        wordLevelResults = best.Words.map((word: any) => ({
                          word: word.Word,
                          accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
                          errorType: word.PronunciationAssessment?.ErrorType
                        }));
                      }
                      
                      // Return the assessment result in the same format as our interface
                      resolve({
                        pronunciationScore: parseFloat(pronScores.PronScore) || 0,
                        fluencyScore: parseFloat(pronScores.FluencyScore) || 0,
                        completenessScore: parseFloat(pronScores.CompletenessScore) || 0,
                        accuracyScore: parseFloat(pronScores.AccuracyScore) || 0,
                        prosodyScore: pronScores.ProsodyScore ? parseFloat(pronScores.ProsodyScore) : undefined,
                        wordLevelResults
                      });
                      return;
                    }
                  }
                  
                  // Fall back to using SDK method if the direct JSON approach fails
                  const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
                  
                  if (pronunciationResult) {
                    console.log(`SDK pronunciation scores - Overall: ${pronunciationResult.pronunciationScore}`);
                    
                    // Extract word-level results
                    const detailResult = pronunciationResult.detailResult;
                    let wordLevelResults: any[] = [];
                    
                    if (detailResult && detailResult.Words && detailResult.Words.length > 0) {
                      wordLevelResults = detailResult.Words.map(word => ({
                        word: word.Word,
                        accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
                        errorType: word.PronunciationAssessment?.ErrorType
                      }));
                    }
                    
                    resolve({
                      pronunciationScore: pronunciationResult.pronunciationScore || 0,
                      fluencyScore: pronunciationResult.fluencyScore || 0,
                      completenessScore: pronunciationResult.completenessScore || 0,
                      accuracyScore: pronunciationResult.accuracyScore || 0,
                      prosodyScore: pronunciationResult.prosodyScore,
                      wordLevelResults
                    });
                    return;
                  }
                  
                  // In case of no proper assessment, throw an error
                  console.warn("Failed to get pronunciation assessment results from Azure");
                  reject(new Error("Could not get pronunciation assessment results from Azure"));
                  
                } catch (resultError) {
                  console.error("Error extracting pronunciation results:", resultError);
                  reject(new Error(`Failed to extract pronunciation results: ${resultError.message}`));
                }
              } else {
                console.warn(`Recognition didn't complete successfully: ${result.reason}`);
                reject(new Error(`Speech recognition failed: ${result.reason}`));
              }
            } catch (processingError) {
              console.error("Error processing recognition result:", processingError);
              reject(processingError);
            } finally {
              // Clean up the temporary file
              try {
                if (wavFilePath && fs.existsSync(wavFilePath)) {
                  fs.unlinkSync(wavFilePath);
                  console.log(`Deleted temporary WAV file ${wavFilePath}`);
                }
              } catch (cleanupError) {
                console.error("Error cleaning up temporary file:", cleanupError);
              }
            }
          },
          (error) => {
            console.error("Error during speech recognition:", error);
            recognizer.close();
            
            // Clean up the temporary file
            try {
              if (wavFilePath && fs.existsSync(wavFilePath)) {
                fs.unlinkSync(wavFilePath);
              }
            } catch (cleanupError) {
              console.error("Error cleaning up temporary file:", cleanupError);
            }
            
            reject(error);
          }
        );
      });
    } catch (conversionError) {
      console.error("Failed to convert audio for Azure:", conversionError);
      // Don't use mock data, throw the error to be properly handled
      throw new Error(`Failed to convert audio for Azure Speech assessment: ${conversionError.message}`);
    }
  } catch (error) {
    console.error("Error assessing pronunciation:", error);
    throw error;
  } finally {
    // Final cleanup to be sure
    if (wavFilePath && fs.existsSync(wavFilePath)) {
      try {
        fs.unlinkSync(wavFilePath);
      } catch (e) {
        // Ignore final cleanup errors
      }
    }
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
    // General news words
    "headlines": "hed-lahynz",
    "today": "tuh-dey",
    "news": "nooz",
    "latest": "ley-tist",
    "breaking": "brey-king",
    "report": "ri-pawrt",
    "election": "ih-lek-shuhn",
    "president": "prez-i-duhnt",
    "government": "guhv-ern-muhnt",
    "economy": "ih-kon-uh-mee",
    "technology": "tek-nol-uh-jee",

    // Original gardening words
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