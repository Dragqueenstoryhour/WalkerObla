import OpenAI from "openai";
import fs from "fs";
import { ReadingContent } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development",
});

// Using web search-enabled models where available to get latest information
const SEARCH_MODEL = "gpt-4o-search-preview";
// Fallback for other cases
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
 * Process a voice command to determine user intent using the advanced GPT-4o model
 * specifically optimized for stroke recovery patients
 */
export async function processVoiceCommand(command: string): Promise<any> {
  try {
    // Using a system prompt specifically designed for stroke patients
    const systemPrompt = `
      You are a specialized voice assistant for ReadAssist, a reading app designed for stroke recovery patients.
      Your goal is to understand voice commands that may have speech impairments or difficulties.
      Be extremely patient and understanding, focusing on the core intent rather than exact wording.
      
      Guidelines for working with stroke recovery patients:
      1. Interpret commands even when speech is unclear or partially formed
      2. Focus on key intent words like "read", "article", "about", "topic", etc.
      3. Be forgiving of grammar, pronunciation, or word order issues
      4. If uncertain, lean toward the most helpful interpretation
      5. Respond with supportive, encouraging language
      
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
    // Format word count and complexity based on difficulty, optimized for stroke patients
    let wordCount, complexity, formatting, vocabulary;
    switch (difficulty) {
      case 'hard':
        wordCount = 300;
        complexity = "moderate complexity";
        formatting = "use medium-length paragraphs with clear transitions";
        vocabulary = "use more varied vocabulary but avoid extremely rare or technical words";
        break;
      case 'medium':
        wordCount = 200;
        complexity = "gentle complexity";
        formatting = "use short paragraphs with very clear transitions";
        vocabulary = "use common vocabulary with occasional new words";
        break;
      case 'easy':
      default:
        wordCount = 150;
        complexity = "simple structure";
        formatting = "use very short paragraphs (3-4 sentences each)";
        vocabulary = "use common, everyday words";
        break;
    }

    const systemPrompt = `
      You are a specialized educational content creator for stroke recovery patients practicing reading.
      Your audience may have reading difficulties, aphasia, or other language processing challenges.
      
      Guidelines for creating content for stroke patients:
      1. Use ${complexity} with clear sentence structure
      2. ${formatting}
      3. ${vocabulary}
      4. Use generous spacing between paragraphs
      5. Include a brief but supportive introduction and conclusion
      6. Use encouraging, positive language throughout
      7. Focus on uplifting, interesting topics that promote recovery mindset
      8. Format text with visual clarity in mind
      
      Create a short, engaging article about "${topic}" following these guidelines.
      The text should be approximately ${wordCount} words.
      
      Format your response as JSON with these fields:
      - title: A clear, simple title
      - content: The formatted content with proper paragraph breaks
      - source: Attribute as "AI-Generated for ReadAssist"
      - wordCount: The actual word count
      - readingTime: Estimated reading time in seconds (use 3 seconds per word for stroke patients)
    `;

    // Use search-enabled model or fall back to regular model
    let response;
    try {
      // The search-enabled model has different parameter requirements
      response = await openai.chat.completions.create({
        model: SEARCH_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Please generate an appropriate reading passage about "${topic}" based on the latest news or information at ${difficulty} difficulty level for a stroke recovery patient. Include recent developments, updates, or current information about the topic.` 
          },
        ],
        response_format: { type: "json_object" },
        web_search_options: {
          search_context_size: "medium" // Balance between quality and speed
        },
      });
    } catch (error) {
      console.warn("Search model failed, falling back to standard model:", error);
      // Fall back to standard model if search model fails
      response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Please generate an appropriate reading passage about "${topic}" at ${difficulty} difficulty level for a stroke recovery patient.` 
          },
        ],
        temperature: 0.7, // Slightly higher for more engaging content
        response_format: { type: "json_object" },
      });
    }

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    const generatedContent = JSON.parse(content);
    
    return {
      id: Date.now(), // Generate a temporary ID
      title: generatedContent.title,
      content: generatedContent.content,
      source: generatedContent.source || "AI-Generated for ReadAssist",
      wordCount: generatedContent.wordCount || wordCount,
      readingTime: generatedContent.readingTime || wordCount * 3, // Using 3 seconds per word for stroke patients
      difficulty: difficulty,
      createdAt: new Date(),
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
