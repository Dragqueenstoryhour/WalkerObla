import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { assessPronunciation, synthesizeSpeech, synthesizeSpeechFromSSML, getWordPronunciation } from "./azure";
import { generateSpeechWithVisemes } from "./azureViseme";
import { transcribeAudio, generateReadingContent, processVoiceCommand, generateTopicPhrases, generateSampleContent, generateSpeechResponse, generatePronunciationFeedback, generateWordsWithSound, generateSyllabication, generatePhoneticBreakdown } from "./openai";
import { sendContactForm } from "./email";
import multer from "multer";
import { z } from "zod";
import { insertUserSavedPhraseSchema, insertPracticeGroupSchema, insertUserActivitySchema, insertAssignmentSchema, insertAssignmentItemSchema, insertAssignmentResultSchema } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Readiness check endpoint for deployment
  app.get('/ready', async (req, res) => {
    try {
      // Quick health check without expensive operations
      res.status(200).json({ 
        status: 'ready',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      console.error('Readiness check failed:', error);
      res.status(503).json({ 
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User stats endpoint
  app.get('/api/user/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      const activities = await storage.getUserActivities(userId, 10);
      
      res.json({
        stats: stats || {
          totalWordsPracticed: 0,
          totalPhrasesPracticed: 0,
          totalReadingSessions: 0,
          totalPracticeTime: 0,
          averagePronunciationScore: null,
          averageAccuracyScore: null,
          averageFluencyScore: null,
          currentStreak: 0,
          longestStreak: 0,
          lastPracticeDate: null,
        },
        recentActivities: activities
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // User activity stats endpoint
  app.get('/api/user/activity-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activityStats = await storage.getUserActivityStats(userId);
      res.json(activityStats);
    } catch (error) {
      console.error("Error fetching activity stats:", error);
      res.status(500).json({ message: "Failed to fetch activity stats" });
    }
  });

  // Get paginated recent activities for Most Recent Activities table
  app.get('/api/user/recent-activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      const recentActivities = await storage.getRecentActivities(userId, limit, offset);
      const totalCount = await storage.getTotalActivitiesCount(userId);
      
      res.json({
        activities: recentActivities,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      });
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // Get AI-powered pronunciation feedback based on recent activities
  app.get('/api/user/pronunciation-feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get last 20 activities for AI analysis
      const recentActivities = await storage.getRecentActivities(userId, 20, 0);
      
      // Generate feedback using OpenAI
      const feedback = await generatePronunciationFeedback(recentActivities);
      
      res.json(feedback);
    } catch (error) {
      console.error("Error generating pronunciation feedback:", error);
      res.status(500).json({ message: "Failed to generate pronunciation feedback" });
    }
  });

  // Generate AI-powered feedback based on session activities
  app.post('/api/user/pronunciation-feedback', isAuthenticated, async (req: any, res) => {
    try {
      const { sessionActivities } = req.body;
      
      if (!sessionActivities || !Array.isArray(sessionActivities)) {
        return res.status(400).json({ error: 'sessionActivities array is required' });
      }
      
      // Generate feedback using OpenAI based on session data
      const feedback = await generatePronunciationFeedback(sessionActivities);
      
      res.json(feedback);
    } catch (error) {
      console.error("Error generating session pronunciation feedback:", error);
      res.status(500).json({ message: "Failed to generate session pronunciation feedback" });
    }
  });

  // Activities endpoints for My Journey tab
  app.get('/api/activities/words', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const words = await storage.getSavedWords(userId);
      res.json(words);
    } catch (error) {
      console.error("Error fetching word activities:", error);
      res.status(500).json({ message: "Failed to fetch word activities" });
    }
  });

  app.get('/api/activities/phrases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const phrases = await storage.getUserSavedPhrases(userId);
      res.json(phrases);
    } catch (error) {
      console.error("Error fetching phrase activities:", error);
      res.status(500).json({ message: "Failed to fetch phrase activities" });
    }
  });

  app.get('/api/activities/readings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Get saved readings - these are phrases marked with source: "reader_content"
      const readings = await storage.getUserSavedPhrases(userId);
      const readingPhrases = readings.filter(p => p.source === 'reader_content');
      res.json(readingPhrases);
    } catch (error) {
      console.error("Error fetching reading activities:", error);
      res.status(500).json({ message: "Failed to fetch reading activities" });
    }
  });

  // Activity recording endpoint
  app.post('/api/activities/record', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activityData = insertUserActivitySchema.parse({
        ...req.body,
        userId
      });
      
      const activity = await storage.recordActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error recording activity:", error);
      res.status(500).json({ message: "Failed to record activity" });
    }
  });

  // Record user activity
  app.post('/api/user/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activityData = insertUserActivitySchema.parse({
        ...req.body,
        userId
      });
      
      const activity = await storage.recordActivity(activityData);
      res.json(activity);
    } catch (error) {
      console.error("Error recording activity:", error);
      res.status(500).json({ message: "Failed to record activity" });
    }
  });

  // User saved phrases (My Words) endpoints - now includes both phrases and words
  app.get('/api/user/saved-phrases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get both saved phrases and saved words
      const phrases = await storage.getUserSavedPhrases(userId);
      const words = await storage.getSavedWords(userId);
      
      // Convert saved words to phrase format for unified display
      const convertedWords = words.map(word => ({
        id: `word_${word.id}`,
        userId: word.userId,
        phrase: word.word,
        syllabication: word.syllabication,
        phonetic: word.pronunciation,
        difficulty: word.difficultyLevel ? word.difficultyLevel.toString() : null,
        assessmentResults: null,
        source: 'words',
        sourceId: null,
        createdAt: word.createdAt
      }));
      
      // Combine and sort by creation date
      const combinedItems = [...phrases, ...convertedWords]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(combinedItems);
    } catch (error) {
      console.error("Error fetching saved phrases:", error);
      res.status(500).json({ message: "Failed to fetch saved phrases" });
    }
  });

  app.post('/api/user/saved-phrases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const phraseData = insertUserSavedPhraseSchema.parse({
        ...req.body,
        userId
      });
      
      const phrase = await storage.createUserSavedPhrase(phraseData);
      res.json(phrase);
    } catch (error) {
      console.error("Error saving phrase:", error);
      res.status(500).json({ message: "Failed to save phrase" });
    }
  });

  app.delete('/api/user/saved-phrases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const phraseId = parseInt(req.params.id);
      await storage.deleteUserSavedPhrase(phraseId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved phrase:", error);
      res.status(500).json({ message: "Failed to delete phrase" });
    }
  });

  // Practice groups endpoints
  app.get('/api/user/practice-groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getPracticeGroups(userId);
      
      // Get phrases for each group
      const groupsWithPhrases = await Promise.all(
        groups.map(async (group) => {
          const groupPhrases = await storage.getPracticeGroupPhrases(group.id);
          return { ...group, phraseCount: groupPhrases.length };
        })
      );
      
      res.json(groupsWithPhrases);
    } catch (error) {
      console.error("Error fetching practice groups:", error);
      res.status(500).json({ message: "Failed to fetch practice groups" });
    }
  });

  app.post('/api/user/practice-groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupData = insertPracticeGroupSchema.parse({
        ...req.body,
        userId
      });
      
      const group = await storage.createPracticeGroup(groupData);
      res.json(group);
    } catch (error) {
      console.error("Error creating practice group:", error);
      res.status(500).json({ message: "Failed to create practice group" });
    }
  });

  app.delete('/api/user/practice-groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      await storage.deletePracticeGroup(groupId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting practice group:", error);
      res.status(500).json({ message: "Failed to delete practice group" });
    }
  });

  // Add phrase to practice group
  app.post('/api/user/practice-groups/:groupId/phrases', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const { phraseId } = req.body;
      
      const groupPhrase = await storage.addPhraseToPracticeGroup({
        groupId,
        phraseId: parseInt(phraseId)
      });
      
      res.json(groupPhrase);
    } catch (error) {
      console.error("Error adding phrase to group:", error);
      res.status(500).json({ message: "Failed to add phrase to group" });
    }
  });

  // Unified pronunciation assessment endpoint
  app.post('/api/pronunciation/assess', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Support both 'text' and 'referenceText' parameter names for backward compatibility
      const referenceText = req.body.text || req.body.referenceText;
      const { contentId, difficulty, source, itemType } = req.body;

      if (!referenceText) {
        return res.status(400).json({ error: 'Reference text is required' });
      }

      console.log(`🎯 Starting unified pronunciation assessment for text: "${referenceText}"`);
      console.log(`📊 Request details - contentId: ${contentId}, difficulty: ${difficulty}, source: ${source}, itemType: ${itemType}`);

      const audioBuffer = req.file.buffer;
      const assessment = await assessPronunciation(audioBuffer, referenceText);

      // If user is authenticated, record the activity
      if (req.user && (req.user as any).claims?.sub) {
        const userId = (req.user as any).claims.sub;
        
        // Determine activity type based on context
        let activityType = 'reading_session'; // default for reading
        if (itemType === 'word') {
          activityType = 'word_practice';
        } else if (itemType === 'phrase') {
          activityType = 'phrase_practice';
        } else if (contentId || source === 'reader') {
          activityType = 'reading_session';
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
          source: source || (contentId ? 'reading' : 'practice'),
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
      res.json(assessment);
      
    } catch (error) {
      console.error('Pronunciation assessment error:', error);
      res.status(500).json({ 
        error: 'Pronunciation assessment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Legacy endpoint for backward compatibility (Words/Phrases pages)
  app.post('/api/assess', isAuthenticated, upload.single('audio'), async (req: any, res) => {
    console.log('⚠️ Using legacy /api/assess endpoint - redirecting to unified assessment');
    
    // Forward to the unified endpoint with proper parameter mapping
    req.body.text = req.body.referenceText;
    
    // Call the unified handler
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const referenceText = req.body.referenceText;
      const { difficulty, source, itemType } = req.body;
      const userId = req.user.claims.sub;

      if (!referenceText) {
        return res.status(400).json({ error: 'Reference text is required' });
      }

      console.log(`🎯 Legacy assessment for text: "${referenceText}"`);

      const audioBuffer = req.file.buffer;
      const assessment = await assessPronunciation(audioBuffer, referenceText);

      // Record the activity
      await storage.recordActivity({
        userId,
        activityType: itemType === 'word' ? 'word_practice' : 'phrase_practice',
        itemPracticed: referenceText,
        score: assessment.pronunciationScore,
        accuracy: assessment.accuracyScore,
        fluency: assessment.fluencyScore,
        completeness: assessment.completenessScore,
        difficulty: difficulty || 'medium',
        source: source || 'practice',
        metadata: { 
          wordLevelResults: assessment.wordLevelResults,
          sdkVersion: assessment.sdkVersion 
        }
      });

      res.json(assessment);
    } catch (error) {
      console.error('Legacy assessment error:', error);
      res.status(500).json({ 
        error: 'Assessment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Speech synthesis endpoints
  app.post('/api/synthesize', async (req, res) => {
    try {
      const { text, voice } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const audioBuffer = await synthesizeSpeech(text, voice);
      
      res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      res.status(500).json({ 
        error: 'Speech synthesis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/speech/synthesize', async (req, res) => {
    try {
      const { ssml, text, voice = "default", speed = 1.0 } = req.body;
      
      // Support both SSML and legacy text+speed format
      if (!ssml && !text) {
        return res.status(400).json({ error: 'SSML or text is required' });
      }

      let audioBuffer: Buffer;
      
      if (ssml) {
        // Use SSML with Azure Speech SDK
        audioBuffer = await synthesizeSpeechFromSSML(ssml);
      } else {
        // Legacy support for text+speed format
        audioBuffer = await synthesizeSpeech(text, voice, speed);
      }
      
      // Enhanced headers for better Safari/mobile compatibility
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
    } catch (error) {
      console.error('Speech synthesis error:', error);
      res.status(500).json({ 
        error: 'Speech synthesis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Word pronunciation endpoint
  app.get('/api/pronunciation/word', async (req, res) => {
    try {
      const { word } = req.query;
      
      if (!word || typeof word !== 'string') {
        return res.status(400).json({ error: 'Word parameter is required' });
      }

      const phonetic = await getWordPronunciation(word);
      
      res.json({ phonetic });
    } catch (error) {
      console.error('Word pronunciation error:', error);
      res.status(500).json({ 
        error: 'Word pronunciation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Word syllabication endpoint - generates proper syllabication using OpenAI
  app.post('/api/pronunciation/syllabication', async (req, res) => {
    try {
      const { words } = req.body;
      
      if (!words || !Array.isArray(words)) {
        return res.status(400).json({ error: 'Words array is required' });
      }

      // Generate syllabication for each word
      const results = await Promise.all(
        words.map(async (word) => {
          try {
            const syllabication = await generateSyllabication(word);
            return {
              word: word,
              syllabication: syllabication
            };
          } catch (error) {
            console.error(`Error generating syllabication for "${word}":`, error);
            // Fallback to basic syllabication
            const basicSyllabication = word.toLowerCase();
            return {
              word: word,
              syllabication: basicSyllabication
            };
          }
        })
      );
      
      res.json({ results });
    } catch (error) {
      console.error('Syllabication generation error:', error);
      res.status(500).json({ 
        error: 'Syllabication generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Word phonetic breakdown endpoint - generates intuitive phonetic syllables using OpenAI
  app.post('/api/pronunciation/phonetic-breakdown', async (req, res) => {
    try {
      const { words } = req.body;
      
      if (!words || !Array.isArray(words)) {
        return res.status(400).json({ error: 'Words array is required' });
      }

      // Generate phonetic breakdown for each word
      const results = await Promise.all(
        words.map(async (word) => {
          try {
            const phoneticBreakdown = await generatePhoneticBreakdown(word);
            return {
              word: word,
              phoneticBreakdown: phoneticBreakdown
            };
          } catch (error) {
            console.error(`Error generating phonetic breakdown for "${word}":`, error);
            // Fallback to the word itself
            return {
              word: word,
              phoneticBreakdown: word.toLowerCase()
            };
          }
        })
      );
      
      res.json({ results });
    } catch (error) {
      console.error('Phonetic breakdown generation error:', error);
      res.status(500).json({ 
        error: 'Phonetic breakdown generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Speech transcription endpoint
  app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const audioBuffer = req.file.buffer;
      const transcription = await transcribeAudio(audioBuffer);
      
      res.json({ transcription });
    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ 
        error: 'Transcription failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Content generation endpoints
  app.post('/api/content/generate', async (req, res) => {
    try {
      const { topic, difficulty } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
      }

      const content = await generateReadingContent(topic, difficulty || 'easy');
      res.json(content);
    } catch (error) {
      console.error('Content generation error:', error);
      res.status(500).json({ 
        error: 'Content generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Sample content endpoint for initial page load
  app.get('/api/content/sample', async (req, res) => {
    try {
      const content = await generateSampleContent();
      res.json(content);
    } catch (error) {
      console.error('Sample content generation error:', error);
      res.status(500).json({ 
        error: 'Sample content generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Legacy content generation endpoint (keep for backward compatibility)
  app.post('/api/generate-content', async (req, res) => {
    try {
      const { topic, difficulty } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
      }

      const content = await generateReadingContent(topic, difficulty || 'easy');
      res.json(content);
    } catch (error) {
      console.error('Content generation error:', error);
      res.status(500).json({ 
        error: 'Content generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Topic phrases/words generation endpoint (no auth required for content generation)
  app.post('/api/content/generate-topic-phrases', async (req, res) => {
    try {
      const { topic, difficulty, type } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
      }

      console.log(`Generating ${type || 'phrases'} for topic: "${topic}" with difficulty: ${difficulty || 'easy'}`);

      const phrases = await generateTopicPhrases(
        topic, 
        difficulty || '4', 
        type || 'phrases'
      );
      
      console.log(`Generated ${phrases.length} items:`, phrases);
      res.json({ phrases });
    } catch (error) {
      console.error('Topic phrases generation error:', error);
      res.status(500).json({ 
        error: 'Topic phrases generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Voice command processing endpoints
  app.post('/api/voice-command', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const audioBuffer = req.file.buffer;
      
      // First transcribe the audio
      const transcription = await transcribeAudio(audioBuffer);
      
      // Then process the command
      const result = await processVoiceCommand(transcription);
      
      res.json({
        transcription,
        command: result
      });
    } catch (error) {
      console.error('Voice command processing error:', error);
      res.status(500).json({ 
        error: 'Voice command processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced voice processing endpoint
  app.post('/api/voice/enhanced', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const audioBuffer = req.file.buffer;
      
      // First transcribe the audio
      const transcription = await transcribeAudio(audioBuffer);
      
      // Then process the command with enhanced AI
      const result = await processVoiceCommand(transcription);
      
      res.json({
        transcription,
        result,
        success: true
      });
    } catch (error) {
      console.error('Enhanced voice processing error:', error);
      res.status(500).json({ 
        error: 'Enhanced voice processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  });

  // Saved words API endpoints (separate from phrases)
  app.get('/api/saved-words', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const words = await storage.getSavedWords(userId);
      res.json(words);
    } catch (error) {
      console.error("Error fetching saved words:", error);
      res.status(500).json({ message: "Failed to fetch saved words" });
    }
  });

  app.post('/api/saved-words', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { word, syllabication, folderId } = req.body;
      
      if (!word) {
        return res.status(400).json({ error: 'Word is required' });
      }

      const wordData = {
        userId,
        word,
        syllabication: syllabication || null,
        folderId: folderId ? parseInt(folderId) : null,
        difficultyLevel: 1,
        practiceCount: 0,
        masteryLevel: 0
      };
      
      const savedWord = await storage.createSavedWord(wordData);
      res.json(savedWord);
    } catch (error) {
      console.error("Error saving word:", error);
      res.status(500).json({ message: "Failed to save word" });
    }
  });

  app.delete('/api/saved-words/:word', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wordToDelete = decodeURIComponent(req.params.word);
      
      // Find and delete the word by userId and word text
      const words = await storage.getSavedWords(userId);
      const wordToRemove = words.find(w => w.word === wordToDelete);
      
      if (wordToRemove) {
        await storage.deleteSavedWord(wordToRemove.id);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved word:", error);
      res.status(500).json({ message: "Failed to delete word" });
    }
  });

  // Legacy phrases save endpoint for backward compatibility
  app.post('/api/phrases/save', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const phraseData = insertUserSavedPhraseSchema.parse({
        ...req.body,
        userId
      });
      
      const phrase = await storage.createUserSavedPhrase(phraseData);
      res.json(phrase);
    } catch (error) {
      console.error("Error saving phrase:", error);
      res.status(500).json({ message: "Failed to save phrase" });
    }
  });

  // Viseme generation endpoint
  app.post('/api/visemes/generate', async (req, res) => {
    try {
      const { text, voice, format, speed } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const speechSpeed = speed || 1.0;
      console.log(`🎭 Generating visemes for text: "${text}" at ${(speechSpeed * 100)}% speed`);
      
      const visemeData = await generateSpeechWithVisemes(
        text,
        voice || "en-US-AriaNeural",
        format || "svg",
        speechSpeed
      );
      
      console.log(`✅ Generated ${visemeData.visemes.length} visemes with ${visemeData.duration.toFixed(2)}s duration`);
      
      // Convert the audio buffer to base64 for easier transport
      const audioBase64 = visemeData.audioBuffer.toString('base64');
      
      res.json({
        visemes: visemeData.visemes,
        audioBuffer: audioBase64,
        duration: visemeData.duration
      });
    } catch (error) {
      console.error('Viseme generation error:', error);
      res.status(500).json({ 
        error: 'Viseme generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Contact form endpoint
  app.post('/api/contact', async (req, res) => {
    try {
      const contactSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        category: z.enum(['Question', 'Bug fix', 'Enhancement Suggestion']),
        subject: z.string().min(1, "Subject is required"),
        message: z.string().min(1, "Message is required")
      });

      const contactData = contactSchema.parse(req.body);
      
      const success = await sendContactForm(contactData);
      
      if (success) {
        res.json({ message: 'Contact form submitted successfully' });
      } else {
        res.status(500).json({ error: 'Failed to send contact form' });
      }
    } catch (error) {
      console.error('Contact form error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation failed',
          details: error.errors 
        });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Generate words containing specific sounds for targeted practice
  app.post('/api/content/generate-words-with-sound', async (req, res) => {
    try {
      const { targetSound, difficulty = "4", count = 8 } = req.body;
      
      if (!targetSound) {
        return res.status(400).json({ error: 'targetSound is required' });
      }

      console.log(`Generating words containing sound: "${targetSound}" with difficulty: ${difficulty}`);
      
      const words = await generateWordsWithSound(targetSound, difficulty, count);
      
      // Format response to match existing endpoint structure
      const formattedWords = words.map(word => ({
        text: word.text,
        syllabication: word.syllabication
      }));
      
      res.json({ phrases: formattedWords });
    } catch (error) {
      console.error("Error generating words with sound:", error);
      res.status(500).json({ error: "Failed to generate words with sound" });
    }
  });

  // Assignment routes
  app.get('/api/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignments = await storage.getUserAssignments(userId);
      
      // Get progress for each assignment
      const assignmentsWithProgress = await Promise.all(
        assignments.map(async (assignment) => {
          const progress = await storage.getAssignmentProgress(assignment.id);
          return {
            ...assignment,
            progress
          };
        })
      );
      
      res.json(assignmentsWithProgress);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  app.get('/api/assignments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await storage.getAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Check if user owns this assignment
      const userId = req.user.claims.sub;
      if (assignment.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const items = await storage.getAssignmentItems(assignmentId);
      const progress = await storage.getAssignmentProgress(assignmentId);
      
      res.json({
        ...assignment,
        items,
        progress
      });
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ error: "Failed to fetch assignment" });
    }
  });

  app.post('/api/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const assignmentData = insertAssignmentSchema.parse(req.body);
      const assignment = await storage.createAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  app.post('/api/assignments/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const itemData = insertAssignmentItemSchema.parse({
        ...req.body,
        assignmentId
      });
      const item = await storage.createAssignmentItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating assignment item:", error);
      res.status(500).json({ error: "Failed to create assignment item" });
    }
  });

  app.patch('/api/assignments/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const updates = req.body;
      const updatedItem = await storage.updateAssignmentItem(itemId, updates);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating assignment item:", error);
      res.status(500).json({ error: "Failed to update assignment item" });
    }
  });

  app.post('/api/assignments/:id/results', isAuthenticated, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const resultData = insertAssignmentResultSchema.parse({
        ...req.body,
        assignmentId,
        userId
      });
      
      const result = await storage.createAssignmentResult(resultData);
      
      // Update the assignment item with the latest score
      if (req.body.itemId && req.body.pronunciationScore !== undefined) {
        const itemUpdates: any = {
          lastScore: req.body.pronunciationScore,
          attemptCount: req.body.attemptCount || 1,
          lastAttemptAt: new Date()
        };
        
        // Update best score if this is better
        const item = await storage.getAssignmentItems(assignmentId);
        const currentItem = item.find(i => i.id === req.body.itemId);
        if (!currentItem?.bestScore || req.body.pronunciationScore > currentItem.bestScore) {
          itemUpdates.bestScore = req.body.pronunciationScore;
        }
        
        // Mark as completed if score is good enough (e.g., > 70)
        if (req.body.pronunciationScore > 70) {
          itemUpdates.isCompleted = true;
        }
        
        await storage.updateAssignmentItem(req.body.itemId, itemUpdates);
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating assignment result:", error);
      res.status(500).json({ error: "Failed to create assignment result" });
    }
  });

  // Endpoint for therapists to get real-time assignment progress for all their patients
  app.get('/api/therapist/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const therapistId = req.user.claims.sub;
      const assignments = await storage.getTherapistAssignments(therapistId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching therapist assignments:", error);
      res.status(500).json({ error: "Failed to fetch therapist assignments" });
    }
  });

  // Endpoint to get detailed results for a specific assignment (for therapists)
  app.get('/api/assignments/:id/results', isAuthenticated, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const results = await storage.getAssignmentResults(assignmentId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching assignment results:", error);
      res.status(500).json({ error: "Failed to fetch assignment results" });
    }
  });

  // Endpoint to get assignment progress summary (for real-time monitoring)
  app.get('/api/assignments/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const progress = await storage.getAssignmentProgress(assignmentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching assignment progress:", error);
      res.status(500).json({ error: "Failed to fetch assignment progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}