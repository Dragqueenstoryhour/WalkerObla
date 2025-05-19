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

// Standardized difficulty scale
export const DIFFICULTY_SCALE = {
  "1": {
    name: "Very Easy",
    syllableRange: "1 syllable only",
    wordTypes: "basic everyday nouns and actions",
    examples: ["cat", "dog", "run", "walk", "eat"],
    complexity: "Extremely simple words with straightforward pronunciation",
    phonetics: "Simple consonant-vowel patterns (CV, CVC)",
    maxSentenceLength: 5
  },
  "2": {
    name: "Easy",
    syllableRange: "1-2 syllables",
    wordTypes: "common everyday vocabulary, simple actions",
    examples: ["water", "morning", "dinner", "talking"],
    complexity: "Simple words with regular spelling patterns",
    phonetics: "Basic consonant blends (bl, st, tr)",
    maxSentenceLength: 7
  },
  "3": {
    name: "Easy Medium",
    syllableRange: "1-2 syllables, occasional 3",
    wordTypes: "expanded everyday vocabulary",
    examples: ["breakfast", "computer", "yesterday", "remember"],
    complexity: "Familiar words with some phonetic challenges",
    phonetics: "Multiple consonant sounds (str, spl)",
    maxSentenceLength: 10
  },
  "4": {
    name: "Medium",
    syllableRange: "2-3 syllables",
    wordTypes: "general vocabulary, basic specialized terms",
    examples: ["important", "afternoon", "restaurant", "telephone"],
    complexity: "Some challenging sounds and longer words",
    phonetics: "Complex vowel sounds, diphthongs",
    maxSentenceLength: 12
  },
  "5": {
    name: "Medium Hard",
    syllableRange: "2-3 syllables, some 4",
    wordTypes: "varied vocabulary with specific contextual terms",
    examples: ["dictionary", "information", "technology", "understanding"],
    complexity: "Words with less predictable pronunciation",
    phonetics: "Consonant clusters, varied stress patterns",
    maxSentenceLength: 15
  },
  "6": {
    name: "Hard",
    syllableRange: "2-4 syllables",
    wordTypes: "domain-specific vocabulary, abstract concepts",
    examples: ["philosophy", "celebration", "education", "relationship"],
    complexity: "Complex words with multiple syllables",
    phonetics: "Challenging consonant combinations, stress shifts",
    maxSentenceLength: 20
  },
  "7": {
    name: "Very Hard",
    syllableRange: "3-5 syllables",
    wordTypes: "specialized terminology, abstract concepts",
    examples: ["psychology", "pharmaceutical", "collaboration", "university"],
    complexity: "Multisyllabic words with difficult sound combinations",
    phonetics: "Difficult consonant clusters, subtle vowel distinctions",
    maxSentenceLength: 25
  },
  "8": {
    name: "Expert",
    syllableRange: "3+ syllables, many 5+",
    wordTypes: "technical terminology, advanced field-specific vocabulary",
    examples: ["philosophical", "entrepreneurial", "biotechnology", "multidisciplinary"],
    complexity: "Complex multisyllabic words with challenging pronunciation",
    phonetics: "Most challenging sound combinations and stress patterns",
    maxSentenceLength: 30
  }
};

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
    // Enhanced system prompt to handle topic and difficulty parsing
    const systemPrompt = `You're ReadAssist, helping stroke recovery patients with speech. 
Parse the user's voice command to determine their intent. 
Return a JSON with:
- 'action': generateContent, startReading, pauseReading, pronunciationHelp, etc.
- 'topic': The main subject of the request (e.g., "feeding dogs", "animals"). Use the full command as the topic unless it clearly specifies another action.
- 'parameters': Optional object with 'difficulty' (1-8) if mentioned.
- 'message': Short, encouraging response.

Rules:
- If the command is a topic (e.g., "feeding dogs", "animals"), set action to "generateContent" and use the full command as the topic.
- If a difficulty level (1-8) is mentioned (e.g., "animals level 3"), include it in parameters.difficulty.
- If no difficulty is specified, default to difficulty "1".
- For non-content actions (e.g., "start reading"), omit topic and parameters unless relevant.

Examples:
"feeding dogs" → {"action":"generateContent","topic":"feeding dogs","parameters":{"difficulty":"1"},"message":"I'll find a reading about feeding dogs."}
"animals level 3" → {"action":"generateContent","topic":"animals","parameters":{"difficulty":"3"},"message":"I'll find a reading about animals."}
"start reading" → {"action":"startReading","message":"Starting the reading for you."}
"how to say dog" → {"action":"pronunciationHelp","word":"dog","message":"I'll help you say 'dog'."}`;

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

    // Ensure default difficulty if not provided for generateContent
    if (result.action === 'generateContent' && (!result.parameters || !result.parameters.difficulty)) {
      result.parameters = { ...result.parameters, difficulty: "1" };
    }

    // Add default encouragement if none provided
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
    source: "ReadAssist"
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
        return generateReadingContent(topic, "1");
      case "medium":
        return generateReadingContent(topic, "4");
      case "hard":
        return generateReadingContent(topic, "7");
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
  return generateReadingContent(randomTopic, "1"); // Default to difficulty 1
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
 * Generate topic-specific phrases with enhanced difficulty level support
 */
export async function generateTopicPhrases(
  topic: string, 
  difficulty: string = "4", 
  wordTypes?: string[],
  syllableRange?: { min?: number, max?: number }
): Promise<string[]> {
  try {
    console.log(`Generating phrases related to topic: "${topic}" with difficulty level: ${difficulty}`);

    // Validate difficulty level
    if (!DIFFICULTY_SCALE[difficulty]) {
      console.warn(`Invalid difficulty level ${difficulty}, defaulting to level 4`);
      difficulty = "4";
    }

    // Use the standardized difficulty scale
    const difficultyInfo = DIFFICULTY_SCALE[difficulty];

    // Define complexity based on difficulty
    const complexityMapping = {
      "1": "very short phrases (3-5 words), using extremely simple vocabulary and basic grammar, suitable for absolute beginners",
      "2": "short phrases (5-7 words) with simple vocabulary and basic sentence structures",
      "3": "short phrases (6-8 words) with slightly varied vocabulary and simple sentence structures",
      "4": "medium-length phrases (8-10 words) with general vocabulary and straightforward sentence structures",
      "5": "medium-length phrases (10-12 words) with varied vocabulary and moderately complex sentence structures",
      "6": "longer phrases (12-15 words) with diverse vocabulary and moderately complex sentence structures",
      "7": "complex phrases (12-20 words) with advanced vocabulary and varied sentence structures",
      "8": "highly complex phrases (15-25 words) with sophisticated vocabulary and intricate sentence structures"
    };

    const complexity = complexityMapping[difficulty];

    // Build word type requirements
    let wordTypeRequirement = difficultyInfo.wordTypes;
    if (wordTypes && wordTypes.length > 0) {
      wordTypeRequirement = wordTypes.join(", ");
    }

    // Examples to guide the model
    const examples = difficultyInfo.examples.slice(0, 3).join(", ");

    // Build system prompt
    const systemPrompt = `
You are a speech rehabilitation assistant generating conversational phrases for people with difficulty speaking to practice pronunciation.

**Task**:
Generate exactly 8 natural, grammatically correct phrases related to the topic "${topic}" for speech practice.

**Difficulty Level**: ${difficulty}/8 (${difficultyInfo.name})

**Requirements**:
- **Complexity**: ${complexity}
- **Word Types**: Use ${wordTypeRequirement} (e.g., ${examples})
- **Sentence Length**: Phrases should be ${difficultyInfo.maxSentenceLength} words or fewer
- **Phonetic Considerations**: Include ${difficultyInfo.phonetics} where appropriate
- **Content**:
  - Phrases must be meaningful, practical, and usable in everyday conversations
  - Ensure phrases are complete sentences or standalone expressions
  - Relate phrases directly to the topic "${topic}"
- **Exclusions**:
  - Do NOT include numbers or numerical sequences (e.g., "5, 4, 3")
  - Do NOT include hyphenated syllabic breakdowns (e.g., "cog-ni-tive ther-a-py")
  - Avoid overly technical or academic terms unless essential to the topic and difficulty
  - Do NOT include incomplete sentences, fragments, lists, bullet points, or markdown formatting
- **Output Format**:
  - Return a JSON object with a single key "phrases" containing an array of 8 strings
  - Example: {"phrases": ["phrase 1", "phrase 2", ..., "phrase 8"]}

**Examples for Topic "Commonly Used Phrases"**:
- Difficulty 1: ["Hi, how are you?", "Good morning!", "Thank you very much."]
- Difficulty 7: ["Could you please clarify your position?", "I appreciate your thoughtful consideration.", "Would you mind elaborating on the main points?"]`;

    const response = await openai.chat.completions.create({
      model: ADVANCED_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate exactly 8 conversational phrases for the topic "${topic}" at difficulty level ${difficulty}/8. Follow all requirements and return as a JSON object with a "phrases" array.` }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Raw response content:", content);

    // Parse the response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError, "Raw content:", content);
      // Fallback: attempt to extract phrases manually
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^{|}|"phrases"|\[|\]|,$/))
        .map(line => line.replace(/^["']|["']$/g, '')) // Remove quotes
        .slice(0, 8);
      parsed = { phrases: lines };
    }

    // Validate the phrases array
    if (!parsed.phrases || !Array.isArray(parsed.phrases)) {
      console.warn("OpenAI response did not contain a valid 'phrases' array:", parsed);
      parsed.phrases = [];
    }

    // Filter and validate phrases
    let validPhrases = parsed.phrases
      .filter(phrase => {
        // Ensure phrase is a string and non-empty
        if (typeof phrase !== 'string' || !phrase.trim()) return false;
        // Exclude numbers and hyphenated terms
        if (/^\d+(,\s*\d+)*$/.test(phrase)) return false; // e.g., "5, 4, 3"
        if (phrase.includes('-') && !phrase.match(/^[a-zA-Z]+-[a-zA-Z]+$/)) return false; // e.g., "cog-ni-tive"
        // Allow phrases up to max sentence length + 20% to account for natural variation
        const wordCount = phrase.split(/\s+/).length;
        if (wordCount > difficultyInfo.maxSentenceLength * 1.2) return false;
        return true;
      })
      .slice(0, 8);

    // If we don't have enough valid phrases, retry once
    if (validPhrases.length < 8) {
      console.warn(`Only ${validPhrases.length} valid phrases generated, retrying once...`);
      const additionalPhrases = await generateTopicPhrases(topic, difficulty, wordTypes, syllableRange);
      validPhrases = [
        ...validPhrases,
        ...additionalPhrases.filter(p => !validPhrases.includes(p))
      ].slice(0, 8);
    }

    // Ensure exactly 10 phrases
    while (validPhrases.length < 8) {
      validPhrases.push(`Sample phrase for ${topic} ${validPhrases.length + 1}`);
    }
    while (validPhrases.length > 10) {
      validPhrases.pop();
    }

    return validPhrases;
  } catch (error) {
    console.error("Error generating topic phrases:", error);
    return Array(8).fill(`Sample phrase for ${topic}`);
  }
}