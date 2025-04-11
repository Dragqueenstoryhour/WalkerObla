import OpenAI from "openai";
import fs from "fs";
import { ReadingContent } from "@shared/schema";
import fetch from 'node-fetch';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development",
});

// Use cost-effective model for most tasks
const MODEL = "gpt-3.5-turbo";
// Use more capable model only when needed
const ADVANCED_MODEL = "gpt-4o";

/**
 * Transcribe audio to text using OpenAI Whisper
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    console.log(`Transcribing audio with Whisper: buffer size = ${audioBuffer.length} bytes`);
    
    // Determine file extension based on audio content analysis (if possible)
    // Default to .webm which is common for browser recordings
    const fileExtension = '.webm';
    const tempFilePath = `/tmp/voice-command-${Date.now()}${fileExtension}`;
    
    // Write the buffer to a temporary file
    fs.writeFileSync(tempFilePath, audioBuffer);
    console.log(`Audio saved to temporary file: ${tempFilePath}`);
    
    // Create a file stream for the API
    const fileStream = fs.createReadStream(tempFilePath);
    
    console.log('Sending audio to OpenAI Whisper for transcription...');
    
    // Transcribe the audio using Whisper model
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language: "en", // Specify English for better accuracy with stroke patients
      response_format: "text",
    });
    
    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);
    
    // Handle different response formats from OpenAI
    const transcriptionText = typeof transcription === 'string' 
      ? transcription 
      : (transcription as any).text || '';
    
    console.log(`Whisper transcription result: "${transcriptionText}"`);
    
    return transcriptionText;
  } catch (error) {
    console.error("Error transcribing audio with Whisper:", error);
    throw new Error("Failed to transcribe audio with Whisper");
  }
}

/**
 * Process a voice command to determine user intent using the advanced GPT-4o model
 * specifically optimized for stroke recovery patients
 */
export async function processVoiceCommand(command: string): Promise<any> {
  try {
    // Using a more concise system prompt to reduce token usage
    const systemPrompt = `You're ReadAssist, helping patients with speech issues. 
Return a JSON with: 
- 'action': generateContent, startReading, pauseReading, pronunciationHelp, etc.
- 'topic': For content requests
- 'word': For pronunciation requests
- 'message': Short, encouraging response

Examples:
"Find about gardening" → {"action":"generateContent","topic":"gardening"}
"Start reading" → {"action":"startReading"}
"How to say container" → {"action":"pronunciationHelp","word":"container"}`;
    
    // Using a cheaper model to save tokens
    const response = await openai.chat.completions.create({
      model: MODEL, // Using cheaper model defined earlier
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: command }
      ],
      temperature: 0.2,
      max_tokens: 150, // Limiting token output
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    const result = JSON.parse(content);
    
    // Add default encouragement for stroke patients if none provided
    if (!result.message) {
      if (result.action === 'generateContent') {
        result.message = `I'll find a reading about ${result.topic} for you.`;
      } else if (result.action === 'help') {
        result.message = "I'm here to help. You're doing great.";
      } else {
        result.message = "I understood your request.";
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error processing voice command:", error);
    throw new Error("Failed to process voice command");
  }
}

/**
 * Generate reading content based on a topic and difficulty level,
 * with special considerations for stroke recovery patients
 */
// Helper function to create default content structure
function createDefaultContent(topic: string, rawContent: string): any {
  // Extract a title from the content if possible
  let title = `${topic.charAt(0).toUpperCase() + topic.slice(1)} News`;
  
  // Look for potential heading pattern at the beginning
  const titleMatch = rawContent.match(/^(?:##+\s*|\*\*|__)?([^#\n\*_]+)(?:\*\*|__|##+)?/);
  if (titleMatch && titleMatch[1].trim()) {
    title = titleMatch[1].trim();
  }
  
  // Clean up content by removing markdown code blocks and JSON syntax
  let cleanContent = rawContent
    .replace(/```(?:json)?\s*({[\s\S]*?})\s*```/g, '') // Remove code blocks with JSON
    .replace(/```[\s\S]*?```/g, '')  // Remove any other code blocks
    .replace(/^\s*{\s*"title":[^}]*}/g, '') // Remove JSON title object
    .trim();
    
  // If the content is now empty, use the original
  if (!cleanContent) {
    cleanContent = rawContent;
  }
  
  return {
    title: title,
    content: cleanContent,
    source: "Latest News Summary by ReadAssist"
  };
}

export async function generateReadingContent(topic: string, difficulty: string): Promise<ReadingContent> {
  try {
    // Adjust language complexity based on difficulty level - keeping very concise for token efficiency
    let languageLevel = "";
    let maxWords = 150; // Default max words to conserve tokens
    let sentenceLength = "";
    
    switch(difficulty) {
      case "easy":
        languageLevel = "very simple, grades 1-3";
        maxWords = 150;
        sentenceLength = "5-7 words";
        break;
      case "medium":
        languageLevel = "simple, grades 4-6";
        maxWords = 175;
        sentenceLength = "8-10 words";
        break;
      case "hard":
      default:
        languageLevel = "straightforward, middle school";
        maxWords = 200;
        sentenceLength = "10-12 words";
        break;
    }
    
    // Using a more concise prompt to reduce token usage
    const systemPrompt = `You are creating short, ${languageLevel} level reading content about "${topic}" for stroke patients.
Keep it under ${maxWords} words total. Use short sentences (${sentenceLength}).
Return ONLY a JSON object with: {"title": "short title", "content": "simple content with paragraphs", "source": "ReadAssist"}`;

    console.log(`Using OpenAI to generate content about "${topic}" with difficulty "${difficulty}"`);
    
    // Using OpenAI with max_tokens to strictly limit response size
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a cheaper model to conserve tokens
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Write a short, ${maxWords}-word max article about ${topic}. 
Use ${languageLevel} vocabulary and ${sentenceLength} sentences. 
Include 2-3 very short paragraphs with breaks between them.
IMPORTANT: Keep it under ${maxWords} words total. Do not exceed this limit.` }
      ],
      temperature: 0.7,
      max_tokens: 300, // Strict token limit to prevent large responses
      response_format: { type: "json_object" } // Ensure JSON format
    });

    const responseContent = completion.choices[0].message.content;
    console.log("Raw response content:", responseContent);
    
    let content;
    try {
      // Parse the JSON response
      content = JSON.parse(responseContent || "{}");
      
      // Make sure we have all required fields
      if (!content.title || !content.content) {
        console.log("Parsed content missing required fields, using default structure");
        content = createDefaultContent(topic, responseContent || "");
      }
    } catch (err) {
      console.error("Error processing API response:", err);
      // Create a default content as fallback
      content = createDefaultContent(topic, responseContent || "Content unavailable");
    }
    
    // Calculate word count
    const calculatedWordCount = content.content.split(/\s+/).filter(Boolean).length;

    // Create the object first to avoid type compatibility issues
    const readingContent = {
      id: Date.now(),
      title: content.title,
      content: content.content,
      source: content.source || "AI-Generated for ReadAssist",
      wordCount: Math.min(calculatedWordCount, maxWords), // Ensure word count doesn't exceed our limit
      readingTime: calculatedWordCount * 3,
      difficulty: difficulty as "easy" | "medium" | "hard", 
      createdAt: new Date(), // Use Date object for database
    };
    
    // For client use, convert to match the client-side type which uses strings
    return {
      ...readingContent,
      createdAt: readingContent.createdAt.toISOString()
    };
  } catch (error) {
    console.error("Error generating reading content:", error);
    throw new Error("Failed to generate reading content");
  }
}

/**
 * Generate a sample content piece for initial display with latest news
 */
export async function generateSampleContent(): Promise<ReadingContent> {
  return generateReadingContent("latest news summary from the past 24 hours", "easy");
}

/**
 * Generate a speech response from text using OpenAI text-to-speech
 */
export async function generateSpeechResponse(text: string, voice: string = "alloy"): Promise<Buffer> {
  try {
    // OpenAI only accepts specific voice options: nova, shimmer, echo, onyx, fable, alloy, ash, sage, or coral
    // If voice is invalid, default to alloy
    const validVoices = ["nova", "shimmer", "echo", "onyx", "fable", "alloy", "ash", "sage", "coral"];
    const safeVoice = validVoices.includes(voice) ? voice : "alloy";
    
    console.log(`Generating speech with voice: ${safeVoice}`);
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: safeVoice,
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