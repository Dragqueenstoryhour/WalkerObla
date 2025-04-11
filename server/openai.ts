import OpenAI from "openai";
import fs from "fs";
import { ReadingContent } from "@shared/schema";
import fetch from 'node-fetch';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development",
});

// Using web search-enabled models where available to get latest information
const SEARCH_MODEL = "gpt-4o-search-preview";
// Fallback for other cases
const MODEL = "gpt-4o";

// Initialize Perplexity API key
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "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";
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

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
    // Using a system prompt specifically designed for stroke patients
    const systemPrompt = `
      You are a specialized voice assistant for ReadAssist that helps find latest news summaries.
      Your goal is to understand voice commands that may have speech impairments or difficulties.
      Be extremely patient and understanding, focusing on the core intent rather than exact wording.
      
      Guidelines:
      1. Interpret commands even when speech is unclear or partially formed
      2. Focus on identifying the news topic the user wants to learn about
      3. Be forgiving of grammar, pronunciation, or word order issues
      4. If uncertain, lean toward the most helpful interpretation
      5. Respond with supportive, encouraging language
      6. Always treat requests as news/information queries unless explicitly stated otherwise
      
      When analyzing commands, return a JSON object with:
      - 'action': The primary intent (generateContent, startReading, pauseReading, etc.)
      - 'topic': For content requests, what topic they want to read about
      - 'parameters': Any additional parameters like difficulty level
      - 'message': A supportive message to speak back to the user
      
      Example 1: "Find me an article about gardening"
      Response: { 
        "action": "generateContent", 
        "topic": "gardening",
        "message": "I'll find a great reading passage about gardening for you. Nice choice!"
      }
      
      Example 2: "I want to start reading now"
      Response: { 
        "action": "startReading",
        "message": "Starting your reading session now. You're doing great with your practice!"
      }
      
      Example 3: "Show me how to pronounce container"
      Response: { 
        "action": "pronunciationHelp", 
        "word": "container",
        "message": "Let me help you with pronouncing 'container'. We'll work on this together."
      }
      
      Example 4: "Something about space ex...exploration"
      Response: {
        "action": "generateContent",
        "topic": "space exploration",
        "message": "Space exploration is fascinating! I'll find a good article about it for you."
      }
    `;
    
    // Using GPT-4o for better understanding of impaired speech patterns
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: command }
      ],
      temperature: 0.2, // Lower temperature for more predictable responses
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
        result.message = `I'll find a great reading passage about ${result.topic} for you. Nice choice!`;
      } else if (result.action === 'help') {
        result.message = "I'm here to help. You're doing great with your reading practice.";
      } else {
        result.message = "I understood your request. You're making excellent progress.";
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
export async function generateReadingContent(topic: string, difficulty: string): Promise<ReadingContent> {
  try {
    // Adjust language complexity based on difficulty level
    let languageLevel = "";
    let wordLimit = "";
    let sentenceLength = "";
    
    switch(difficulty) {
      case "easy":
        languageLevel = "very simple, elementary school level (grades 1-3)";
        wordLimit = "150-200";
        sentenceLength = "5-7 words";
        break;
      case "medium":
        languageLevel = "simple, elementary school level (grades 4-6)";
        wordLimit = "200-300";
        sentenceLength = "8-10 words";
        break;
      case "hard":
      default:
        languageLevel = "straightforward, middle school level";
        wordLimit = "300-400";
        sentenceLength = "10-12 words";
        break;
    }
    
    const systemPrompt = `
      You are a helpful assistant. Please provide a brief summary about "${topic}" in simple words.
      
      Return the response in JSON format with:
      - title: A clear, simple title
      - content: The formatted content with proper paragraph breaks
      - source: "Latest News Summary by ReadAssist"
      - wordCount: The actual word count
      - readingTime: Estimated reading time in seconds (use 3 seconds per word)
    `;

    console.log(`Using Perplexity API to generate content about "${topic}" with difficulty "${difficulty}"`);
    
    // Prepare request payload - model names in Perplexity API are case-sensitive
    const requestBody = {
      model: "pplx-7b-online", // Using a valid Perplexity model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate an article about ${topic} for stroke recovery patients.` }
      ],
      temperature: 0.7
    };
    
    console.log("Perplexity API request payload:", JSON.stringify(requestBody));
    
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    // Enhanced error handling with response body for better debugging
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error [${response.status}]: ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Perplexity API response:", JSON.stringify(result));
    
    let content;
    try {
      // The API might return JSON directly or as a string that needs parsing
      if (typeof result.choices[0].message.content === 'string') {
        try {
          content = JSON.parse(result.choices[0].message.content);
        } catch (parseError) {
          console.log("Could not parse as JSON, treating as raw text");
          // If not valid JSON, create our own structured content
          content = {
            title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} News`,
            content: result.choices[0].message.content,
            source: "Latest News Summary by ReadAssist"
          };
        }
      } else {
        content = result.choices[0].message.content;
      }
    } catch (err) {
      console.error("Error processing API response:", err);
      throw new Error("Failed to process Perplexity API response");
    }
    
    // Calculate word count if not provided in the content
    const calculatedWordCount = content.content.split(/\s+/).filter(Boolean).length;

    // Create reading content object with proper typing
    return {
      id: Date.now(),
      title: content.title,
      content: content.content,
      source: content.source || "AI-Generated for ReadAssist",
      wordCount: content.wordCount || calculatedWordCount,
      readingTime: content.readingTime || calculatedWordCount * 3,
      difficulty: difficulty as any, // Cast to match expected string literal types
      createdAt: new Date(), // Use actual Date object instead of string
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