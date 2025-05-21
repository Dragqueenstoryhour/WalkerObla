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
export async function generateSimilarPhrases(
  phrase: string,
  type: "words" | "phrases" = "phrases" // Add type parameter with default
): Promise<string[]> {
  try {
    console.log(`Generating similar ${type} to: "${phrase}"`);

    const itemType = type === "words" ? "words" : "phrases";

    const systemPrompt = `You help language learners by generating variations of ${itemType} for speaking practice.
    Given a ${itemType}, create 5 similar ${itemType} that:
    1. Maintain the same general meaning (if applicable for words)
    2. Use a similar level of complexity
    3. Are natural expressions a native speaker would use
    4. Vary in structure to provide diverse practice (for phrases) or distinct but related words (for words)
    Return only a JSON array of strings with the new ${itemType}.`;

    const response = await openai.chat.completions.create({
      model: ADVANCED_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate 5 similar but varied ${itemType} based on: "${phrase}"` }
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
    console.error(`Error generating similar ${type}:`, error);
    // Return a single-item array with the original phrase as fallback
    return [phrase];
  }
}

/**
 * Generate topic-specific phrases or words with enhanced difficulty level support
 */
export async function generateTopicPhrases(
  topic: string,
  difficulty: string = "4",
  type: "words" | "phrases" = "words" // Default to words as per new requirements
): Promise<string[]> {
  try {
    console.log(`Generating ${type} related to topic: "${topic}" with difficulty level: ${difficulty}`);

    // Validate difficulty level
    if (!DIFFICULTY_SCALE[difficulty]) {
      console.warn(`Invalid difficulty level ${difficulty}, defaulting to level 4`);
      difficulty = "4";
    }

    const difficultyInfo = DIFFICULTY_SCALE[difficulty];
    const numberOfItems = 8; // Always generate 8 items

    let itemTypeDescription;
    let complexityDescription;
    let lengthConstraint;
    let examplesBasedOnType;

    if (type === "words") {
      itemTypeDescription = "single individual words (not phrases)";
      complexityDescription = difficultyInfo.complexity.replace('words with', 'single words with'); // Adjust for words
      lengthConstraint = `Words MUST be single words only with ${difficultyInfo.syllableRange}`;
      examplesBasedOnType = difficultyInfo.examples.slice(0, 3).join(", ");
    } else { // type === "phrases"
      itemTypeDescription = "natural, grammatically correct phrases";
      complexityDescription = `phrases with ${difficultyInfo.complexity.toLowerCase()}`;
      lengthConstraint = `Phrases should be ${difficultyInfo.maxSentenceLength} words or fewer`;
      examplesBasedOnType = `Example phrases: "${difficultyInfo.examples.slice(0, 2).join('", "')}"`;
    }

    // Build system prompt
    const systemPrompt = `
You are a speech rehabilitation assistant generating ${itemTypeDescription} for people with difficulty speaking to practice pronunciation.

**Task**:
Generate exactly ${numberOfItems} ${itemTypeDescription} related to the topic "${topic}" for speech practice.
${type === "words" ? "IMPORTANT: Each item MUST be a SINGLE WORD ONLY. No phrases or multiple words allowed." : ""}

**Difficulty Level**: ${difficulty}/8 (${difficultyInfo.name})

**Requirements**:
- **Complexity**: ${complexityDescription}
- **Word Types**: Use ${difficultyInfo.wordTypes} (e.g., ${difficultyInfo.examples.slice(0,3).join(', ')})
- **Length**: ${lengthConstraint}
- **Phonetic Considerations**: Include ${difficultyInfo.phonetics} where appropriate
- **Content**:
  - ${itemTypeDescription} must be meaningful, practical, and usable in everyday conversations
  - If generating phrases, ensure they are complete sentences or standalone expressions
  - Relate ${itemTypeDescription} directly to the topic "${topic}"
- **Exclusions**:
  - Do NOT include numbers or numerical sequences (e.g., "5, 4, 3")
  - Do NOT include hyphenated syllabic breakdowns (e.g., "cog-ni-tive ther-a-py")
  - Avoid overly technical or academic terms unless essential to the topic and difficulty
  - Do NOT include incomplete sentences, fragments, lists, bullet points, or markdown formatting
- **Output Format**:
  - Return a JSON object with a single key "phrases" containing an array of ${numberOfItems} strings
  - Example: {"phrases": ["item 1", "item 2", ..., "item ${numberOfItems}"]}

**Examples for Topic "Commonly Used Phrases"**:
- Difficulty 1: ["Hi, how are you?", "Good morning!", "Thank you very much."]
**Examples for Topic "Common English Words"**:
- Difficulty 1: ["cat", "dog", "house"]
`;

    const response = await openai.chat.completions.create({
      model: ADVANCED_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate exactly ${numberOfItems} conversational ${itemTypeDescription} for the topic "${topic}" at difficulty level ${difficulty}/8. Follow all requirements and return as a JSON object with a "phrases" array.` }
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
        .slice(0, numberOfItems);
      parsed = { phrases: lines };
    }

    // Validate the phrases array
    if (!parsed.phrases || !Array.isArray(parsed.phrases)) {
      console.warn("OpenAI response did not contain a valid 'phrases' array:", parsed);
      parsed.phrases = [];
    }

    // Filter and validate phrases/words
    let validItems = parsed.phrases
      .filter(item => {
        // Ensure item is a string and non-empty
        if (typeof item !== 'string' || !item.trim()) return false;
        // Exclude numbers and hyphenated terms (unless they are valid compound words)
        if (/^\d+(,\s*\d+)*$/.test(item)) return false; // e.g., "5, 4, 3"
        // Adjust hyphenation check for words vs. phrases if needed. For now, keep it general.
        if (item.includes('-') && !item.match(/^[a-zA-Z]+(-[a-zA-Z]+)*$/)) return false; // e.g., "cog-ni-tive", allow "well-being"

        const wordCount = item.split(/\s+/).length;
        if (type === "words") {
            // For words, ensure it's a single word primarily
            if (wordCount > 1) return false;
        } else {
            // For phrases, allow up to max sentence length + 20%
            if (wordCount > difficultyInfo.maxSentenceLength * 1.2) return false;
        }
        return true;
      })
      .slice(0, numberOfItems);

    // If we don't have enough valid items, retry once
    if (validItems.length < numberOfItems) {
      console.warn(`Only ${validItems.length} valid ${type} generated, retrying once...`);
      const additionalItems = await generateTopicPhrases(topic, difficulty, type);
      validItems = [
        ...validItems,
        ...additionalItems.filter(p => !validItems.includes(p))
      ].slice(0, numberOfItems);
    }

    // Ensure exactly `numberOfItems` (8)
    while (validItems.length < numberOfItems) {
      validItems.push(`Sample ${type === "words" ? "word" : "phrase"} for ${topic} ${validItems.length + 1}`);
    }
    while (validItems.length > numberOfItems) {
      validItems.pop();
    }

    return validItems;
  } catch (error) {
    console.error(`Error generating topic ${type}:`, error);
    return Array(8).fill(`Sample ${type === "words" ? "word" : "phrase"} for ${topic}`);
  }
}