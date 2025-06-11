import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";
import { execSync } from "child_process";
import { join } from "path";
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
    offset?: number;            // Start time offset in milliseconds
    duration?: number;          // Duration in milliseconds
    phonemes?: Array<{          // Phoneme-level details
      phoneme: string;          // IPA phoneme
      score: number;            // Phoneme accuracy score
    }>;
  }[];
  rawJson?: any;                // Raw JSON response for debugging
  sdkVersion?: string;          // Azure Speech SDK version
}

// Azure Speech Service configuration
const speechKey = process.env.SPEECH_KEY || "dummy-key-for-development";
const speechRegion = process.env.SPEECH_REGION || "eastus";

// Check if Azure key is properly configured
const isAzureConfigured = speechKey !== "dummy-key-for-development";

// Log Azure setup status on startup
if (!isAzureConfigured) {
  console.warn("⚠️ WARNING: Using dummy Azure key. Speech services will use demo data.");
  console.warn("To use actual Azure Speech services, set SPEECH_KEY and SPEECH_REGION in environment variables.");
} else {
  console.log("✅ Azure Speech Services configured successfully with region: " + speechRegion);
}

// Helper function to convert audio buffer to WAV using ffmpeg
async function convertAudioToWav(audioBuffer: Buffer, tempDir: string = "/tmp", debugInfo?: any): Promise<string> {
  const timestamp = Date.now();
  const inputPath = join(tempDir, `input-${timestamp}.webm`);
  const outputPath = join(tempDir, `output-${timestamp}.wav`);
  
  // Validate input audio buffer
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error("Empty or invalid audio buffer provided for conversion");
  }
  
  console.log(`⏳ Converting audio buffer (${audioBuffer.length} bytes) to WAV format...`);
  
  try {
    // Write input buffer to temporary file
    fs.writeFileSync(inputPath, audioBuffer);
    console.log(`✅ Created temporary input file at ${inputPath} (${audioBuffer.length} bytes)`);
    
    // Convert audio format using ffmpeg with optimized settings for Azure pronunciation assessment
    // Configure for 16kHz, mono, 16-bit PCM format with audio normalization
    const ffmpegCommand = `"${ffmpegPath}" -i "${inputPath}" \
      -ac 1 \
      -ar 16000 \
      -acodec pcm_s16le \
      -af "highpass=f=200,lowpass=f=4000,loudnorm=I=-16:TP=-1.5:LRA=11" \
      -f wav \
      -y \
      "${outputPath}"`;
    
    console.log(`🔄 Running ffmpeg command to create 16kHz mono PCM WAV:`);
    console.log(ffmpegCommand);
    
    // Execute ffmpeg command
    const conversionOutput = execSync(ffmpegCommand, { encoding: 'utf8' });
    
    // Validate the output file
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      
      // Verify that the file is not empty
      if (stats.size <= 44) { // 44 bytes is the WAV header size
        throw new Error("WAV file created but contains only header (no audio data)");
      }
      
      console.log(`✅ Successfully created WAV file at ${outputPath} (${stats.size} bytes)`);
      
      // Log file details for debugging purposes
      try {
        const fileInfo = execSync(`"${ffmpegPath}" -i "${outputPath}" 2>&1`, { encoding: 'utf8' });
        console.log(`🔍 WAV file details:\n${fileInfo}`);
      } catch (infoError) {
        // ffmpeg outputs to stderr when getting file info, which causes execSync to throw
        // We can extract the file info from the error message
        const infoOutput = String(infoError).split('\n').filter(line => 
          line.includes('Stream') || line.includes('Audio')
        ).join('\n');
        console.log(`🔍 WAV file details:\n${infoOutput}`);
      }
      
      return outputPath;
    } else {
      throw new Error(`WAV file was not created at ${outputPath}`);
    }
  } catch (error) {
    console.error(`❌ Error during audio conversion: ${error instanceof Error ? error.message : String(error)}`);
    
    // Clean up input file
    if (fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
        console.log(`🧹 Cleaned up temporary input file ${inputPath}`);
      } catch (cleanupError) {
        console.error(`❌ Failed to clean up temporary input file: ${cleanupError}`);
      }
    }
    
    throw new Error(`Failed to convert audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper function to generate mock pronunciation assessment results for testing
 * This is only used in development mode when no Azure key is available
 */
function createMockAssessmentResults(referenceText: string): PronunciationAssessmentResult {
  // Extract all words from the reference text to use in the mock results
  const words = referenceText.split(/\s+/).filter(w => w.trim().length > 0);
  
  // Track current timestamp for word durations and offsets
  let currentOffset = 0;
  
  // Create word level results for each word in the reference text to match Azure structure
  const wordLevelResults = words.map((word, index) => {
    // Generate realistic scores with more variation
    const accuracyScore = Math.floor(Math.random() * 30) + 70; // Score between 70-99
    
    // Determine error type based on score threshold
    let errorType: string | undefined;
    if (accuracyScore < 75) {
      errorType = "Mispronunciation";
    } else if (accuracyScore < 80 && Math.random() > 0.7) {
      errorType = "UnexpectedBreak";
    } else if (accuracyScore < 85 && Math.random() > 0.9) {
      errorType = "Omission";
    } else if (accuracyScore < 90 && Math.random() > 0.9) {
      errorType = "Insertion";
    } else {
      errorType = "None"; // No error
    }
    
    // Calculate a realistic duration for the word (shorter words typically take less time)
    const wordLength = word.length;
    const baseDuration = 150 + (wordLength * 60) + (Math.random() * 100 - 50); // duration in ms
    const duration = Math.max(100, Math.round(baseDuration));
    
    // Generate phonemes for each word to match Azure's format
    const phonemes = [];
    const cleanWord = word.replace(/[.,?!]/g, ''); // Remove punctuation from words
    
    // Simple IPA phoneme generation - this is a simplification, real IPA would be more complex
    for (let i = 0; i < cleanWord.length; i++) {
      // Generate a phoneme for each letter or combination
      let phoneme;
      let letter = cleanWord[i].toLowerCase();
      
      // Very simplified phoneme mapping
      switch(letter) {
        case 'a': phoneme = 'æ'; break;
        case 'e': phoneme = 'ɛ'; break;
        case 'i': phoneme = 'ɪ'; break;
        case 'o': phoneme = 'ɒ'; break;
        case 'u': phoneme = 'ʌ'; break;
        case 't': phoneme = 't'; break;
        case 's': phoneme = 's'; break;
        default: phoneme = letter; // For simplicity, use the letter itself
      }
      
      // Generate a score for this phoneme
      const phonemeScore = Math.max(60, Math.min(100, accuracyScore + (Math.random() * 20 - 10)));
      
      phonemes.push({
        phoneme: phoneme,
        score: phonemeScore
      });
    }
    
    // Calculate word offset based on previous words
    const offset = currentOffset;
    currentOffset += duration + Math.round(Math.random() * 100); // Add some silence between words
    
    // Return a complete word result matching Azure's structure
    return {
      word: cleanWord,
      accuracyScore,
      errorType,
      duration,
      offset,
      phonemes
    };
  });

  // Calculate global scores based on word-level results for more realistic relationship
  const avgAccuracy = wordLevelResults.reduce((sum, w) => sum + w.accuracyScore, 0) / wordLevelResults.length;
  
  // Generate related scores that would be typical from Azure (fluency usually lower than accuracy)
  const fluencyScore = Math.max(50, Math.min(100, avgAccuracy - 5 - Math.floor(Math.random() * 15)));
  const pronunciationScore = Math.max(60, Math.min(100, (avgAccuracy + fluencyScore) / 2 + (Math.random() * 10 - 5)));
  const completenessScore = Math.max(70, Math.min(100, avgAccuracy + 10 - Math.floor(Math.random() * 10)));
  const prosodyScore = Math.max(60, Math.min(100, fluencyScore + (Math.random() * 20 - 10)));
  
  // Create mock raw JSON response similar to what Azure would return
  const mockRawJson = {
    RecognitionStatus: "Success",
    Offset: 0,
    Duration: currentOffset,
    DisplayText: referenceText.trim(),
    SNR: 35.46,
    NBest: [
      {
        Confidence: 0.9,
        Lexical: referenceText.trim().toLowerCase(),
        ITN: referenceText.trim(),
        Display: referenceText.trim(),
        PronunciationAssessment: {
          PronScore: pronunciationScore,
          AccuracyScore: avgAccuracy,
          FluencyScore: fluencyScore,
          CompletenessScore: completenessScore,
          ProsodyScore: prosodyScore
        },
        Words: wordLevelResults.map(w => ({
          Word: w.word,
          Offset: w.offset,
          Duration: w.duration,
          PronunciationAssessment: {
            AccuracyScore: w.accuracyScore,
            ErrorType: w.errorType,
          },
          Phonemes: w.phonemes?.map(p => ({
            Phoneme: p.phoneme,
            PronunciationAssessment: {
              AccuracyScore: p.score
            }
          }))
        }))
      }
    ]
  };
  
  // Return mock results with words from the actual text and realistic score relationships
  return {
    pronunciationScore,
    fluencyScore,
    completenessScore,
    accuracyScore: avgAccuracy,
    prosodyScore,
    wordLevelResults: wordLevelResults.length ? wordLevelResults : [
      { 
        word: "sample", 
        accuracyScore: 75, 
        errorType: "Mispronunciation",
        offset: 0,
        duration: 500,
        phonemes: [{phoneme: "s", score: 70}, {phoneme: "æ", score: 75}, {phoneme: "m", score: 80}, {phoneme: "p", score: 70}, {phoneme: "l", score: 75}]
      },
    ],
    rawJson: mockRawJson,
    sdkVersion: "1.32.0 (TypeScript)"
  };
}

/**
 * Assess pronunciation from audio buffer
 */
export async function assessPronunciation(audioBuffer: Buffer, referenceText: string): Promise<PronunciationAssessmentResult> {
  console.log(`🎯 Starting pronunciation assessment for reference text: "${referenceText}"`);

  // Check if Azure key is properly configured
  if (speechKey === "dummy-key-for-development") {
    console.error("No Azure Speech key provided. Cannot assess pronunciation.");
    throw new Error("Azure Speech key is required for pronunciation assessment");
  }

  let wavFilePath: string | null = null;

  try {
    // Convert audio to WAV format
    wavFilePath = await convertAudioToWav(audioBuffer);
    
    // Validate reference text length and format
    if (!referenceText || referenceText.trim().length === 0) {
      throw new Error("Reference text cannot be empty for pronunciation assessment");
    }
    
    if (referenceText.length > 1000) {
      console.warn(`⚠️ Reference text exceeds Azure's recommended limit (${referenceText.length} > 1000 chars). Truncating.`);
    }
    
    // Clean and normalize the reference text
    const cleanedText = referenceText
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\w\s.,?!'-]/g, '') // Remove special characters that might cause issues
      .slice(0, 1000);  // Limit length to avoid Azure limits
    
    console.log(`🔤 Cleaned reference text: "${cleanedText}" (${cleanedText.length} chars)`);
    
    // Log word count for tracking completion
    const wordCount = cleanedText.split(/\s+/).length;
    console.log(`📊 Reference text contains ${wordCount} words`);

    return new Promise((resolve, reject) => {
      try {
        // Initialize speech configuration
        const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
        speechConfig.speechRecognitionLanguage = "en-US";
        
        // Create pronunciation assessment configuration
        const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
          cleanedText,
          sdk.PronunciationAssessmentGradingSystem.HundredMark,
          sdk.PronunciationAssessmentGranularity.Phoneme,
          true // enableMiscue
        );

        // Read WAV file data
        const wavFileData = fs.readFileSync(wavFilePath!);
        
        // Create audio configuration from the WAV file buffer
        const audioConfig = sdk.AudioConfig.fromWavFileInput(wavFileData);
        
        // Create speech recognizer
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
        
        // Apply pronunciation assessment configuration
        pronunciationAssessmentConfig.applyTo(recognizer);
        
        console.log(`📝 SESSION STARTED`);
        
        // Perform recognition
        recognizer.recognizeOnceAsync(
          (result) => {
            console.log(`🛑 SESSION STOPPED`);
            recognizer.close();
            
            // Clean up the temporary file
            try {
              if (wavFilePath && fs.existsSync(wavFilePath)) {
                fs.unlinkSync(wavFilePath);
              }
            } catch (cleanupError) {
              console.error("Error cleaning up temporary file:", cleanupError);
            }
            
            try {
              if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                console.log(`✅ RECOGNIZED: ${result.text}`);
                
                // Get pronunciation assessment result
                const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
                
                // Get detailed JSON response
                const jsonResponse = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
                console.log("Raw JSON Response:", jsonResponse);
                
                let jsonResult: any = {};
                try {
                  jsonResult = JSON.parse(jsonResponse);
                } catch (parseError) {
                  console.warn("Could not parse JSON response:", parseError);
                }
                
                // Extract word-level results
                const wordLevelResults: any[] = [];
                if (jsonResult.NBest && jsonResult.NBest[0] && jsonResult.NBest[0].Words) {
                  jsonResult.NBest[0].Words.forEach((wordData: any) => {
                    wordLevelResults.push({
                      word: wordData.Word,
                      accuracyScore: wordData.PronunciationAssessment?.AccuracyScore || 0,
                      errorType: wordData.PronunciationAssessment?.ErrorType || "None",
                      offset: wordData.Offset || 0,
                      duration: wordData.Duration || 0,
                      phonemes: [] // Keep empty for now to avoid complexity
                    });
                  });
                }
                
                console.log(`🔍 Processing ${wordLevelResults.length} words from Azure response`);
                
                // Build final assessment result
                const finalResult: PronunciationAssessmentResult = {
                  pronunciationScore: pronunciationResult.pronunciationScore,
                  fluencyScore: pronunciationResult.fluencyScore,
                  completenessScore: pronunciationResult.completenessScore,
                  accuracyScore: pronunciationResult.accuracyScore,
                  prosodyScore: pronunciationResult.prosodyScore,
                  wordLevelResults,
                  sdkVersion: "production",
                  rawJson: jsonResult
                };
                
                console.log(`📊 Assessment results summary:`);
                console.log(`  - Pronunciation Score: ${finalResult.pronunciationScore}`);
                console.log(`  - Fluency Score: ${finalResult.fluencyScore}`);
                console.log(`  - Completeness Score: ${finalResult.completenessScore}`);
                console.log(`  - Accuracy Score: ${finalResult.accuracyScore}`);
                console.log(`  - Prosody Score: ${finalResult.prosodyScore || 'N/A'}`);
                console.log(`  - Words with timing data: ${wordLevelResults.length}/${wordCount}`);
                
                resolve(finalResult);
                
              } else if (result.reason === sdk.ResultReason.NoMatch) {
                console.log(`⚠️ No speech could be recognized from audio`);
                reject(new Error("No speech could be recognized from the audio"));
              } else if (result.reason === sdk.ResultReason.Canceled) {
                const cancellation = sdk.CancellationDetails.fromResult(result);
                console.error(`🚫 Recognition canceled: ${cancellation.reason}`);
                if (cancellation.reason === sdk.CancellationReason.Error) {
                  console.error(`Error details: ${cancellation.errorDetails}`);
                  reject(new Error(`Azure Speech recognition error: ${cancellation.errorDetails}`));
                } else {
                  reject(new Error(`Recognition canceled: ${cancellation.reason}`));
                }
              } else {
                reject(new Error(`Unexpected recognition result: ${result.reason}`));
              }
            } catch (processingError: any) {
              console.error("Error processing recognition result:", processingError);
              reject(new Error(`Failed to process recognition result: ${processingError?.message || "Unknown error"}`));
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
      } catch (setupError: any) {
        console.error("Error setting up Azure Speech recognition:", setupError);
        reject(new Error(`Failed to set up Azure Speech recognition: ${setupError?.message || "Unknown error"}`));
      }
    });
    
  } catch (conversionError: any) {
    console.error("Failed to convert audio for Azure:", conversionError);
    throw new Error(`Failed to convert audio for Azure Speech assessment: ${conversionError?.message || "Unknown error"}`);
  } finally {
    // Final cleanup to be sure
    if (wavFilePath && fs.existsSync(wavFilePath)) {
      try {
        fs.unlinkSync(wavFilePath);
      } catch (cleanupError) {
        console.error("Error in final cleanup:", cleanupError);
      }
    }
  }
}

/**
 * Enhanced debug version of pronunciation assessment that provides more granular information
 * and performs additional validations
 */
export async function assessPronunciationDebug(audioBuffer: Buffer, referenceText: string, options: { disableMock?: boolean, debugInfo?: any } = {}): Promise<PronunciationAssessmentResult> {
  const { disableMock = true, debugInfo = {} } = options;
  
  if (debugInfo) {
    // Add detailed diagnostics about our Azure configuration
    const keyInfo = speechKey === 'dummy-key-for-development' ? 'dummy' : 
      speechKey ? `real key (${speechKey.substring(0, 3)}...${speechKey.substring(speechKey.length - 3)})` : 'missing';
    
    debugInfo.sdkInfo = {
      version: 'Checking...',
      azureKeyStatus: keyInfo,
      azureRegion: speechRegion || 'not configured',
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        speechKeyEnv: process.env.SPEECH_KEY ? 'present' : 'missing',
        speechRegionEnv: process.env.SPEECH_REGION || 'missing' 
      }
    };
    
    console.log(`🔑 Azure Speech Services configuration check:\n` +
      `- Key status: ${keyInfo}\n` +
      `- Region: ${speechRegion || 'not configured'}\n` +
      `- Env variables: SPEECH_KEY=${process.env.SPEECH_KEY ? 'present' : 'missing'}, ` +
      `SPEECH_REGION=${process.env.SPEECH_REGION || 'missing'}`
    );
  }
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
      
      // Important: Set the recognition language to English US
      speechConfig.speechRecognitionLanguage = "en-US";
      
      // Configure speech recognition for pronunciation assessment
      speechConfig.setProperty("Speech.SegmentationStrategy", "Manual");
      speechConfig.setProperty("Speech.SegmentationSilenceTimeoutMs", "2000");
      speechConfig.setProperty("Speech.InitialSilenceTimeoutMs", "2000");
      speechConfig.setProperty("Speech.EndSilenceTimeoutMs", "1000");
      
      // Disable dictation mode for better pronunciation assessment
      // speechConfig.enableDictation(); // Removed - this can interfere with pronunciation assessment
      
      // Configure for single-shot recognition optimized for pronunciation assessment
      speechConfig.setProperty("Speech.Recognition.Mode", "Interactive");
      speechConfig.setProperty("Speech.Context.PhraseList.Enabled", "true");
      speechConfig.setProperty("Speech.Context.Verification", "true");
      
      // Read the WAV file into a buffer
      const wavFileData = fs.readFileSync(wavFilePath);
      
      // Create audio config from the WAV file buffer
      const audioConfig = sdk.AudioConfig.fromWavFileInput(wavFileData);
      
      // Validate reference text length and format
      if (!referenceText || referenceText.trim().length === 0) {
        throw new Error("Reference text cannot be empty for pronunciation assessment");
      }
      
      if (referenceText.length > 1000) {
        console.warn(`⚠️ Reference text exceeds Azure's recommended limit (${referenceText.length} > 1000 chars). Truncating.`);
      }
      
      // Clean and normalize the reference text
      const cleanedText = referenceText
        .trim()
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/[^\w\s.,?!]/g, '') // Remove special characters that might cause issues
        .slice(0, 1000);  // Limit length to avoid Azure limits
      
      console.log(`🔤 Cleaned reference text: "${cleanedText}" (${cleanedText.length} chars)`);
      
      // Log word count for tracking completion
      const wordCount = cleanedText.split(/\s+/).length;
      console.log(`📊 Reference text contains ${wordCount} words`);
      
      // Create speech recognizer first
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      
      // Try to detect the SDK version
      let sdkVersion = "unknown";
      try {
        // Different ways to extract version info based on undocumented SDK properties
        // This is just for logging purposes, so we'll handle any errors gracefully
        
        // Try to get version from various possible sources
        // Using Function.toString() to check internal implementation details
        const sdkString = Function.toString.call(sdk.SpeechConfig.fromSubscription);
        const versionMatch = sdkString.match(/VERSION\s*=\s*['"]([^'"]+)['"]/) || 
                           sdkString.match(/version\s*:\s*['"]([^'"]+)['"]/) ||
                           sdkString.match(/v([0-9]+\.[0-9]+\.[0-9]+)/);
        
        if (versionMatch && versionMatch[1]) {
          sdkVersion = versionMatch[1];
        }
      } catch (e) {
        // Ignore version detection errors, it's not critical
      }
      
      console.log(`🔖 Azure Speech SDK version: ${sdkVersion}`);
      
      // Add the version to the request for diagnostic purposes
      speechConfig.setProperty("Speech.LogFilename", `/tmp/azure-speech-${Date.now()}.log`);
      speechConfig.setProperty("Speech.LogLevel", "3"); // Detailed logging
      
      // Create pronunciation assessment configuration with proper settings
      const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
        cleanedText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Word, // Use Word granularity for better results
        true // Enable miscue calculation
      );
      
      // Enable miscue detection explicitly for omission/insertion tracking
      try {
        // @ts-ignore - enableMiscue might not be in TypeScript definition yet but exists in newer SDKs
        if (typeof pronunciationAssessmentConfig.enableMiscue === 'function') {
          // @ts-ignore
          pronunciationAssessmentConfig.enableMiscue(true);
          console.log(`✅ Miscue detection explicitly enabled`);
        } else {
          // Miscue detection is already enabled by the constructor's 4th parameter
          console.log(`ℹ️ Using default miscue detection (set in constructor)`);
        }
      } catch (miscueError) {
        console.warn(`⚠️ Could not explicitly enable miscue detection: ${miscueError}`);
      }
      
      // Set the phoneme alphabet to IPA
      try {
        // Different SDK versions might have different method names for setting phoneme alphabet
        // Attempt various potential method names with type safety protections
        let phonemeAlphabetSet = false;
        
        // @ts-ignore - Try the phonemeAlphabet method first
        if (typeof pronunciationAssessmentConfig.phonemeAlphabet === 'function') {
          try {
            // @ts-ignore
            pronunciationAssessmentConfig.phonemeAlphabet("IPA");
            console.log(`✅ Set phoneme alphabet to IPA using phonemeAlphabet() method`);
            phonemeAlphabetSet = true;
          } catch (e) {
            console.warn(`⚠️ phonemeAlphabet() method failed:`, e);
          }
        }
        
        // If the first method failed, try an alternative method name
        // @ts-ignore
        if (!phonemeAlphabetSet && typeof pronunciationAssessmentConfig.setPhonemesAlphabet === 'function') {
          try {
            // @ts-ignore
            pronunciationAssessmentConfig.setPhonemesAlphabet("IPA");
            console.log(`✅ Set phoneme alphabet to IPA using setPhonemesAlphabet() method`);
            phonemeAlphabetSet = true;
          } catch (e) {
            console.warn(`⚠️ setPhonemesAlphabet() method failed:`, e);
          }
        }
        
        // If we couldn't set it, log that information
        if (!phonemeAlphabetSet) {
          console.log(`ℹ️ Could not set phoneme alphabet to IPA - this SDK version might not support it`);
        }
      } catch (alphabetError) {
        console.warn(`⚠️ Error while attempting to set phoneme alphabet: ${alphabetError}`);
      }
      
      // Enable prosody assessment with version check
      const hasProsodySupport = (
        // @ts-ignore
        typeof pronunciationAssessmentConfig.enableProsodyAssessment === 'function' ||
        // @ts-ignore
        typeof sdk.PronunciationAssessmentConfig.prototype.enableProsodyAssessment === 'function'
      );
      
      try {
        if (hasProsodySupport) {
          // @ts-ignore - Skip TypeScript checking for the function call
          pronunciationAssessmentConfig.enableProsodyAssessment();
          console.log(`✅ Prosody assessment enabled`);
        } else {
          console.log(`ℹ️ Prosody assessment not available in this SDK version (${sdkVersion})`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not enable prosody assessment: ${error}`);
        // Continue even if prosody assessment can't be enabled
      }
      
      // Apply the pronunciation config to the recognizer
      pronunciationAssessmentConfig.applyTo(recognizer);
      
      // Process the audio and get assessment results
      return new Promise((resolve, reject) => {
        // Add detailed event listeners for debugging
        // Track session ID for Azure support reference
        let azureSessionId = "unknown";
        recognizer.sessionStarted = (s, e) => {
          azureSessionId = e.sessionId;
          console.log(`📝 SESSION STARTED - ID: ${azureSessionId}`);
        };
        
        // Log various recognizer events
        recognizer.recognizing = (s, e) => {
          console.log(`🔊 RECOGNIZING: ${e.result.text}`);
        };
        
        recognizer.recognized = (s, e) => {
          if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
            console.log(`✅ RECOGNIZED: ${e.result.text}`);
          } else {
            console.log(`⚠️ RECOGNITION FAILED: ${e.result.reason}`);
          }
        };
        
        recognizer.canceled = (s, e) => {
          console.log(`❌ CANCELED: Reason=${e.reason}, Details=${e.errorDetails || 'none'}`);
        };
        
        recognizer.sessionStopped = (s, e) => {
          console.log(`🛑 SESSION STOPPED for ID: ${azureSessionId}`);
        };
        
        recognizer.recognizeOnceAsync(
          async (result) => {
            try {
              console.log(`Recognition result reason: ${result.reason}`);
              console.log(`Recognized text: "${result.text}"`);
              
              // Close the recognizer when done with it
              recognizer.close();
              
              if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                try {
                  // Get the pronunciation assessment result from the speech recognition result
                  const pronunciationAssessmentResult = sdk.PronunciationAssessmentResult.fromResult(result);
                  
                  // Log the result details to understand the data format
                  console.log("Pronunciation Assessment Result:", JSON.stringify({
                    accuracy: pronunciationAssessmentResult.accuracyScore,
                    pronunciation: pronunciationAssessmentResult.pronunciationScore,
                    completeness: pronunciationAssessmentResult.completenessScore,
                    fluency: pronunciationAssessmentResult.fluencyScore,
                    prosody: pronunciationAssessmentResult.prosodyScore
                  }));
                  
                  // Get the detailed JSON response
                  const jsonResponse = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
                  console.log("Raw JSON Response:", jsonResponse);
                  
                  // Parse the JSON response
                  const jsonResult = JSON.parse(jsonResponse);
                  
                  // Extract word-level results with alignments, durations, offsets, and phonemes
                  let wordLevelResults: any[] = [];
                  
                  if (jsonResult?.NBest?.[0]?.Words) {
                    console.log(`🔍 Processing ${jsonResult.NBest[0].Words.length} words from Azure response`);
                    
                    wordLevelResults = jsonResult.NBest[0].Words.map((word: any) => {
                      // Extract word details
                      const wordResult = {
                        word: word.Word,
                        accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
                        errorType: word.PronunciationAssessment?.ErrorType || "None",
                        offset: word.Offset !== undefined ? Number(word.Offset) : undefined,
                        duration: word.Duration !== undefined ? Number(word.Duration) : undefined,
                        phonemes: [] as any[]
                      };
                      
                      // Extract phoneme-level assessments if available
                      if (word.Phonemes && Array.isArray(word.Phonemes)) {
                        wordResult.phonemes = word.Phonemes.map((phoneme: any) => ({
                          phoneme: phoneme.Phoneme || "",
                          score: phoneme.PronunciationAssessment?.AccuracyScore || 0
                        }));
                        
                        // Log phoneme details for debugging
                        if (wordResult.phonemes.length > 0) {
                          console.log(`📝 Word "${word.Word}" has ${wordResult.phonemes.length} phonemes: ${wordResult.phonemes.map((p: any) => p.phoneme).join(', ')}`);
                        }
                      }
                      
                      return wordResult;
                    });
                  }
                  
                  // Show some diagnostic information about the results
                  console.log(`📊 Assessment results summary:`);
                  console.log(`  - Pronunciation Score: ${pronunciationAssessmentResult.pronunciationScore}`);
                  console.log(`  - Fluency Score: ${pronunciationAssessmentResult.fluencyScore}`);
                  console.log(`  - Completeness Score: ${pronunciationAssessmentResult.completenessScore}`);
                  console.log(`  - Accuracy Score: ${pronunciationAssessmentResult.accuracyScore}`);
                  console.log(`  - Prosody Score: ${pronunciationAssessmentResult.prosodyScore || 'N/A'}`);
                  console.log(`  - Words with timing data: ${wordLevelResults.filter(w => w.offset !== undefined && w.duration !== undefined).length}/${wordLevelResults.length}`);
                  
                  // Build the final assessment result with SDK version and raw JSON for debugging
                  resolve({
                    pronunciationScore: pronunciationAssessmentResult.pronunciationScore,
                    fluencyScore: pronunciationAssessmentResult.fluencyScore,
                    completenessScore: pronunciationAssessmentResult.completenessScore,
                    accuracyScore: pronunciationAssessmentResult.accuracyScore,
                    prosodyScore: pronunciationAssessmentResult.prosodyScore,
                    wordLevelResults,
                    sdkVersion,
                    rawJson: jsonResult
                  });
                } catch (resultError: any) {
                  console.error("Error extracting pronunciation results:", resultError);
                  reject(new Error(`Failed to extract pronunciation results: ${resultError?.message || "Unknown error"}`));
                }
              } else if (result.reason === sdk.ResultReason.NoMatch) {
                console.log(`⚠️ No speech could be recognized from audio`);
                
                // Still try to get pronunciation assessment data even if no speech was recognized
                const jsonResponse = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
                if (jsonResponse) {
                  console.log("Raw JSON Response (NoMatch):", jsonResponse);
                  const jsonResult = JSON.parse(jsonResponse);
                  
                  // Return assessment indicating no clear speech was detected
                  resolve({
                    pronunciationScore: 20,
                    fluencyScore: 20,
                    completenessScore: 10,
                    accuracyScore: 20,
                    prosodyScore: 20,
                    wordLevelResults: cleanedText.split(/\s+/).map(word => ({
                      word: word,
                      accuracyScore: 10,
                      errorType: "Omission",
                      offset: 0,
                      duration: 1000,
                      phonemes: []
                    })),
                    sdkVersion,
                    rawJson: jsonResult
                  });
                } else {
                  reject(new Error("No speech detected in audio"));
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
    } catch (conversionError: any) {
      console.error("Failed to convert audio for Azure:", conversionError);
      throw new Error(`Failed to convert audio for Azure Speech assessment: ${conversionError?.message || "Unknown error"}`);
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
  // Enhanced pronunciation guide with syllable patterns
  const syllableMap: Record<string, string> = {
    // Common problematic words with syllable emphasis
    'brings': 'BRINGS (1 syllable: br-ings)',
    'important': 'im-POR-tant (3 syllables)',
    'restaurant': 'RES-tau-rant (3 syllables)',
    'beautiful': 'BEAU-ti-ful (3 syllables)',
    'yesterday': 'YES-ter-day (3 syllables)',
    'understand': 'un-der-STAND (3 syllables)',
    'telephone': 'TEL-e-phone (3 syllables)',
    'anything': 'AN-y-thing (3 syllables)',
    'afternoon': 'af-ter-NOON (3 syllables)',
    'different': 'DIF-fer-ent (3 syllables)',
    'question': 'QUES-tion (2 syllables)',
    'because': 'be-CAUSE (2 syllables)',
    'morning': 'MOR-ning (2 syllables)',
    'dinner': 'DIN-ner (2 syllables)',
    'friend': 'FRIEND (1 syllable)',
    'water': 'WA-ter (2 syllables)',
    'happy': 'HAP-py (2 syllables)',
    'music': 'MU-sic (2 syllables)',
    'smile': 'SMILE (1 syllable)',
    'phone': 'PHONE (1 syllable)',
    'chair': 'CHAIR (1 syllable)',
    'apple': 'AP-ple (2 syllables)',
    'bread': 'BREAD (1 syllable)',
    'quick': 'QUICK (1 syllable)',
    'laugh': 'LAUGH (1 syllable)',
    'book': 'BOOK (1 syllable)',
    'space': 'SPACE (1 syllable)',
    'missions': 'MIS-sions (2 syllables)',
    'reveal': 're-VEAL (2 syllables)',
    'secrets': 'SE-crets (2 syllables)',
    'planets': 'PLAN-ets (2 syllables)',
    'found': 'FOUND (1 syllable)',
    'earth': 'EARTH (1 syllable)',
    'birds': 'BIRDS (1 syllable)',
    'sing': 'SING (1 syllable)',
    'trees': 'TREES (1 syllable)',
    'sway': 'SWAY (1 syllable)',
    'nature': 'NA-ture (2 syllables)',
    'peace': 'PEACE (1 syllable)',
    'warms': 'WARMS (1 syllable)',
    'art': 'ART (1 syllable)',
    'joy': 'JOY (1 syllable)',
    'all': 'ALL (1 syllable)'
  };

  // Check for predefined pronunciation
  const lowerWord = word.toLowerCase();
  if (syllableMap[lowerWord]) {
    return syllableMap[lowerWord];
  }

  // Basic syllable counting for unknown words
  const syllableCount = countSyllables(word);
  if (syllableCount === 1) {
    return `${word.toUpperCase()} (1 syllable)`;
  }

  // Simple syllable breakdown
  const breakdown = breakIntoSyllables(word);
  return `${breakdown} (${syllableCount} syllables)`;
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function breakIntoSyllables(word: string): string {
  // Simple syllable breaking rules
  const vowels = 'aeiouAEIOU';
  const syllables: string[] = [];
  let currentSyllable = '';
  
  for (let i = 0; i < word.length; i++) {
    currentSyllable += word[i];
    
    if (vowels.includes(word[i])) {
      // If next character is consonant followed by vowel, break here
      if (i + 2 < word.length && 
          !vowels.includes(word[i + 1]) && 
          vowels.includes(word[i + 2])) {
        syllables.push(currentSyllable + word[i + 1]);
        currentSyllable = '';
        i++; // Skip the consonant we just added
      }
    }
  }
  
  if (currentSyllable) {
    syllables.push(currentSyllable);
  }
  
  return syllables.length > 1 ? syllables.join('-').toUpperCase() : word.toUpperCase();
}

/**
 * Helper function to attempt Azure Speech synthesis
 */
async function tryAzureSynthesis(text: string, speed: number, apiKey: string, region: string): Promise<Buffer | null> {
  try {
    console.log(`🔑 Attempting Azure TTS via HTTP API with region: ${region}, key length: ${apiKey?.length || 0}`);
    
    // Prepare SSML with speed control
    let ssmlContent: string;
    if (speed !== 1.0) {
      // Convert speed factor to percentage - 0.6 becomes "60%" which is slower than normal
      const prosodyRate = `${Math.round(speed * 100)}%`;
      ssmlContent = `<speak version="1.0" xml:lang="en-US">
        <voice xml:lang="en-US" xml:gender="Female" name="en-US-AvaNeural">
          <prosody rate="${prosodyRate}">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</prosody>
        </voice>
      </speak>`;
      console.log(`🐌 Using Azure SSML with prosody rate: ${prosodyRate} (${speed}x speed)`);
    } else {
      ssmlContent = `<speak version="1.0" xml:lang="en-US">
        <voice xml:lang="en-US" xml:gender="Female" name="en-US-AvaNeural">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</voice>
      </speak>`;
    }

    // Make direct HTTP request to Azure Speech API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
        'User-Agent': 'SpeechTherapyApp/1.0'
      },
      body: ssmlContent
    });

    if (!response.ok) {
      throw new Error(`Azure API returned ${response.status}: ${response.statusText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ Azure TTS synthesis completed via HTTP API. Audio size: ${audioBuffer.length} bytes`);
    
    if (audioBuffer.length === 0) {
      throw new Error("Received empty audio from Azure Speech Services");
    }

    return audioBuffer;
  } catch (error) {
    console.error(`Azure HTTP API error:`, error);
    throw new Error(`Azure TTS HTTP API failed: ${error}`);
  }
}

/**
 * Synthesize speech from SSML using Azure AI Speech SDK with native en-US-AvaNeural voice
 */
export async function synthesizeSpeechFromSSML(ssml: string): Promise<Buffer> {
  try {
    const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || "eastus";

    if (!AZURE_SPEECH_KEY) {
      throw new Error("Azure Speech key not configured");
    }

    // Import Azure Speech SDK
    const sdk = await import('microsoft-cognitiveservices-speech-sdk');
    
    // Create speech config
    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
    speechConfig.speechSynthesisVoiceName = "en-US-AvaNeural";
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;

    return new Promise<Buffer>((resolve, reject) => {
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

      const timeout = setTimeout(() => {
        try {
          synthesizer.close();
        } catch (e) {
          // Ignore cleanup errors
        }
        reject(new Error("Azure SSML synthesis timeout"));
      }, 15000); // 15 second timeout

      synthesizer.speakSsmlAsync(
        ssml,
        (result: any) => {
          clearTimeout(timeout);
          try {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              console.log(`✅ Azure SSML synthesis completed. Audio size: ${result.audioData.byteLength} bytes`);
              
              const audioBuffer = Buffer.from(result.audioData);
              
              if (audioBuffer.length === 0) {
                reject(new Error("Received empty audio from Azure Speech Services"));
                return;
              }
              
              resolve(audioBuffer);
            } else if (result.reason === sdk.ResultReason.Canceled) {
              const cancellation = sdk.CancellationDetails.fromResult(result);
              console.error(`🚫 Azure SSML synthesis canceled - Reason: ${cancellation.reason}, Error: ${cancellation.errorDetails}`);
              reject(new Error(`Azure SSML synthesis canceled: ${cancellation.reason} - ${cancellation.errorDetails}`));
            } else {
              console.error(`🚫 Azure SSML synthesis failed with reason code: ${result.reason}`);
              reject(new Error(`Azure SSML synthesis failed with reason: ${result.reason}`));
            }
          } catch (processingError) {
            reject(processingError);
          } finally {
            try {
              synthesizer.close();
            } catch (cleanupError) {
              // Ignore cleanup errors
            }
          }
        },
        (error: any) => {
          clearTimeout(timeout);
          try {
            synthesizer.close();
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          reject(new Error(`Azure SSML synthesis failed: ${error}`));
        }
      );
    });
  } catch (error) {
    console.error(`Azure SSML synthesis initialization failed:`, error);
    // Fall back to HTTP API method
    throw error;
  }
}

/**
 * Synthesize speech from text using Azure AI Speech with en-US-AvaNeural voice
 * Falls back to OpenAI with enhanced quality settings if Azure is unavailable
 */
export async function synthesizeSpeech(text: string, voice = "default", speed = 1.0): Promise<Buffer> {
  try {
    const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || "eastus";

    // Input validation
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty for speech synthesis");
    }

    const trimmedText = text.trim().slice(0, 1000);
    console.log(`🎤 Synthesizing speech for: "${trimmedText}" with speed: ${speed}x`);

    // Try Azure Speech Services first if key is available
    if (AZURE_SPEECH_KEY) {
      try {
        const azureResult = await tryAzureSynthesis(trimmedText, speed, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        if (azureResult) {
          return azureResult;
        }
      } catch (azureError: any) {
        console.warn("Azure Speech Services failed, using OpenAI fallback:", azureError?.message || azureError);
        // Fall through to OpenAI fallback
      }
    } else {
      console.log("No Azure Speech key configured, using OpenAI TTS");
    }

    // Fallback to OpenAI TTS with enhanced settings for better quality
    console.log(`🔄 Using OpenAI TTS fallback with enhanced quality settings`);
    const { generateSpeechResponse } = await import('./openai');
    
    // Use alloy voice which is closest to a natural female voice like AvaNeural
    // Apply speed control for snail mode
    return await generateSpeechResponse(trimmedText, "alloy", speed);

  } catch (error) {
    console.error("Error in speech synthesis:", error);
    throw error;
  }
}