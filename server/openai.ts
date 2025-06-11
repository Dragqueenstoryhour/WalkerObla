import OpenAI from "openai";
import fs from "fs";
import { ReadingContent } from "@shared/schema";
import fetch from 'node-fetch'; // eslint-disable-line @typescript-eslint/no-unused-vars -- This import is used by the original file.

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
    const systemPrompt = `You're Obla, helping people with the pronunciation of their speech.
Parse the user's voice command to determine their intent.
Return a JSON with:
- 'action': The detected user intent. This should be one of: 'generateContent', 'startReading', 'pauseReading', 'pronunciationHelp', 'help'.
- 'topic': The main subject of the request (e.g., "feeding dogs", "animals"). Use the full command as the topic unless it clearly specifies another action.
- 'parameters': Optional object with 'difficulty' (1-8) if mentioned.
- 'message': Short, encouraging response relevant to the detected action and topic.

Rules:
- If the command is a topic (e.g., "feeding dogs", "animals"), set action to "generateContent" and use the full command as the topic.
- If a difficulty level (1-8) is mentioned (e.g., "animals level 3"), include it in parameters.difficulty.
- If no difficulty is specified for 'generateContent' action, default to difficulty "1".
- For non-content actions (e.g., "start reading"), omit topic and parameters unless directly relevant to the action.
- If intent is unclear, default 'action' to 'help' and provide a general supportive message.

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
    source: "Obla"
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
    let complexityGuidance = "";
    let mappedDifficulty: "easy" | "medium" | "hard" = "easy"; // For backward compatibility

    switch(difficulty) {
      case "1":
        mappedDifficulty = "easy";
        languageLevel = "adult-level, grammatically correct sentences using *only* the most basic, high-frequency, one-syllable words for everyday concepts.";
        maxWords = 15;
        sentenceLength = "3-5 words";
        sentenceCount = 1;
        syllableCount = "only one-syllable words (allow minor exceptions like 'the', 'and')";
        complexityGuidance = "Use common, concrete nouns and verbs. Avoid abstract concepts, specialized jargon, or multi-syllabic words where simpler synonyms exist.";
        break;
      case "2":
        mappedDifficulty = "easy";
        languageLevel = "adult-level, grammatically correct sentences with very simple, high-frequency vocabulary suitable for everyday topics and situations.";
        maxWords = 20;
        sentenceLength = "5-8 words";
        sentenceCount = 2;
        syllableCount = "primarily one-syllable words with a few basic two-syllable words";
        complexityGuidance = "Focus on common, practical vocabulary. Avoid complex sentence structures or unfamiliar terms.";
        break;
      case "3":
        mappedDifficulty = "easy";
        languageLevel = "adult-level, grammatically correct sentences with simple vocabulary that is familiar in daily life.";
        maxWords = 25;
        sentenceLength = "5-10 words";
        sentenceCount = 2;
        syllableCount = "mix of one and two-syllable words, mostly common everyday terms";
        complexityGuidance = "Use clear, direct language. Introduce occasional three-syllable words if they are common and easily understood.";
        break;
      case "4":
        mappedDifficulty = "medium";
        languageLevel = "adult-level, grammatically correct sentences with basic general vocabulary.";
        maxWords = 30;
        sentenceLength = "7-12 words";
        sentenceCount = 3;
        syllableCount = "mostly two-syllable words with some one-syllable words";
        complexityGuidance = "Incorporate slightly more varied vocabulary, but keep sentence structures straightforward.";
        break;
      case "5":
        mappedDifficulty = "medium";
        languageLevel = "adult-level, grammatically correct sentences with straightforward vocabulary.";
        maxWords = 40;
        sentenceLength = "8-15 words";
        sentenceCount = 3;
        syllableCount = "balanced mix of one, two and occasional three-syllable words";
        complexityGuidance = "Introduce some descriptive language and slightly more complex ideas, maintaining clarity.";
        break;
      case "6":
        mappedDifficulty = "hard";
        languageLevel = "adult-level, grammatically correct sentences with moderately advanced vocabulary.";
        maxWords = 50;
        sentenceLength = "10-18 words";
        sentenceCount = 4;
        syllableCount = "mix of two and three-syllable words with occasional specialized terms";
        complexityGuidance = "Incorporate more nuanced vocabulary and moderately complex sentence structures suitable for general adult reading.";
        break;
      case "7":
        mappedDifficulty = "hard";
        languageLevel = "adult-level, grammatically correct sentences with advanced vocabulary.";
        maxWords = 60;
        sentenceLength = "12-22 words";
        sentenceCount = 5;
        syllableCount = "mainly three-syllable words with some complex terms and technical vocabulary";
        complexityGuidance = "Use precise and varied vocabulary. Sentence structures can be more complex but should remain clear and readable.";
        break;
      case "8":
        mappedDifficulty = "hard";
        languageLevel = "adult-level, grammatically correct sentences with sophisticated vocabulary.";
        maxWords = 70;
        sentenceLength = "15-25 words";
        sentenceCount = 6;
        syllableCount = "complex multi-syllable words with specialized terminology relevant to the topic";
        complexityGuidance = "Employ sophisticated vocabulary and complex sentence structures appropriate for expert-level content. Ensure all words and concepts are clearly explained within the context.";
        break;
      // Backward compatibility for older difficulty labels
      case "easy":
        return generateReadingContent(topic, "1");
      case "medium":
        return generateReadingContent(topic, "4");
      case "hard":
        return generateReadingContent(topic, "7");
      default: // Fallback for invalid difficulty
        return generateReadingContent(topic, "2"); // Default to level 2 for better readability
    }

    const systemPrompt = `You are creating short, ${languageLevel} about "${topic}".
    - Use ${syllableCount}.
    - Write exactly ${sentenceCount} complete, grammatically correct sentences.
    - Each sentence should be ${sentenceLength} long.
    - Keep the total content under ${maxWords} words.
    - Write in a natural, conversational style with clear narrative flow.
    - **Crucially for lower levels (1-3)**: ${complexityGuidance} Ensure the sentences are coherent and flow naturally together.
    - Avoid fragments, choppy phrases, or awkward constructions like "Eat clean, move more."
    - Return ONLY JSON: {"title": "string", "content": "string", "source": "Obla"}`;

    console.log(`Using OpenAI to generate content about "${topic}" with difficulty "${difficulty}"`);

    // Using OpenAI with max_tokens to strictly limit response size
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a cheaper model to conserve tokens
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Write an interesting, coherent, and flowing passage about ${topic} for speech practice.
        Use ${languageLevel} vocabulary and create exactly ${sentenceCount} complete, grammatically correct sentence(s) with ${syllableCount}.
        ${parseInt(difficulty) <= 3 ? 'Ensure sentences use simple, everyday language and have a natural, flowing rhythm. Avoid complex words like "mysterious" or "inventor" when simpler synonyms are available. Focus on concrete ideas.' : ''}
        IMPORTANT: Keep it engaging, informative, and under ${maxWords} words total. Ensure clear narrative flow, especially for shorter passages.` }
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
      source: content.source || "AI-Generated for Obla",
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
    "recent heartwarming animal rescue stories",
    "exciting new discoveries in space exploration",
    "simple healthy eating tips for busy people",
    "fun facts about famous landmarks around the world",
    "new developments in renewable energy solutions",
    "everyday acts of kindness making a difference",
    "popular hobbies and how to get started",
    "the latest trends in sustainable fashion",
    "easy ways to practice mindfulness and relaxation",
    "updates on community gardening projects",
    "the history of common household items",
    "innovative ways technology is helping education",
    "uplifting stories of people achieving goals",
    "exploring diverse cultures through food",
    "simple home improvement projects for beginners",
    "the science behind everyday phenomena",
    "how to train common pets like dogs or cats",
    "the benefits of spending time in nature",
    "upcoming events and festivals in your local area",
    "fascinating facts about the human body",
    "new apps making daily life easier",
    "the importance of local wildlife conservation",
    "simple exercises for staying active at home",
    "creative arts and crafts ideas for all ages",
    "remarkable stories of human endurance",
    "understanding different weather patterns",
    "the impact of music on mood and well-being",
    "simple tips for better sleep",
    "how to start composting at home",
    "celebrating cultural diversity through storytelling"
  ];

  // Select a random topic from the array
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  // Generate content on the random topic with easy difficulty
  return generateReadingContent(randomTopic, "2"); // Use difficulty 2 for better readability
}

/**
 * Generate a speech response from text using OpenAI text-to-speech with speed control
 */
export async function generateSpeechResponse(text: string, voice: string = "alloy", speed: number = 1.0): Promise<Buffer> {
  try {
    // OpenAI only accepts specific voice options: nova, shimmer, echo, onyx, fable, alloy, ash, sage, or coral
    // If voice is invalid, default to alloy
    const validVoices = ["nova", "shimmer", "echo", "onyx", "fable", "alloy", "ash", "sage", "coral"];
    const safeVoice = validVoices.includes(voice) ? voice : "alloy";

    // Clamp speed between OpenAI's limits (0.25 to 4.0)
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));

    console.log(`Generating speech with voice: ${safeVoice}, speed: ${clampedSpeed}`);

    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      voice: safeVoice,
      input: text,
      speed: clampedSpeed,
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
    2. A phonetic transcription using standard General American English IPA symbols. Provide a single phonetic transcription for the entire phrase, reflecting natural connected speech, rather than isolated words.
    3. Difficulty level (beginner/intermediate/advanced).

    Difficulty should reflect the phonetic complexity and commonality of the phrase:
    - 'beginner': Very common phrases with simple, regular sound patterns.
    - 'intermediate': Common phrases with some typical English sound variations or slightly less common vocabulary.
    - 'advanced': Less common phrases, complex sound combinations, or words with less predictable pronunciation.

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
    1. Maintain the same general meaning (if applicable for words).
    2. Use a similar level of complexity. Ensure the generated items strictly adhere to the phonetic and lexical complexity of the original item, aligning with one of the predefined difficulty levels (1-8) if the original phrase's complexity can be mapped.
    3. Are natural expressions a native speaker would use.
    4. Vary in structure to provide diverse practice (for phrases) or are distinct but related concepts (for words). Do NOT simply provide synonyms or minor grammatical variations; ensure structural diversity for phrases and distinct, related concepts for words.
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
  type: "words" | "phrases" // Default to words as per new requirements
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
    // let examplesBasedOnType; // This variable was not used, removed.

    if (type === "words") {
      itemTypeDescription = "meaningful single words";
      complexityDescription = difficultyInfo.complexity.replace('words with', 'single words with'); // Adjust for words
      lengthConstraint = `Words MUST be single standalone meaningful words (no articles, prepositions, or pronouns) with ${difficultyInfo.syllableRange}`;
      // examplesBasedOnType = difficultyInfo.examples.slice(0, 3).join(", "); // This variable was not used, removed.
    } else { // type === "phrases"
      itemTypeDescription = "natural, grammatically correct phrases";
      complexityDescription = `phrases with ${difficultyInfo.complexity.toLowerCase()}`;
      lengthConstraint = `Phrases should be ${difficultyInfo.maxSentenceLength} words or fewer`;
      // examplesBasedOnType = `Example phrases: "${difficultyInfo.examples.slice(0, 2).join('", "')}"`; // This variable was not used, removed.
    }

    // Build system prompt
    const systemPrompt = `
You are a speech rehabilitation assistant generating ${itemTypeDescription} for people with difficulty speaking to practice pronunciation.

**Task**:
Generate exactly ${numberOfItems} ${itemTypeDescription} related to the topic "${topic}" for speech practice.
${type === "words" ? `IMPORTANT:
- Each item MUST be a SINGLE WORD ONLY (no phrases or sentences)
- Focus on topic-relevant nouns, verbs, adjectives, and adverbs
- Do NOT include articles (a, an, the), prepositions (in, on, at), or pronouns (I, you, he)
- Ensure words are grammatically useful and convey clear meaning on their own, excluding purely grammatical connectors or common articles/prepositions unless specifically requested by context.
- Ensure each word is directly related to the topic "${topic}"
- Provide diverse, unique words (no repetition)
- Words should be substantive and meaningful` : ""}

**Difficulty Level**: ${difficulty}/8 (${difficultyInfo.name})

**Requirements**:
- **Complexity**: ${complexityDescription}. Each generated word/phrase must strictly conform to the phonetic and lexical complexity described for difficulty level ${difficultyInfo.name} (e.g., ${difficultyInfo.complexity}).
- **Word Types**: Use ${difficultyInfo.wordTypes} (e.g., ${difficultyInfo.examples.slice(0,3).join(', ')})
- **Length**: ${lengthConstraint}
- **Phonetic Considerations**: Include ${difficultyInfo.phonetics} where appropriate
- **Content**:
  - ${itemTypeDescription} must be meaningful, practical, and usable in everyday conversations
  - If generating phrases, ensure they are complete sentences or standalone expressions
  - Relate ${itemTypeDescription} directly to the topic "${topic}"
  - Ensure the ${numberOfItems} generated items provide a diverse range of words/phrases that collectively cover different aspects of the topic and common usage patterns within the specified difficulty. For phrases, include a mix of statements, questions, or commands if appropriate for the topic.
  - The generated words/phrases should be analogous in complexity and type to the examples provided for this difficulty level, such as: ${difficultyInfo.examples.join(', ')}.
- **Exclusions**:
  - Do NOT include numbers or numerical sequences (e.g., "5, 4, 3")
  - Do NOT include artificial hyphenated syllabic breakdowns (e.g., "cog-ni-tive"); however, naturally hyphenated compound words (e.g., "well-being") are acceptable.
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
        { role: "user", content: `Generate exactly ${numberOfItems} ${type === "words" ? "topic-specific individual" : "conversational"} ${itemTypeDescription} for the topic "${topic}" at difficulty level ${difficulty}/8. Follow all requirements and return as a JSON object with a "phrases" array.` }
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