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
    syllableRange: "1-2 syllables, common words",
    wordTypes: "basic everyday nouns, verbs, and simple adjectives",
    examples: ["cat", "run", "happy", "big", "blue"],
    complexity: "Extremely simple sentences, straightforward vocabulary, direct and clear meaning.",
    phonetics: "Simple consonant-vowel patterns (CV, CVC), basic sight words.",
    maxSentenceLength: 8,
    maxWords: 25,
    gradeLevel: 3,
    numSentences: 3
  },
  "2": {
    name: "Easy",
    syllableRange: "1-2 syllables, familiar words",
    wordTypes: "common everyday vocabulary, simple actions, basic adverbs",
    examples: ["water", "quickly", "morning", "playing", "small"],
    complexity: "Simple sentence structures, regular spelling patterns, easy to understand narratives.",
    phonetics: "Basic consonant blends (bl, st, tr), short and long vowels.",
    maxSentenceLength: 10,
    maxWords: 30,
    gradeLevel: 4,
    numSentences: 3
  },
  "3": {
    name: "Easy Medium",
    syllableRange: "1-3 syllables, growing vocabulary",
    wordTypes: "slightly expanded vocabulary, common adjectives, adverbs, and connecting words",
    examples: ["discover", "beautiful", "carefully", "explain", "friendly"],
    complexity: "Slightly more varied sentence structures, some compound sentences, clear and coherent paragraphs.",
    phonetics: "Introduction to digraphs (sh, ch, th), common vowel teams (ea, oi).",
    maxSentenceLength: 9,
    maxWords: 35,
    gradeLevel: 4,
    numSentences: 4
  },
  "4": {
    name: "Medium",
    syllableRange: "2-3 syllables, general vocabulary",
    wordTypes: "general vocabulary, common abstract nouns, varied verbs, introductory academic terms",
    examples: ["information", "problem", "solution", "consider", "develop"],
    complexity: "Standard sentence structures, some compound and basic complex sentences, developing narrative complexity.",
    phonetics: "Common diphthongs (ou, oy), common prefixes and suffixes.",
    maxSentenceLength: 9,
    maxWords: 35,
    gradeLevel: 5,
    numSentences: 4
  },
  "5": {
    name: "Medium Hard",
    syllableRange: "2-4 syllables, broader vocabulary",
    wordTypes: "broader vocabulary, some academic terms, more nuanced verbs and adjectives, thematic words",
    examples: ["environment", "analysis", "significant", "critique", "perspective"],
    complexity: "More complex sentence structures, including some complex sentences, paragraphs with multiple ideas, analytical reasoning.",
    phonetics: "Irregular vowel sounds, less common consonant blends, emphasis on word stress.",
    maxSentenceLength: 8,
    maxWords: 40,
    gradeLevel: 6,
    numSentences: 5
  },
  "6": {
    name: "Hard",
    syllableRange: "3-5 syllables, academic vocabulary",
    wordTypes: "academic and specialized vocabulary, abstract concepts, formal language",
    examples: ["hypothesis", "consequence", "implication", "demonstrate", "synthesis"],
    complexity: "Complex and compound-complex sentences, requires careful reading and inference, multi-paragraph structure.",
    phonetics: "Subtle phonetic distinctions, multiple pronunciations for some graphemes, focus on intonation.",
    maxSentenceLength: 9,
    maxWords: 45,
    gradeLevel: 6,
    numSentences: 5
  },
  "7": {
    name: "Very Hard",
    syllableRange: "4-8+ syllables, highly complex",
    wordTypes: "highly specialized, technical, academic, and abstract vocabulary, nuanced terminology",
    examples: ["epistemological", "paradigm", "ubiquitous", "recalcitrant", "dichotomy"],
    complexity: "Extremely advanced and nuanced language, often requiring specialized knowledge to comprehend fully. Intricate sentence structures, extended analytical discussions.",
    phonetics: "Complex, irregular, and subtle phonetic distinctions, emphasis on advanced prosody.",
    maxSentenceLength: 10,
    maxWords: 50,
    gradeLevel: 7,
    numSentences: 5
  },
  "8": { // New level
    name: "Expert",
    syllableRange: "4-8+ syllables, professional/academic",
    wordTypes: "professional, highly specialized, theoretical, and philosophical vocabulary",
    examples: ["conundrum", "ineluctable", "esoteric", "parsimonious", "verisimilitude"],
    complexity: "Mastery-level language, incorporating complex rhetorical devices and requiring deep analytical engagement. Sophisticated sentence structures.",
    phonetics: "Advanced phonetic awareness, understanding of etymology and linguistic history.",
    maxSentenceLength: 10,
    maxWords: 60,
    gradeLevel: 8,
    numSentences: 6
  }
};

type DifficultyLevel = keyof typeof DIFFICULTY_SCALE;

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
    const systemPrompt = `Parse the user's voice command to determine their intent.
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
  };
}

export async function generateReadingContent(topic: string, difficulty: DifficultyLevel): Promise<ReadingContent> {
  try {
    const difficultyInfo = DIFFICULTY_SCALE[difficulty];

    if (!difficultyInfo) {
      throw new Error(`Invalid difficulty level: ${difficulty}`);
    }

    // Ensure the difficulty is a string for consistency
    const difficultyString = String(difficulty);

    const systemPrompt = `You are an expert content creator for an English reading app designed to help learners improve their reading comprehension and vocabulary.
    Your task is to generate engaging, informative, and grammatically correct reading content.
    The content must be tailored to the user's selected difficulty level, ensuring appropriate vocabulary, sentence structure, and overall complexity.
    For the current difficulty level "${difficultyInfo.name}" (level ${difficultyString}), here are the detailed guidelines:
    - Max Total Words: EXACTLY ${difficultyInfo.maxWords} words. This is a STRICT MAXIMUM, no other instruction overrides this limit.
    - Target Grade Reading Level: Grade ${difficultyInfo.gradeLevel}.
    - Number of Sentences: Approximately ${difficultyInfo.numSentences} sentences.
    - Syllable Range: ${difficultyInfo.syllableRange}
    - Word Types: ${difficultyInfo.wordTypes}
    - Examples of Words: ${difficultyInfo.examples.join(", ")}
    - Overall Complexity: ${difficultyInfo.complexity}
    - Phonetic Patterns: ${difficultyInfo.phonetics}
    - Max Sentence Length: Aim for sentences with an average of ${Math.round(difficultyInfo.maxWords / difficultyInfo.numSentences)} words, generally ranging from ${difficultyInfo.maxSentenceLength - 2} to ${difficultyInfo.maxSentenceLength + 4} words to ensure natural flow. Avoid overly short or choppy sentences, ensuring the text reads very normally and coherently.

    Ensure the generated content is:
    1. Original and creative. Do not use clichés or generic phrases.
    2. Informative and educational, suitable for an English learning context.
    3. Grammatically perfect and flows naturally.
    4. Presented as a single, coherent article or story based on the topic "${topic}".

  Your response MUST be a JSON object with the following structure:
  \`\`\`json
  {
    "title": "Title of the Article",
    "content": "The main body of the reading article. Ensure it's a single string.",
    "wordCount": 0, // Calculated word count of the 'content' field
    "readingTime": 0, // Estimated reading time in seconds
    "vocabulary": [
      {
        "word": "word1",
        "definition": "definition of word1",
        "context": "sentence from content where word1 appears"
      }
    ],
    "keyPhrases": ["phrase1", "phrase2"],
    "comprehensionQuestions": [
      {
        "question": "Question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option A"
      }
    ],
    "summary": "A concise summary of the article."
  }
  \`\`\`

  - The 'content' field should be a single string, representing the full article.
  - The 'vocabulary' array should contain 5-7 key words from the article relevant to the difficulty level, each with a clear definition and a sentence from the article itself as context.
  - The 'keyPhrases' array should contain 3-5 important phrases from the article that contribute to understanding.
  - The 'comprehensionQuestions' array should contain 3-5 multiple-choice questions (4 options each) directly based on the article, with one correct answer.
  - The 'summary' should be 2-3 sentences long and accurately reflect the main points of the article.
  - Word count and reading time should be accurately estimated.

  Strictly adhere to the specified difficulty level for the content, vocabulary, and sentence structure.
  Do NOT include any introductory or concluding remarks outside the JSON. Only return the JSON object.
  `;

    console.log(`Using OpenAI to generate content about "${topic}" with difficulty "${difficulty}"`);

    // Using OpenAI with max_tokens to strictly limit response size
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a cheaper model to conserve tokens
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a new reading article about "${topic}" for a "${difficultyInfo.name}" level.` }
      ],
      temperature: 0.7,
      max_tokens: 1000, // Adjusted max_tokens to accommodate full JSON output
      response_format: { type: "json_object" } // Ensure JSON format
    });

    const responseContent = completion.choices[0].message.content;
    console.log("Raw response content:", responseContent);

    let parsedContent;
    try {
      // Parse the JSON response
      parsedContent = JSON.parse(responseContent || "{}");

      // Make sure we have all required fields, using createDefaultContent as a fallback if parse fails partially
      if (!parsedContent.title || !parsedContent.content) {
        console.warn("Parsed content missing required fields from OpenAI, attempting default structure.");
        // This fallback creates a simplified structure, not the full desired JSON.
        // It's mostly for graceful error handling if OpenAI doesn't return the full spec.
        const defaultContent = createDefaultContent(topic, responseContent || "");
        parsedContent = {
          title: defaultContent.title,
          content: defaultContent.content,
          wordCount: defaultContent.content.split(/\s+/).filter(Boolean).length,
          readingTime: defaultContent.content.split(/\s+/).filter(Boolean).length * 3,
          vocabulary: [],
          keyPhrases: [],
          comprehensionQuestions: [],
          summary: "Summary unavailable."
        };
      }
    } catch (err) {
      console.error("Error processing API response JSON:", err);
      // Create a default content as fallback for complete parsing failure
      const defaultContent = createDefaultContent(topic, responseContent || "Content unavailable");
      parsedContent = {
        title: defaultContent.title,
        content: defaultContent.content,
        wordCount: defaultContent.content.split(/\s+/).filter(Boolean).length,
        readingTime: defaultContent.content.split(/\s+/).filter(Boolean).length * 3,
        vocabulary: [],
        keyPhrases: [],
        comprehensionQuestions: [],
        summary: "Summary unavailable."
      };
    }

    // Calculate word count
    const calculatedWordCount = parsedContent.content.split(/\s+/).filter(Boolean).length;

    // Create the object first to avoid type compatibility issues
    const readingContent: ReadingContent = {
      id: Date.now(),
      title: parsedContent.title,
      source: "ai-generated",
      content: parsedContent.content,
      wordCount: calculatedWordCount,
      readingTime: calculatedWordCount * 3,
      difficulty: difficultyString, // Ensure it's a string
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
  return generateReadingContent(randomTopic, "2"); // Use difficulty "2" (string) for better readability and type consistency
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
 * Generate AI feedback based on pronunciation assessment data
 */
export async function generatePronunciationFeedback(activities: any[]): Promise<{
  suggestions: string[];
  practicePrompt?: {
    question: string;
    problemSound: string;
  };
}> {
  if (!activities || activities.length === 0) {
    return { 
      suggestions: ["Keep practicing regularly to improve your pronunciation skills!"],
      practicePrompt: {
        question: "Would you like to try words from a new topic to keep challenging yourself?",
        problemSound: "new_topic"
      }
    };
  }

  try {
    // Calculate average score to determine feedback strategy
    const totalScore = activities.reduce((sum, activity) => sum + (activity.score || 0), 0);
    const averageScore = totalScore / activities.length;
    
    // Get list of 50+ random topics for high performers
    const randomTopics = [
      "Animals and Nature", "Food and Cooking", "Travel and Adventure", "Technology and Innovation",
      "Sports and Fitness", "Arts and Culture", "Science and Discovery", "Health and Wellness",
      "Family and Relationships", "Education and Learning", "Business and Work", "Entertainment and Media",
      "Weather and Seasons", "Transportation", "Shopping and Commerce", "Music and Dance",
      "Books and Literature", "Movies and Theater", "Photography", "Gardening and Plants",
      "Fashion and Style", "Architecture and Design", "History and Heritage", "Geography and Places",
      "Space and Astronomy", "Ocean and Marine Life", "Mountains and Hiking", "Cities and Urban Life",
      "Rural and Country Life", "Festivals and Celebrations", "Hobbies and Crafts", "Games and Puzzles",
      "Tools and Equipment", "Vehicles and Machinery", "Colors and Shapes", "Numbers and Mathematics",
      "Time and Schedules", "Money and Finance", "Communication and Language", "Emotions and Feelings",
      "Dreams and Goals", "Challenges and Solutions", "Success and Achievement", "Friendship and Community",
      "Volunteering and Helping", "Environment and Conservation", "Innovation and Creativity", "Peace and Harmony",
      "Adventure and Exploration", "Comfort and Home", "Celebration and Joy", "Wisdom and Knowledge"
    ];

    // Prepare activity data for AI analysis
    const analysisData = activities.map(activity => ({
      type: activity.activityType,
      item: activity.itemPracticed,
      scores: {
        overall: activity.score,
        accuracy: activity.accuracy,
        fluency: activity.fluency,
        completeness: activity.completeness
      },
      difficulty: activity.difficulty,
      metadata: activity.metadata,
      date: activity.createdAt
    }));

    // Enhanced prompt that ensures feedback for all performance levels
    const prompt = `You are a supportive speech coach analyzing pronunciation practice data. Review the practice activities and ALWAYS provide encouraging, actionable feedback regardless of performance level.

Practice Data (Average Score: ${averageScore}%):
${JSON.stringify(analysisData, null, 2)}

IMPORTANT: You MUST always provide feedback that encourages continued practice. Follow these guidelines based on performance:

For High Performers (80%+ average):
- Celebrate their success and suggest increasing difficulty or trying new challenges
- Always include a practicePrompt suggesting they try a new topic area
- Encourage them to maintain momentum with variety

For Medium Performers (50-79% average):
- Identify specific areas for improvement
- Provide targeted practice suggestions
- Include practicePrompt focusing on problem areas if detected

For Lower Performers (<50% average):
- Focus on encouragement and foundational skills
- Suggest slower, more careful practice
- Include practicePrompt for basic sound practice

Provide your analysis as a JSON response with this exact structure:
{
  "suggestions": [
    "2-3 specific, encouraging bullet points based on their performance level"
  ],
  "practicePrompt": {
    "question": "Personalized question based on their performance - ALWAYS include this",
    "problemSound": "specific sound/topic recommendation"
  }
}

For high performers, randomly select from these topics for variety: ${randomTopics.slice(0, 20).join(', ')}, and many others.

Guidelines:
- ALWAYS provide a practicePrompt - never leave it empty
- Be encouraging regardless of performance level
- For 90%+ scores, suggest difficulty increase AND new topics
- Keep language simple and supportive
- Focus on continued engagement and growth`;

    const response = await openai.chat.completions.create({
      model: ADVANCED_MODEL, // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a supportive speech coach helping users improve their pronunciation. You MUST always provide encouraging feedback and practice suggestions. Respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Enhanced fallback logic - ensure we ALWAYS have a practice prompt
    let practicePrompt = result.practicePrompt;
    
    if (!practicePrompt || !practicePrompt.question) {
      const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
      
      if (averageScore >= 90) {
        practicePrompt = {
          question: `Excellent work! You're scoring ${Math.round(averageScore)}% - would you like to increase the difficulty level or try words from "${randomTopic}"?`,
          problemSound: "difficulty_increase"
        };
      } else if (averageScore >= 70) {
        practicePrompt = {
          question: `Great progress! Would you like to try some challenging words from "${randomTopic}" to keep improving?`,
          problemSound: "new_topic"
        };
      } else {
        practicePrompt = {
          question: "Would you like to practice some words with the 'r' sound to help improve your pronunciation?",
          problemSound: "r"
        };
      }
    }
    
    // Validate and sanitize the response
    return {
      suggestions: Array.isArray(result.suggestions) && result.suggestions.length > 0
        ? result.suggestions.slice(0, 3) 
        : [
            `Great job completing your practice session with ${Math.round(averageScore)}% average!`,
            "Consistent practice is the key to continued improvement",
            "Keep challenging yourself with new words and topics"
          ],
      practicePrompt
    };

  } catch (error) {
    console.error("Error generating pronunciation feedback:", error);
    
    // Robust fallback that always provides actionable feedback
    const randomTopics = ["Animals", "Food", "Travel", "Sports", "Music", "Nature"];
    const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
    
    return {
      suggestions: [
        "Great job staying consistent with your practice!",
        "Every practice session helps improve your speaking confidence",
        "Try focusing on clear pronunciation of each syllable"
      ],
      practicePrompt: {
        question: `Would you like to practice some words about "${randomTopic}" to keep challenging yourself?`,
        problemSound: "new_topic"
      }
    };
  }
}

/**
 * Generate proper syllabication for a word using OpenAI
 */
export async function generateSyllabication(word: string): Promise<string> {
  try {
    const prompt = `Provide the correct syllabication for the word "${word}" using hyphens to separate syllables.

Examples:
- "elephant" → "el-e-phant"
- "computer" → "com-pu-ter"
- "create" → "cre-ate"
- "beautiful" → "beau-ti-ful"
- "friend" → "friend"

Return only the syllabicated word in lowercase, nothing else.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a linguistic expert. Provide accurate syllabication for English words using hyphens."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 50
    });

    const result = response.choices[0].message.content?.trim().toLowerCase();
    
    if (result && result.length > 0) {
      return result;
    } else {
      throw new Error("Empty response from OpenAI");
    }
  } catch (error) {
    console.error(`Error generating syllabication for "${word}":`, error);
    // Fallback to basic syllabication
    return createBasicSyllabication(word);
  }
}

/**
 * Create basic syllabication for a word using simple rules
 */
function createBasicSyllabication(word: string): string {
  if (!word || word.length <= 3) {
    return word; // Short words typically don't need syllable breaks
  }

  const vowels = 'aeiouy';
  const consonants = 'bcdfghjklmnpqrstvwxz';
  word = word.toLowerCase();

  let syllables: string[] = [];
  let currentSyllable = '';

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const nextChar = word[i + 1];

    currentSyllable += char;

    // Check if we should break after this character
    let shouldBreak = false;

    if (i < word.length - 1) {
      if (vowels.includes(char) && consonants.includes(nextChar)) {
        // Vowel followed by consonant - potential break point
        if (i + 2 < word.length && vowels.includes(word[i + 2])) {
          // V-C-V pattern - break after the consonant
          currentSyllable += nextChar;
          i++; // Skip the consonant we just added
          shouldBreak = true;
        }
      } else if (consonants.includes(char) && vowels.includes(nextChar)) {
        // Consonant followed by vowel - break before the vowel
        shouldBreak = true;
      }
    }

    if (shouldBreak || i === word.length - 1) {
      syllables.push(currentSyllable);
      currentSyllable = '';
    }
  }

  // If we still have content in currentSyllable, add it
  if (currentSyllable) {
    syllables.push(currentSyllable);
  }

  // Clean up single character syllables and merge if needed
  const cleanedSyllables = syllables.filter(s => s.length > 0);

  return cleanedSyllables.join('-');
}

/**
 * Generate words containing a specific sound or letter for targeted practice
 */
export async function generateWordsWithSound(
  targetSound: string,
  difficulty: DifficultyLevel = "4",
  count: number = 8
): Promise<any[]> {
  try {
    const difficultyInfo = DIFFICULTY_SCALE[difficulty];
    const prompt = `Generate exactly ${count} English words that physically contain the letter "${targetSound}" in their spelling.

CRITICAL REQUIREMENTS:
- EVERY word must contain the letter "${targetSound}" somewhere in its spelling
- For example, if targetSound is "s": words like "sun", "house", "music", "sister", "practice"
- For example, if targetSound is "r": words like "red", "car", "friend", "surprise", "brother"
- Words should be at ${difficultyInfo.name} difficulty level (${difficultyInfo.syllableRange})
- Provide syllabication using hyphens (e.g., "sis-ter")
- VERIFY each word contains "${targetSound}" before including it

Respond with valid JSON in this exact format:
{
  "words": [
    {"text": "word1", "syllabication": "syl-la-bles"},
    {"text": "word2", "syllabication": "syl-la-bles"}
  ]
}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a speech therapy assistant. Generate ONLY words that contain the specified letter. Double-check each word contains the target letter before including it.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.words || !Array.isArray(result.words)) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Verify words actually contain the target sound
    const verifiedWords = result.words.filter((word: any) => {
      const text = (word.text || "").toLowerCase();
      const target = targetSound.toLowerCase();
      return text.includes(target);
    });

    console.log(`Generated ${verifiedWords.length} verified words containing "${targetSound}":`, verifiedWords);

    // If we don't have enough verified words, add fallback words
    if (verifiedWords.length < count) {
      const fallbackWords = getFallbackWordsWithSound(targetSound, count - verifiedWords.length);
      return [...verifiedWords, ...fallbackWords].slice(0, count);
    }

    return verifiedWords.slice(0, count).map((word: any) => ({
      text: word.text || "",
      syllabication: word.syllabication || word.text || ""
    }));

  } catch (error) {
    console.error("Error generating words with sound:", error);
    return getFallbackWordsWithSound(targetSound, count);
  }
}

function getFallbackWordsWithSound(targetSound: string, count: number): any[] {
  const soundMaps: { [key: string]: any[] } = {
    's': [
      { text: "sun", syllabication: "sun" },
      { text: "house", syllabication: "house" },
      { text: "music", syllabication: "mu-sic" },
      { text: "sister", syllabication: "sis-ter" },
      { text: "simple", syllabication: "sim-ple" },
      { text: "smile", syllabication: "smile" },
      { text: "person", syllabication: "per-son" },
      { text: "noise", syllabication: "noise" }
    ],
    'r': [
      { text: "red", syllabication: "red" },
      { text: "car", syllabication: "car" },
      { text: "friend", syllabication: "friend" },
      { text: "brother", syllabication: "broth-er" },
      { text: "surprise", syllabication: "sur-prise" },
      { text: "street", syllabication: "street" },
      { text: "bright", syllabication: "bright" },
      { text: "party", syllabication: "par-ty" }
    ],
    'th': [
      { text: "think", syllabication: "think" },
      { text: "mother", syllabication: "moth-er" },
      { text: "bath", syllabication: "bath" },
      { text: "weather", syllabication: "weath-er" },
      { text: "three", syllabication: "three" },
      { text: "birthday", syllabication: "birth-day" },
      { text: "nothing", syllabication: "noth-ing" },
      { text: "healthy", syllabication: "health-y" }
    ]
  };

  const defaultWords = [
    { text: "practice", syllabication: "prac-tice" },
    { text: "exercise", syllabication: "ex-er-cise" },
    { text: "learning", syllabication: "learn-ing" },
    { text: "speaking", syllabication: "speak-ing" }
  ];

  const availableWords = soundMaps[targetSound.toLowerCase()] || 
    defaultWords.filter(word => word.text.toLowerCase().includes(targetSound.toLowerCase()));
  
  return availableWords.slice(0, count);
}

export async function generateTopicPhrases(
  topic: string,
  difficulty: DifficultyLevel = "4", // Use DifficultyLevel type
  type: "words" | "phrases" // Default to words as per new requirements
): Promise<string[]> {
  try {
    console.log(`Generating ${type} related to topic: "${topic}" with difficulty level: ${difficulty}`);

    // Validate difficulty level
    if (!DIFFICULTY_SCALE[difficulty]) { // Directly use difficulty
      console.warn(`Invalid difficulty level ${difficulty}, defaulting to level 4`);
      difficulty = "4";
    }

    const difficultyInfo = DIFFICULTY_SCALE[difficulty]; // Directly use difficulty
    const numberOfItems = 8; // Always generate 8 items

    let itemTypeDescription;
    let complexityDescription;
    let lengthConstraint;
    // let examplesBasedOnType; // This variable was not used, removed.

    if (type === "words") {
      itemTypeDescription = "meaningful single words";
      complexityDescription = difficultyInfo.complexity.replace('sentences,', 'single words,'); // Adjust for words
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
- Words should be substantive and meaningful
- For each word, also provide its syllabication (syllables separated by hyphens)` : ""}

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
  - Do NOT include artificial hyphenated syllabic breakdowns in the main text; however, naturally hyphenated compound words (e.g., "well-being") are acceptable.
  - Avoid overly technical or academic terms unless essential to the topic and difficulty
  - Do NOT include incomplete sentences, fragments, lists, bullet points, or markdown formatting
- **Output Format**:
${type === "words" ?
  `  - Return a JSON object with a "words" array containing objects with "text" and "syllabication" properties
  - Example: {"words": [{"text": "elephant", "syllabication": "el-e-phant"}, {"text": "computer", "syllabication": "com-pu-ter"}]}` :
  `  - Return a JSON object with a single key "phrases" containing an array of ${numberOfItems} strings
  - Example: {"phrases": ["item 1", "item 2", ..., "item ${numberOfItems}"]}`}

**Examples for Topic "Commonly Used Phrases"**:
- Difficulty 1: ["Hi, how are you?", "Good morning!", "Thank you very much."]
**Examples for Topic "Common English Words"**:
- Difficulty 1: [{"text": "cat", "syllabication": "cat"}, {"text": "dog", "syllabication": "dog"}, {"text": "house", "syllabication": "house"}]
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

    // Handle different response formats for words vs phrases
    let validItems: any[] = [];
    if (type === "words") {
      // For words, expect a "words" array with objects containing "text" and "syllabication"
      if (parsed.words && Array.isArray(parsed.words)) {
        validItems = parsed.words
          .filter((item: any) => {
            if (!item || typeof item !== 'object') return false;
            if (!item.text || typeof item.text !== 'string' || !item.text.trim()) return false;
            if (!item.syllabication || typeof item.syllabication !== 'string') return false;

            // Ensure it's a single word
            if (item.text.split(/\s+/).length > 1) return false;
            // Exclude numbers and invalid patterns
            if (/^\d+(,\s*\d+)*$/.test(item.text)) return false;
            return true;
          })
          .slice(0, numberOfItems);
      }

      // If we don't have valid words, fall back to phrases format and create syllabication
      if (validItems.length === 0 && parsed.phrases && Array.isArray(parsed.phrases)) {
        validItems = parsed.phrases
          .filter((text: any) => {
            if (typeof text !== 'string' || !text.trim()) return false;
            if (text.split(/\s+/).length > 1) return false; // Single words only
            if (/^\d+(,\s*\d+)*$/.test(text)) return false;
            return true;
          })
          .map((text: any) => ({
            text: text.trim(),
            syllabication: createBasicSyllabication(text.trim())
          }))
          .slice(0, numberOfItems);
      }
    } else {
      // For phrases, expect the old format
      if (!parsed.phrases || !Array.isArray(parsed.phrases)) {
        console.warn("OpenAI response did not contain a valid 'phrases' array:", parsed);
        parsed.phrases = [];
      }

      // Filter and validate phrases
      validItems = parsed.phrases
        .filter((item: any) => {
          // Ensure item is a string and non-empty
          if (typeof item !== 'string' || !item.trim()) return false;
          // Exclude numbers and hyphenated terms (unless they are valid compound words)
          if (/^\d+(,\s*\d+)*$/.test(item)) return false; // e.g., "5, 4, 3"
          // Adjust hyphenation check for words vs. phrases if needed. For now, keep it general.
          if (item.includes('-') && !item.match(/^[a-zA-Z]+(-[a-zA-Z]+)*$/)) return false; // e.g., "cog-ni-tive", allow "well-being"

          const wordCount = item.split(/\s+/).length;
          // For phrases, allow up to max sentence length + 20%
          if (wordCount > difficultyInfo.maxSentenceLength * 1.2) return false;
          return true;
        })
        .slice(0, numberOfItems);
    }

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