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
    // Adjust language complexity based on difficulty level (1 through 8)
    let languageLevel = "";
    let maxWords = 150; // Default max words to conserve tokens
    let sentenceLength = "";
    let sentenceCount = 1;
    let syllableCount = "";
    let mappedDifficulty: "easy" | "medium" | "hard" = "easy"; // For backward compatibility
    
    switch(difficulty) {
      case "1":
        mappedDifficulty = "easy";
        languageLevel = "adult-level, grammatically correct sentences with extremely simple vocabulary";
        maxWords = 15;
        sentenceLength = "3-8 words";
        sentenceCount = 1;
        syllableCount = "only one-syllable words (allow minor exceptions like 'the', 'and')";
        break;
      case "2":
        mappedDifficulty = "easy";
        languageLevel = "adult-level, grammatically correct sentences with very simple vocabulary";
        maxWords = 20;
        sentenceLength = "5-10 words";
        sentenceCount = 2;
        syllableCount = "primarily one-syllable words with a few basic two-syllable words";
        break;
      case "3":
        mappedDifficulty = "easy";
        languageLevel = "adult-level, grammatically correct sentences with simple vocabulary";
        maxWords = 25;
        sentenceLength = "5-12 words";
        sentenceCount = 2;
        syllableCount = "mix of one and two-syllable words, mostly common everyday terms";
        break;
      case "4":
        mappedDifficulty = "medium";
        languageLevel = "adult-level, grammatically correct sentences with basic vocabulary";
        maxWords = 30;
        sentenceLength = "7-15 words";
        sentenceCount = 3;
        syllableCount = "mostly two-syllable words with some one-syllable words";
        break;
      case "5":
        mappedDifficulty = "medium";
        languageLevel = "adult-level, grammatically correct sentences with straightforward vocabulary";
        maxWords = 40;
        sentenceLength = "8-18 words";
        sentenceCount = 3;
        syllableCount = "balanced mix of one, two and occasional three-syllable words";
        break;
      case "6":
        mappedDifficulty = "hard";
        languageLevel = "adult-level, grammatically correct sentences with moderately advanced vocabulary";
        maxWords = 50;
        sentenceLength = "10-20 words";
        sentenceCount = 4;
        syllableCount = "mix of two and three-syllable words with occasional specialized terms";
        break;
      case "7":
        mappedDifficulty = "hard";
        languageLevel = "adult-level, grammatically correct sentences with advanced vocabulary";
        maxWords = 60;
        sentenceLength = "12-25 words";
        sentenceCount = 5;
        syllableCount = "mainly three-syllable words with some complex terms and technical vocabulary";
        break;
      case "8":
        mappedDifficulty = "hard";
        languageLevel = "adult-level, grammatically correct sentences with sophisticated vocabulary";
        maxWords = 70;
        sentenceLength = "15-30 words";
        sentenceCount = 6;
        syllableCount = "complex multi-syllable words with specialized terminology relevant to the topic";
        break;
      // Backward compatibility for older difficulty labels
      case "easy":
        return generateReadingContent("1", topic);
      case "medium":
        return generateReadingContent("4", topic);
      case "hard":
        return generateReadingContent("7", topic);
    }

    const systemPrompt = `You are creating short, ${languageLevel} about "${topic}".
    - Use ${syllableCount}. 
    - Write exactly ${sentenceCount} sentence(s), ${sentenceLength} each.
    - Keep it under ${maxWords} words total.
    - Use **natural, grammatically correct phrasing** (e.g., avoid "See the cat run").
    - Prioritize clarity and flow over strict syllable counts when needed.
    - Return ONLY JSON: {"title": "string", "content": "string", "source": "ReadAssist"}`;

    console.log(`Using OpenAI to generate content about "${topic}" with difficulty "${difficulty}"`);
    
    // Using OpenAI with max_tokens to strictly limit response size
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a cheaper model to conserve tokens
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Write an interesting ${maxWords}-word max content about ${topic}. 
Use ${languageLevel} vocabulary and create exactly ${sentenceCount} sentence(s) with ${syllableCount}.
Use only commonly used words that people encounter in everyday situations.
IMPORTANT: Keep it engaging, informative, and under ${maxWords} words total.` }
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
      difficulty: mappedDifficulty, 
      createdAt: new Date().toISOString(), // Store directly as ISO string for compatibility
    };
    
    // Return the content
    return readingContent;
  } catch (error) {
    console.error("Error generating reading content:", error);
    throw new Error("Failed to generate reading content");
  }
}

/**
 * Generate a sample content piece for initial display with latest news
 */
export async function generateSampleContent(): Promise<ReadingContent> {
  // Array of interesting topics for more variety
  const topics = [
    "latest tech innovations",
    "space exploration news",
    "health and wellness trends",
    "environmental conservation efforts",
    "popular culture highlights",
    "new scientific discoveries",
    "travel destinations",
    "sports achievements",
    "interesting facts about animals",
    "latest cooking trends"
  ];
  
  // Select a random topic from the array
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  
  // Generate content on the random topic
  return generateReadingContent(randomTopic, "easy");
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

/**
 * Process a list of phrases with AI to add phonetic guides and difficulty tags
 */
export async function processPhrases(phrases: string[]): Promise<any[]> {
  try {
    console.log(`Processing ${phrases.length} phrases with OpenAI`);
    
    const systemPrompt = `You help language learners practice speech by analyzing phrases, adding phonetic guides, and determining difficulty.
    For each phrase, provide:
    1. The original text
    2. A phonetic transcription using IPA symbols
    3. Difficulty level (beginner/intermediate/advanced)
    Return an array of JSON objects with { text, phonetic, difficulty }`;

    // Using GPT-4o for better phonetic accuracy and language analysis
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: ADVANCED_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Process these phrases for pronunciation practice:\n${phrases.join('\n')}` }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    // Parse the response
    const parsed = JSON.parse(content);
    
    // Ensure we have an array of phrases
    if (!Array.isArray(parsed.phrases)) {
      // If the response format is unexpected, create a default structure
      return phrases.map(text => ({
        text,
        phonetic: "",
        difficulty: "intermediate"
      }));
    }
    
    return parsed.phrases;
  } catch (error) {
    console.error("Error processing phrases:", error);
    // Return the original phrases with empty phonetic guides as fallback
    return phrases.map(text => ({
      text,
      phonetic: "",
      difficulty: "intermediate"
    }));
  }
}

/**
 * Generate similar phrases to an existing phrase for practice variations
 */
export async function generateSimilarPhrases(phrase: string): Promise<string[]> {
  try {
    console.log(`Generating similar phrases to: "${phrase}"`);
    
    const systemPrompt = `You help language learners by generating variations of phrases for speaking practice.
    Given a phrase, create 5 similar phrases that:
    1. Maintain the same general meaning
    2. Use a similar level of complexity
    3. Are natural expressions a native speaker would use
    4. Vary in structure to provide diverse practice
    Return only a JSON array of strings with the new phrases.`;

    // Using the advanced model for better results with language generation
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: ADVANCED_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate 5 similar but varied phrases based on: "${phrase}"` }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    // Parse the response
    const parsed = JSON.parse(content);
    
    // Ensure we have an array of phrases
    if (!Array.isArray(parsed.phrases)) {
      // If the main property isn't "phrases", look for any array in the response
      const firstArrayProperty = Object.values(parsed).find(Array.isArray);
      if (Array.isArray(firstArrayProperty)) {
        return firstArrayProperty;
      }
      // Return a single-item array with the original phrase
      return [phrase];
    }
    
    return parsed.phrases;
  } catch (error) {
    console.error("Error generating similar phrases:", error);
    // Return a single-item array with the original phrase as fallback
    return [phrase];
  }
}

/**
 * Extract text from an image or PDF using OpenAI's Vision model
 */
export async function extractTextFromImage(fileBuffer: Buffer, fileType: string): Promise<string> {
  try {
    console.log(`Extracting text from file of type: ${fileType}`);
    
    // Convert the buffer to base64
    const base64Image = fileBuffer.toString('base64');
    const dataURI = `data:${fileType};base64,${base64Image}`;
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You extract text from images and documents accurately. For documents with multiple phrases or sentences, return each one on a new line. Remove any visual artifacts, page numbers, or irrelevant text. Format the output as clean, readable text."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all the readable text from this image. Format each phrase or sentence on its own line."
            },
            {
              type: "image_url",
              image_url: {
                url: dataURI
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const extractedText = response.choices[0].message.content;
    if (!extractedText) {
      throw new Error("Failed to extract text from image");
    }
    
    return extractedText;
  } catch (error) {
    console.error("Error extracting text from image:", error);
    throw new Error("Failed to extract text from image");
  }
}

/**
 * Generate phrases related to a specific topic for pronunciation practice
 */
export async function generateTopicPhrases(topic: string, difficulty: string = "4"): Promise<string[]> {
  try {
    console.log(`Generating phrases related to topic: "${topic}" with difficulty level: ${difficulty}`);
    
    // Define complexity based on difficulty level (1-8)
    let complexityGuideline = "";
    let wordCount = "";
    let syllableLimit = "";
    
    switch(difficulty) {
      case "1":
        complexityGuideline = "extremely simple, single-word items or very short phrases";
        wordCount = "1-2 words each";
        syllableLimit = "primarily one-syllable words, no complex sounds";
        break;
      case "2":
        complexityGuideline = "very simple, mostly single words with a few basic phrases";
        wordCount = "1-3 words each";
        syllableLimit = "mostly one-syllable words with a few basic two-syllable words";
        break; 
      case "3":
        complexityGuideline = "simple, common words and short phrases";
        wordCount = "1-3 words each";
        syllableLimit = "mix of one and two-syllable words, everyday vocabulary";
        break;
      case "4":
        complexityGuideline = "straightforward words and phrases";
        wordCount = "1-4 words each";
        syllableLimit = "mostly two-syllable words with some one-syllable words";
        break;
      case "5":
        complexityGuideline = "moderately complex words and practical phrases";
        wordCount = "1-5 words each";
        syllableLimit = "balanced mix of one, two, and occasional three-syllable words";
        break;
      case "6":
        complexityGuideline = "moderately advanced vocabulary and phrases";
        wordCount = "1-5 words each";
        syllableLimit = "mix of two and three-syllable words with occasional specialized terms";
        break;
      case "7":
        complexityGuideline = "advanced vocabulary and longer phrases";
        wordCount = "2-6 words each";
        syllableLimit = "mainly multi-syllable words with some technical vocabulary";
        break;
      case "8":
        complexityGuideline = "sophisticated vocabulary and complex phrases relevant to the topic";
        wordCount = "2-7 words each";
        syllableLimit = "complex multi-syllable words with specialized terminology";
        break;
      default:
        // Use level 4 (medium) as default
        return generateTopicPhrases(topic, "4");
    }

    const systemPrompt = `You are a speech therapy assistant. Generate ${complexityGuideline} related to the specified topic.
    These should be helpful for pronunciation practice at difficulty level ${difficulty}/8.
    - Generate exactly 10 items
    - Each item should be ${wordCount}
    - Use ${syllableLimit}
    - Focus entirely on words/phrases related to the topic
    - For higher difficulty levels (7-8), include some specialized terminology related to the topic`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: ADVANCED_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a list of words and phrases related to: ${topic} at difficulty level ${difficulty}/8. Return them as a JSON array of strings named 'phrases'.` }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    // Parse the response
    const parsed = JSON.parse(content);
    
    // Extract the phrases array
    if (Array.isArray(parsed.phrases)) {
      return parsed.phrases;
    } else {
      console.warn("OpenAI response did not contain a 'phrases' array:", parsed);
      return [];
    }
  } catch (error) {
    console.error("Error generating topic phrases:", error);
    return [];
  }
}