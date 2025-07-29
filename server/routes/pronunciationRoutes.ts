import { Router } from 'express';
import multer from 'multer';
import memoize from 'memoizee';
import { assessPronunciation, getWordPronunciation, synthesizeSpeech, synthesizeSpeechFromSSML } from '../azure';
import { generateSyllabication, generatePhoneticBreakdown } from '../openai';
import { protect } from '../supabaseAuth';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';
import { storage } from '../storage';
import { ACTIVITY_TYPE, SOURCE_TYPE } from '../constants/activityTypes';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Memoize OpenAI calls for syllabication and phonetic breakdown
const memoizedGenerateSyllabication = memoize(generateSyllabication, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour
const memoizedGeneratePhoneticBreakdown = memoize(generatePhoneticBreakdown, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour

// Unified pronunciation assessment endpoint
router.post('/assess', upload.single('audio'), catchAsync(async (req: any, res) => {
  if (!req.file) {
    return error(res, 'No audio file provided', 400);
  }

  // Support both 'text' and 'referenceText' parameter names for backward compatibility
  const referenceText = req.body.text || req.body.referenceText;
  const { contentId, difficulty, source, itemType } = req.body;

  if (!referenceText) {
    return error(res, 'Reference text is required', 400);
  }

  console.log(`🎯 Starting unified pronunciation assessment for text: "${referenceText}"`);
  console.log(`📊 Request details - contentId: ${contentId}, difficulty: ${difficulty}, source: ${source}, itemType: ${itemType}`);

  const audioBuffer = req.file.buffer;
  const assessment = await assessPronunciation(audioBuffer, referenceText);

  // If user is authenticated, record the activity
  if (req.user && (req.user as any).claims?.sub) {
    const userId = (req.user as any).claims.sub;
    
    // Determine activity type based on context
    let activityType = ACTIVITY_TYPE.READING_SESSION; // default for reading
    if (itemType === 'word') {
      activityType = ACTIVITY_TYPE.WORD_PRACTICE;
    } else if (itemType === 'phrase') {
      activityType = ACTIVITY_TYPE.PHRASE_PRACTICE;
    } else if (contentId || source === 'reader') {
      activityType = ACTIVITY_TYPE.READING_SESSION;
    }

    const activityData = {
      userId,
      activityType,
      itemPracticed: referenceText,
      score: assessment.pronunciationScore,
      accuracy: assessment.accuracyScore,
      fluency: assessment.fluencyScore,
      completeness: assessment.completenessScore,
      difficulty: difficulty || 'medium',
      source: source || (contentId ? SOURCE_TYPE.READING : SOURCE_TYPE.PRACTICE),
      metadata: { 
        ...(contentId && { contentId }),
        wordLevelResults: assessment.wordLevelResults,
        sdkVersion: assessment.sdkVersion 
      }
    };

    console.log(`📝 Recording activity for user ${userId}: ${activityType}`);
    await storage.recordActivity(activityData);
  } else {
    console.log(`👤 Anonymous user - assessment completed without recording activity`);
  }

  console.log(`✅ Assessment completed successfully - Score: ${assessment.pronunciationScore}%`);
  return success(res, assessment);
}));

// Legacy endpoint for backward compatibility (Words/Phrases pages)
router.post('/assess-legacy', upload.single('audio'), catchAsync(async (req: any, res) => {
  console.log('⚠️ Using legacy /api/assess-legacy endpoint - redirecting to unified assessment');
  
  // Forward to the unified endpoint with proper parameter mapping
  req.body.text = req.body.referenceText; // Ensure 'text' is set for the unified endpoint
  
  // Call the unified handler logic directly
  if (!req.file) {
    return error(res, 'No audio file provided', 400);
  }

  const referenceText = req.body.referenceText;
  const { difficulty, source, itemType } = req.body;
  const userId = req.user.claims.sub;

  if (!referenceText) {
    return error(res, 'Reference text is required', 400);
  }

  console.log(`🎯 Legacy assessment for text: "${referenceText}"`);

  const audioBuffer = req.file.buffer;
  const assessment = await assessPronunciation(audioBuffer, referenceText);

  // Record the activity
  await storage.recordActivity({
    userId,
    activityType: itemType === 'word' ? ACTIVITY_TYPE.WORD_PRACTICE : ACTIVITY_TYPE.PHRASE_PRACTICE,
    itemPracticed: referenceText,
    score: assessment.pronunciationScore,
    accuracy: assessment.accuracyScore,
    fluency: assessment.fluencyScore,
    completeness: assessment.completenessScore,
    difficulty: difficulty || 'medium',
    source: source || SOURCE_TYPE.PRACTICE,
    metadata: { 
      wordLevelResults: assessment.wordLevelResults,
      sdkVersion: assessment.sdkVersion 
    }
  });

  return success(res, assessment);
}));

// Speech synthesis endpoints
router.post('/synthesize', catchAsync(async (req, res) => {
  const { ssml, text, voice = "default", speed = 1.0 } = req.body;
  
  if (!ssml && !text) {
    return error(res, 'SSML or text is required', 400);
  }

  let audioBuffer: Buffer;
  
  if (ssml) {
    audioBuffer = await synthesizeSpeechFromSSML(ssml);
  } else {
    audioBuffer = await synthesizeSpeech(text, voice, speed);
  }
  
  res.set({
    'Content-Type': 'audio/mpeg',
    'Content-Length': audioBuffer.length.toString(),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  res.send(audioBuffer);
}));

// Word pronunciation endpoint
router.get('/word', catchAsync(async (req, res) => {
  const { word } = req.query;
  
  if (!word || typeof word !== 'string') {
    return error(res, 'Word parameter is required', 400);
  }

  const phonetic = await getWordPronunciation(word);
  
  return success(res, { phonetic });
}));

// Word syllabication endpoint - generates proper syllabication using OpenAI
router.post('/syllabication', catchAsync(async (req, res) => {
  const { words } = req.body;
  
  if (!words || !Array.isArray(words)) {
    return error(res, 'Words array is required', 400);
  }

  const results = await Promise.all(
    words.map(async (word: string) => {
      try {
        const syllabication = await memoizedGenerateSyllabication(word);
        return {
          word: word,
          syllabication: syllabication
        };
      } catch (err) {
        console.error(`Error generating syllabication for "${word}":`, err);
        const basicSyllabication = word.toLowerCase();
        return {
          word: word,
          syllabication: basicSyllabication
        };
      }
    })
  );
  
  return success(res, { results });
}));

// Word phonetic breakdown endpoint - generates intuitive phonetic syllables using OpenAI
router.post('/phonetic-breakdown', catchAsync(async (req, res) => {
  const { words } = req.body;
  
  if (!words || !Array.isArray(words)) {
    return error(res, 'Words array is required', 400);
  }

  const results = await Promise.all(
    words.map(async (word: string) => {
      try {
        const phoneticBreakdown = await memoizedGeneratePhoneticBreakdown(word);
        return {
          word: word,
          phoneticBreakdown: phoneticBreakdown
        };
      } catch (err) {
        console.error(`Error generating phonetic breakdown for "${word}":`, err);
        const fallbackBreakdown = word.toLowerCase();
        return {
          word: word,
          phoneticBreakdown: fallbackBreakdown
        };
      }
    })
  );
  
  return success(res, { results });
}));

// Word pairs assessment endpoint - checks if both words are present in the sentence
router.post('/assess-word-pairs', upload.single('audio'), catchAsync(async (req: any, res) => {
  if (!req.file) {
    return error(res, 'No audio file provided', 400);
  }

  const { targetWords } = req.body;
  
  if (!targetWords) {
    return error(res, 'Target words are required', 400);
  }

  let parsedTargetWords;
  try {
    parsedTargetWords = JSON.parse(targetWords);
  } catch (e) {
    return error(res, 'Target words must be a valid JSON array', 400);
  }

  if (!Array.isArray(parsedTargetWords) || parsedTargetWords.length !== 2) {
    return error(res, 'Exactly two target words are required', 400);
  }

  const [word1, word2] = parsedTargetWords;
  console.log(`🎯 Starting word pairs assessment for: "${word1}" and "${word2}"`);

  const audioBuffer = req.file.buffer;
  
  try {
    // First, do a general assessment to get the transcription
    const generalAssessment = await assessPronunciation(audioBuffer, `${word1} ${word2}`);
    const transcription = generalAssessment.recognitionResult?.DisplayText || '';
    
    console.log(`📝 Transcription: "${transcription}"`);
    
    // Check if both words are present in the transcription (case-insensitive)
    const transcriptionLower = transcription.toLowerCase();
    const word1Lower = word1.toLowerCase();
    const word2Lower = word2.toLowerCase();
    
    const word1Detected = transcriptionLower.includes(word1Lower);
    const word2Detected = transcriptionLower.includes(word2Lower);
    
    console.log(`🔍 Word detection - ${word1}: ${word1Detected}, ${word2}: ${word2Detected}`);
    
    // Assess each word individually for scoring
    let word1Score = 0;
    let word2Score = 0;
    
    if (word1Detected) {
      try {
        const word1Assessment = await assessPronunciation(audioBuffer, word1);
        word1Score = Math.round(word1Assessment.pronunciationAssessment?.PronunciationScore || 0);
      } catch (error) {
        console.warn(`Failed to assess word1 "${word1}":`, error);
      }
    }
    
    if (word2Detected) {
      try {
        const word2Assessment = await assessPronunciation(audioBuffer, word2);
        word2Score = Math.round(word2Assessment.pronunciationAssessment?.PronunciationScore || 0);
      } catch (error) {
        console.warn(`Failed to assess word2 "${word2}":`, error);
      }
    }
    
    const result = {
      transcription,
      word1Detected,
      word2Detected,
      word1Score,
      word2Score,
      bothWordsDetected: word1Detected && word2Detected
    };
    
    console.log(`✅ Word pairs assessment complete:`, result);
    
    return success(res, result);
    
  } catch (assessmentError) {
    console.error('❌ Error in word pairs assessment:', assessmentError);
    return error(res, 'Failed to assess word pairs', 500);
  }
}));

export default router;
