import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { assessPronunciation, synthesizeSpeech, getWordPronunciation } from "./azure";
import { transcribeAudio, generateReadingContent, processVoiceCommand, generateTopicPhrases, generateSampleContent } from "./openai";
import multer from "multer";
import { z } from "zod";
import { insertUserSavedPhraseSchema, insertPracticeGroupSchema, insertUserActivitySchema } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
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
        let activityType = 'reading_practice'; // default
        if (itemType === 'word') {
          activityType = 'word_practice';
        } else if (itemType === 'phrase') {
          activityType = 'phrase_practice';
        } else if (contentId) {
          activityType = 'reading_practice';
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
      const { word, folderId } = req.body;

      if (!word) {
        return res.status(400).json({ error: 'Word is required' });
      }

      const wordData = {
        userId,
        word,
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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Text-to-speech generation
  app.post('/api/tts/generate', async (req, res) => {
    try {
      const { text, voice = 'en-US-JennyNeural', speed = 1.0 } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Use existing synthesizeSpeech function with speed control
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
          <voice name="${voice}">
            <prosody rate="${speed}">
              ${text}
            </prosody>
          </voice>
        </speak>
      `;

      const audioBuffer = await synthesizeSpeech(ssml, voice);

      res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error('TTS generation error:', error);
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}