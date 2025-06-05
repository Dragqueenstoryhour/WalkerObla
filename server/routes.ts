import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { assessPronunciation, synthesizeSpeech } from "./azure";
import { transcribeAudio, generateReadingContent, processVoiceCommand, generateTopicPhrases } from "./openai";
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

  // User saved phrases (My Words) endpoints
  app.get('/api/user/saved-phrases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const phrases = await storage.getUserSavedPhrases(userId);
      res.json(phrases);
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

  // Assessment endpoint
  app.post('/api/assess', isAuthenticated, upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const { referenceText, difficulty, source, itemType } = req.body;
      const userId = req.user.claims.sub;

      if (!referenceText) {
        return res.status(400).json({ error: 'Reference text is required' });
      }

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
      console.error('Assessment error:', error);
      res.status(500).json({ 
        error: 'Assessment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Text-to-speech endpoint
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

  // Content generation endpoint
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

  // Voice command processing endpoint
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

  const httpServer = createServer(app);
  return httpServer;
}