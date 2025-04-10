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

// Check if Azure key is properly configured
const isAzureConfigured = speechKey !== "dummy-key-for-development";

// Log Azure setup status on startup
if (!isAzureConfigured) {
  console.warn("⚠️ WARNING: Using dummy Azure key. Speech services will use demo data.");
  console.warn("To use actual Azure Speech services, set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in environment variables.");
} else {
  console.log("✅ Azure Speech Services configured successfully.");
}

/**
 * Helper function to generate mock pronunciation assessment results for testing
 */
function createMockAssessmentResults(referenceText: string): PronunciationAssessmentResult {
  // Extract some actual words from the reference text to use in the mock results
  const words = referenceText.split(/\s+/).filter(w => w.length > 2);
  const sampleWords = words.slice(0, Math.min(5, words.length));

  // Create mock word level results based on actual text
  const wordLevelResults = sampleWords.map(word => {
    const score = Math.floor(Math.random() * 40) + 60; // Random score between 60-99
    return {
      word,
      accuracyScore: score,
      errorType: score < 75 ? "Mispronunciation" : undefined
    };
  });

  // Return mock results with words from the actual text
  return {
    pronunciationScore: 86,
    fluencyScore: 72,
    completenessScore: 94,
    accuracyScore: 89,
    prosodyScore: 78,
    wordLevelResults: wordLevelResults.length ? wordLevelResults : [
      { word: "today", accuracyScore: 60, errorType: "Mispronunciation" },
      { word: "news", accuracyScore: 92 },
      { word: "headlines", accuracyScore: 75, errorType: "Mispronunciation" },
    ],
  };
}

/**
 * Assess pronunciation from audio buffer
 */
export async function assessPronunciation(audioBuffer: Buffer, referenceText: string): Promise<PronunciationAssessmentResult> {
  try {
    // Log diagnostic information
    console.log(`Processing audio buffer length: ${audioBuffer.length} bytes`);
    console.log(`Reference text: "${referenceText}"`);

    // For demo purposes or when no Azure key is available
    if (speechKey === "dummy-key-for-development") {
      console.log("Using dummy key - returning mock pronunciation results");
      return createMockAssessmentResults(referenceText);
    }

    // Set up the speech config for real Azure processing
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);

    // Create a push stream for the audio data
    const pushStream = sdk.AudioInputStream.createPushStream();
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

    // Push the audio data to the stream
    pushStream.write(audioBuffer);
    pushStream.close();

    // Create pronunciation assessment config
    const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true // Enable miscue detection
    );

    // Try to enable prosody assessment
    try {
      // @ts-ignore - Handle SDK version differences
      pronunciationConfig.enableProsodyAssessment();
    } catch (error) {
      console.log("Prosody assessment not available in this SDK version");
    }

    // Create speech recognizer
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationConfig.applyTo(recognizer);

    // Process the audio and get assessment results
    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close();

          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);

            // Extract word-level results
            const wordLevelResults = pronunciationResult.detailResult?.Words?.map(word => ({
              word: word.Word,
              accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
              errorType: word.PronunciationAssessment?.ErrorType
            })) || [];

            resolve({
              pronunciationScore: pronunciationResult.pronunciationScore || 0,
              fluencyScore: pronunciationResult.fluencyScore || 0,
              completenessScore: pronunciationResult.completenessScore || 0,
              accuracyScore: pronunciationResult.accuracyScore || 0,
              prosodyScore: pronunciationResult.prosodyScore,
              wordLevelResults
            });
          } else {
            reject(new Error(`Speech recognition failed: ${result.reason}`));
          }
        },
        (error) => {
          recognizer.close();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error("Error assessing pronunciation:", error);
    throw new Error(`Failed to assess pronunciation: ${error.message}`);
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