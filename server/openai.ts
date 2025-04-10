import OpenAI from "openai";
import fs from "fs";
import { ReadingContent } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development",
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

/**
 * Transcribe audio to text using OpenAI Whisper
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    // Write the buffer to a temporary file
    const tempFilePath = `/tmp/voice-command-${Date.now()}.webm`;
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Create a file stream for the API
    const fileStream = fs.createReadStream(tempFilePath);

    // Transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
    });

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    return transcription.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio");
  }
}

/**
 * Process a voice command to determine user intent
 */
export async function processVoiceCommand(command: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for a reading application for stroke recovery patients.
          Analyze the voice command and determine the user's intent. Respond with a JSON object containing:
          - action: The action to take (generateContent, startReading, pauseReading, etc.)
          - topic: If the action is generateContent, provide the topic requested
          - parameters: Any other parameters extracted from the command
          
          Example 1: "Find me an article about gardening"
          Response: { "action": "generateContent", "topic": "gardening" }
          
          Example 2: "I want to start reading now"
          Response: { "action": "startReading" }
          
          Example 3: "Show me how to pronounce container"
          Response: { "action": "pronunciationHelp", "word": "container" }`,
        },
        {
          role: "user",
          content: command,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error processing voice command:", error);
    throw new Error("Failed to process voice command");
  }
}

/**
 * Generate reading content based on a topic and difficulty level
 */
export async function generateReadingContent(topic: string, difficulty: string): Promise<ReadingContent> {
  try {
    // Format word count and complexity based on difficulty
    let wordCount, complexity;
    switch (difficulty) {
      case 'hard':
        wordCount = 350;
        complexity = "advanced vocabulary with longer sentences";
        break;
      case 'medium':
        wordCount = 250;
        complexity = "intermediate vocabulary with moderate sentence length";
        break;
      case 'easy':
      default:
        wordCount = 200;
        complexity = "simple vocabulary with short, clear sentences";
        break;
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an educational content creator for stroke recovery patients practicing reading.
          Create a short article about ${topic} using ${complexity}.
          The text should be around ${wordCount} words and divided into clear paragraphs.
          Format as JSON with: title, content, source, wordCount, and readingTime (in seconds, estimate 2 seconds per word).`,
        },
        {
          role: "user",
          content: `Please generate a short reading passage about "${topic}" at ${difficulty} difficulty level.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const generatedContent = JSON.parse(response.choices[0].message.content);
    
    return {
      id: Date.now(), // Generate a temporary ID
      title: generatedContent.title,
      content: generatedContent.content,
      source: generatedContent.source || "AI Generated Content",
      wordCount: generatedContent.wordCount || wordCount,
      readingTime: generatedContent.readingTime || wordCount * 2,
      difficulty: difficulty,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating reading content:", error);
    throw new Error("Failed to generate reading content");
  }
}

/**
 * Generate a sample content piece for initial display
 */
export async function generateSampleContent(): Promise<ReadingContent> {
  return generateReadingContent("container gardening", "easy");
}

/**
 * Generate a speech response from text using OpenAI text-to-speech
 */
export async function generateSpeechResponse(text: string, voice: string = "nova"): Promise<Buffer> {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
    });
    
    // Convert to buffer for sending over HTTP
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error("Error generating speech response:", error);
    throw new Error("Failed to generate speech response");
  }
}
