import { Router } from 'express';
import memoize from 'memoizee';
import { generateReadingContent, generateTopicPhrases, generateSampleContent, generateWordsWithSound, generateWordPhrases, generateWordPairs } from '../openai';
import { protect } from '../supabaseAuth';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';
import { storage } from '../storage';
import { SOURCE_TYPE } from '../constants/activityTypes';

const router = Router();

// Memoize OpenAI content generation calls
const memoizedGenerateReadingContent = memoize(generateReadingContent, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour
const memoizedGenerateTopicPhrases = memoize(generateTopicPhrases, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour
const memoizedGenerateSampleContent = memoize(generateSampleContent, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour
const memoizedGenerateWordsWithSound = memoize(generateWordsWithSound, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour

// Save reading content for user
router.post('/readings/save', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const { title, content, difficulty, source, sourceId } = req.body;

  if (!title || !content) {
    return error(res, 'Title and content are required', 400);
  }

  const savedReading = await storage.createUserSavedPhrase({
    userId,
    phrase: content, // Store content as phrase
    difficulty: difficulty || 'intermediate',
    source: SOURCE_TYPE.READER_CONTENT // This will distinguish it from regular phrases
  });

  return success(res, savedReading, 201);
}));

// Endpoint to get user saved readings
router.get('/user/saved-readings', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;

  const allSavedPhrases = await storage.getUserSavedPhrases(userId);
  const readings = allSavedPhrases.filter(phrase => phrase.source === SOURCE_TYPE.READER_CONTENT);

  return success(res, readings);
}));

// Content generation endpoints
router.post('/generate', catchAsync(async (req, res) => {
  const { topic, difficulty } = req.body;
  
  if (!topic) {
    return error(res, 'Topic is required', 400);
  }

  const content = await memoizedGenerateReadingContent(topic, difficulty || 'easy');
  return success(res, content);
}));

// Sample content endpoint for initial page load
router.get('/sample', catchAsync(async (req, res) => {
  const content = await memoizedGenerateSampleContent();
  return success(res, content);
}));

// Legacy content generation endpoint (keep for backward compatibility)
router.post('/generate-legacy', catchAsync(async (req, res) => {
  const { topic, difficulty } = req.body;
  
  if (!topic) {
    return error(res, 'Topic is required', 400);
  }

  const content = await memoizedGenerateReadingContent(topic, difficulty || 'easy');
  return success(res, content);
}));

// Topic phrases/words generation endpoint (no auth required for content generation)
router.post('/generate-topic-phrases', catchAsync(async (req, res) => {
  const { topic, difficulty, type, count } = req.body;
  
  if (!topic) {
    return error(res, 'Topic is required', 400);
  }

  console.log(`Generating ${count || 8} ${type || 'phrases'} for topic: "${topic}" with difficulty: ${difficulty || 'easy'}`);

  const phrases = await generateTopicPhrases(
    topic, 
    difficulty || '4', 
    type || 'phrases',
    count || 8  // Allow custom count, default to 8
  );
  
  console.log(`Generated ${phrases.length} items:`, phrases);
  return success(res, { phrases });
}));

// Generate contextual phrases for a specific word in assignments
router.post('/generate-word-phrases', catchAsync(async (req, res) => {
  const { word, soundPattern, count = 3 } = req.body;
  
  if (!word) {
    return error(res, 'Word is required', 400);
  }

  console.log(`Generating ${count} contextual phrases for word: "${word}" with sound pattern: ${soundPattern}`);

  try {
    const phrases = await generateWordPhrases(word, soundPattern, count);
    console.log(`Generated ${phrases.length} contextual phrases:`, phrases);
    return success(res, { phrases });
  } catch (err) {
    console.error('Error generating word phrases:', err);
    return error(res, 'Failed to generate phrases', 500);
  }
}));

router.post('/generate-suggested-words', catchAsync(async (req, res) => {
  const { title, targetSound } = req.body;

  if (!title) {
    return error(res, 'Title is required', 400);
  }

  const words = await memoizedGenerateWordsWithSound(targetSound || title);
  const formattedWords = words.phrases.map((word: any) => (typeof word === 'string' ? { text: word } : word));
  return success(res, { phrases: formattedWords });
}));

// Generate words with specific sound - endpoint for Words.tsx
router.post('/generate-words-with-sound', catchAsync(async (req, res) => {
  const { targetSound, difficulty, count } = req.body;

  if (!targetSound) {
    return error(res, 'targetSound is required', 400);
  }

  console.log(`Generating words with sound: "${targetSound}", difficulty: ${difficulty || '4'}, count: ${count || 8}`);

  const words = await memoizedGenerateWordsWithSound(targetSound, count || 8, difficulty || '4');
  return success(res, { phrases: words.phrases || words });
}));

// Generate word pairs for Word Pairs assignment type
router.post('/generate-word-pairs', catchAsync(async (req, res) => {
  const { soundPattern, position } = req.body;

  if (!soundPattern || !position) {
    return error(res, 'soundPattern and position are required', 400);
  }

  if (!['starts-with', 'contains', 'ends-with'].includes(position)) {
    return error(res, 'position must be one of: starts-with, contains, ends-with', 400);
  }

  console.log(`Generating word pairs for sound: "${soundPattern}", position: ${position}`);

  try {
    const pairs = await generateWordPairs(soundPattern, position);
    console.log(`Generated ${pairs.length} word pairs:`, pairs);
    return success(res, { pairs });
  } catch (err) {
    console.error('Error generating word pairs:', err);
    return error(res, 'Failed to generate word pairs', 500);
  }
}));

export default router;
