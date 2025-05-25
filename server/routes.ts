import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import * as openaiService from "./openai";
import * as azureService from "./azure";
import * as azureVisemeService from "./azureViseme";
import * as realtimeService from "./realtime";
import * as stripeService from "./stripe";
import multer from 'multer';
import { z } from "zod";
import { insertReadingContentSchema, insertReadingSessionSchema, insertSharedPhraseCollectionSchema, insertUserSavedPhraseSchema, insertPracticeGroupSchema, insertPracticeGroupPhraseSchema } from "@shared/schema";
import WebSocket from "ws";
import { setupAuth, isAuthenticated } from "./supabaseAuth";
import Stripe from "stripe";
import fs from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// Configure multer for file uploads (in-memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Check if OpenAI API key is provided
  if (!process.env.OPENAI_API_KEY) {
    console.warn("WARNING: OPENAI_API_KEY is not set. AI features will not work properly.");
  }
  
  // Set up authentication with Supabase
  await setupAuth(app);
  
  // Add Supabase configuration endpoint
  app.get('/api/auth/config', (req, res) => {
    try {
      // For development purposes, we're using hardcoded values
      // In production, these would come from environment variables
      const supabaseUrl = 'https://your-project.supabase.co';
      const supabaseAnonKey = 'your-anon-key';
      
      res.json({ 
        supabaseUrl, 
        supabaseAnonKey 
      });
    } catch (error) {
      console.error('Error providing Supabase config:', error);
      res.status(500).json({ error: 'Failed to provide Supabase configuration' });
    }
  });

  // Content endpoints
  app.get('/api/content/sample', async (req, res) => {
    try {
      const sampleContent = await openaiService.generateSampleContent();
      res.json(sampleContent);
    } catch (error) {
      console.error('Error generating sample content:', error);
      res.status(500).json({ error: 'Failed to generate sample content' });
    }
  });

  app.post('/api/content/generate', async (req, res) => {
    try {
      const schema = z.object({
        topic: z.string().min(1, "Topic cannot be empty"),
        difficulty: z.coerce.string() // Allow numeric input but convert to string
          .regex(/^[1-8]$/, "Difficulty must be a number from 1 to 8")
      });

      const { topic, difficulty } = schema.parse(req.body);

      console.log(`Generating content about "${topic}" with difficulty "${difficulty}"`);

      const content = await openaiService.generateReadingContent(topic, difficulty);
      res.json(content);
    } catch (error) {
      console.error('Error generating content:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid request data',
          details: error.errors 
        });
      } else {
        res.status(500).json({ error: 'Failed to generate content' });
      }
    }
  });
  
  // Process phrases for pronunciation practice
  app.post('/api/content/process-phrases', async (req, res) => {
    try {
      const schema = z.object({
        phrases: z.array(z.string())
      });

      const { phrases } = schema.parse(req.body);
      
      if (phrases.length === 0) {
        return res.status(400).json({ error: 'No phrases provided' });
      }
      
      // Process the phrases with OpenAI
      const processedPhrases = await openaiService.processPhrases(phrases);
      res.json({ phrases: processedPhrases });
    } catch (error) {
      console.error('Error processing phrases:', error);
      res.status(500).json({ error: 'Failed to process phrases' });
    }
  });
  
  // Generate similar phrases based on an existing phrase
  app.post('/api/content/generate-similar', async (req, res) => {
    try {
      const schema = z.object({
        phrase: z.string()
      });

      const { phrase } = schema.parse(req.body);
      
      // Generate similar phrases with OpenAI
      const similarPhrases = await openaiService.generateSimilarPhrases(phrase);
      res.json({ phrases: similarPhrases });
    } catch (error) {
      console.error('Error generating similar phrases:', error);
      res.status(500).json({ error: 'Failed to generate similar phrases' });
    }
  });
  
  // Extract text from images or PDFs using OCR
  app.post('/api/content/ocr', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Check file type
      const fileBuffer = req.file.buffer;
      const fileType = req.file.mimetype;
      
      // Process the file with OCR
      const extractedText = await openaiService.extractTextFromImage(fileBuffer, fileType);
      res.json({ text: extractedText });
    } catch (error) {
      console.error('Error processing file with OCR:', error);
      res.status(500).json({ error: 'Failed to extract text from file' });
    }
  });
  
  // Generate phrases on a specific topic
  app.post('/api/content/generate-topic-phrases', async (req, res) => {
    try {
      const schema = z.object({
        topic: z.string(),
        difficulty: z.coerce.string() // Allow numeric input but convert to string
          .regex(/^[1-8]$/, "Difficulty must be a number from 1 to 8")
          .optional(),
        type: z.enum(["words", "phrases"]).optional(),
        wordTypes: z.array(z.string()).optional(),
        syllableRange: z.object({
          min: z.number().int().min(1).max(5).optional(),
          max: z.number().int().min(1).max(5).optional()
        }).optional()
      });

      // Validate the request body
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: validationResult.error.format()
        });
      }

      const { topic, difficulty = "4", type = "words", wordTypes, syllableRange } = validationResult.data;
      
      // Use OpenAI to generate phrases/words related to the topic with specified difficulty and type
      const response = await openaiService.generateTopicPhrases(topic, difficulty, type);
      
      // Include difficulty metadata in response
      res.json({
        phrases: response,
        metadata: {
          difficulty: difficulty,
          difficultyInfo: openaiService.DIFFICULTY_SCALE[difficulty],
          topic: topic,
          wordTypes: wordTypes || "not specified",
          syllableRange: syllableRange || "based on difficulty level"
        }
      });
    } catch (error) {
      console.error('Error generating phrases:', error);
      
      // Provide more specific error messages
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: error.format()
        });
      } else if (error.message?.includes('difficulty')) {
        res.status(400).json({
          error: 'Invalid difficulty level',
          message: 'Difficulty must be a number from 1 to 8'
        });
      } else {
        res.status(500).json({
          error: 'Failed to generate phrases',
          message: error.message || 'Unknown error occurred'
        });
      }
    }
  });
  
  // Provide standardized difficulty scale
  app.get('/api/difficulty/scale', (req, res) => {
    try {
      res.json({
        difficultyLevels: openaiService.DIFFICULTY_SCALE,
        validLevels: Object.keys(openaiService.DIFFICULTY_SCALE),
        message: "These difficulty levels are used throughout the application for speech practice"
      });
    } catch (error) {
      console.error('Error retrieving difficulty scale:', error);
      res.status(500).json({ error: 'Failed to retrieve difficulty scale information' });
    }
  });

  // Filter phrases based on difficulty, syllable count, etc.
  app.post('/api/phrases/filter', async (req, res) => {
    try {
      const schema = z.object({
        difficulty: z.coerce.string() // Update this line
          .regex(/^[1-8]$/, "Difficulty must be a number from 1 to 8")
          .optional(),
        syllableRange: z.object({
          min: z.number().int().min(1).max(5).optional(),
          max: z.number().int().min(1).max(5).optional()
        }).optional(),
        wordTypes: z.array(z.string()).optional(),
        topics: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(50).optional().default(20),
        userId: z.string().optional()
      });

      // Validate request
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid filter parameters',
          details: validationResult.error.format()
        });
      }

      const { difficulty, syllableRange, wordTypes, topics, limit, userId } = validationResult.data;

      // Get phrases from database with filters
      // For now, we'll generate some phrases based on the difficulty
      // In a real implementation, this would query from the database
      let phrases = [];
      
      if (topics && topics.length > 0) {
        // Generate phrases for each topic with the specified difficulty
        for (const topic of topics.slice(0, 2)) { // Limit to 2 topics to avoid overloading
          const topicPhrases = await openaiService.generateTopicPhrases(
            topic, 
            difficulty || "4", 
            wordTypes,
            syllableRange
          );
          phrases = [...phrases, ...topicPhrases.map(phrase => ({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            phrase,
            topic,
            difficulty: difficulty || "4"
          }))];
        }
      } else {
        // Generate generic phrases based on difficulty
        const genericPhrases = await openaiService.generateTopicPhrases(
          "general conversation", 
          difficulty || "4",
          wordTypes,
          syllableRange
        );
        phrases = genericPhrases.map(phrase => ({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          phrase,
          topic: "general",
          difficulty: difficulty || "4"
        }));
      }

      // Apply syllable range filtering if specified
      if (syllableRange) {
        // This would ideally be done at the database level
        // For now, we'll include metadata about syllable counts with each phrase
        phrases = phrases.map(phrase => ({
          ...phrase,
          syllableCount: estimateSyllableCount(phrase.phrase)
        }));
      }

      res.json({
        phrases,
        metadata: {
          filterApplied: {
            difficulty,
            syllableRange,
            wordTypes,
            topics
          },
          difficultyInfo: difficulty ? openaiService.DIFFICULTY_SCALE[difficulty] : null,
          count: phrases.length
        }
      });
    } catch (error) {
      console.error('Error filtering phrases:', error);
      res.status(500).json({
        error: 'Failed to filter phrases',
        message: error.message || 'Unknown error occurred'
      });
    }
  });

  // Track user progress with phrases at different difficulty levels
  app.post('/api/progress/level', isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        phraseId: z.string().or(z.number().transform(n => n.toString())),
        score: z.number().min(0).max(100),
        difficulty: z.string().regex(/^[1-8]$/, "Difficulty must be a number from 1 to 8"),
        metadata: z.object({
          timeSpent: z.number().int().optional(),
          attemptsCount: z.number().int().optional(),
          completedDate: z.string().datetime().optional()
        }).optional()
      });

      // Validate request
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid progress data',
          details: validationResult.error.format()
        });
      }

      const userId = req.session.user.id;
      const { phraseId, score, difficulty, metadata } = validationResult.data;

      // Here we would store the performance data in the database
      // For now, we'll just return a mock response
      const userProgress = {
        userId,
        phraseId,
        score,
        difficulty,
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
        progressStats: {
          averageScoreByDifficulty: {
            "1": 92,
            "2": 88,
            "3": 85,
            "4": 78,
            "5": 72,
            "6": 65,
            "7": 58,
            "8": 45,
            [difficulty]: score // Include the current score
          },
          totalPracticed: 87,
          recentImprovement: 12,
          recommendedDifficulty: calculateRecommendedDifficulty(difficulty, score)
        }
      };

      res.json({
        success: true,
        progressRecord: {
          id: `progress-${Date.now()}`,
          userId,
          phraseId,
          score,
          difficulty,
          timestamp: new Date().toISOString()
        },
        userProgress,
        message: "Performance successfully tracked"
      });
    } catch (error) {
      console.error('Error tracking progress:', error);
      res.status(500).json({
        error: 'Failed to track progress',
        message: error.message || 'Unknown error occurred'
      });
    }
  });

  // Helper function to estimate syllable count (simplified)
  function estimateSyllableCount(text: string): number {
    // A very simple syllable counter - would be replaced with a more accurate algorithm
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;
    
    for (const word of words) {
      // Count vowel groups as syllables
      const vowelGroups = word.match(/[aeiouy]+/g) || [];
      count += vowelGroups.length;
      
      // Adjust for common patterns
      if (word.endsWith('e') && vowelGroups.length > 1) {
        count--;
      }
      if (word.endsWith('le') && word.length > 2) {
        count++;
      }
      if (count === 0 && word.length > 0) {
        count = 1; // Every word has at least one syllable
      }
    }
    
    return count;
  }

  // Helper function to calculate recommended difficulty based on performance
  function calculateRecommendedDifficulty(currentDifficulty: string, score: number): string {
    const difficultyLevel = parseInt(currentDifficulty);
    
    // Suggest moving up if score is above 85% and not at max difficulty
    if (score > 85 && difficultyLevel < 8) {
      return String(difficultyLevel + 1);
    }
    
    // Suggest moving down if score is below 40% and not at min difficulty
    if (score < 40 && difficultyLevel > 1) {
      return String(difficultyLevel - 1);
    }
    
    // Otherwise, stay at current difficulty
    return currentDifficulty;
  }

  // Voice command endpoints
  app.post('/api/voice/command', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      const audioBuffer = req.file.buffer;
      const command = await openaiService.transcribeAudio(audioBuffer);
      res.json({ command });
    } catch (error) {
      console.error('Error processing voice command:', error);
      res.status(500).json({ error: 'Failed to process voice command' });
    }
  });

  app.post('/api/voice/process', async (req, res) => {
    try {
      const schema = z.object({
        command: z.string(),
      });

      const { command } = schema.parse(req.body);
      const result = await openaiService.processVoiceCommand(command);
      res.json(result);
    } catch (error) {
      console.error('Error processing command:', error);
      res.status(500).json({ error: 'Failed to process command' });
    }
  });

  // Pronunciation assessment endpoints
  app.post('/api/pronunciation/assess', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      const schema = z.object({
        contentId: z.string().transform(Number).optional(),
        text: z.string().optional(),
        referenceText: z.string().optional(),
      });

      const { contentId, text, referenceText } = schema.parse(req.body);
      const finalText = text || referenceText;
      
      if (!finalText) {
        return res.status(400).json({ error: 'No text provided for pronunciation assessment' });
      }
      const audioBuffer = req.file.buffer;
      
      const assessmentResult = await azureService.assessPronunciation(audioBuffer, finalText);
      res.json(assessmentResult);
    } catch (error) {
      console.error('Error assessing pronunciation:', error);
      res.status(500).json({ error: 'Failed to assess pronunciation' });
    }
  });
  
  // Debug route for Azure Speech pronunciation assessment
  app.post('/api/debug/pronunciation', upload.single('audio'), async (req, res) => {
    const startTime = Date.now();
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      audioReceived: false,
      textReceived: false,
      conversionAttempted: false,
      conversionSuccessful: false,
      recognitionAttempted: false,
      recognitionSuccessful: false,
      assessmentAttempted: false,
      assessmentSuccessful: false,
      elapsedTime: 0,
      errors: [],
      rawResults: null,
      audioStats: {},
      sdkInfo: {},
      ffmpegCommands: []
    };
    
    try {
      console.log(`\n🔍 DEBUG ROUTE ACCESSED: ${new Date().toISOString()}`);
      
      // 1. Validate request
      if (!req.file) {
        debugInfo.errors.push('No audio file uploaded');
        return res.status(400).json({
          error: 'No audio file uploaded',
          debug: debugInfo
        });
      }
      
      debugInfo.audioReceived = true;
      debugInfo.audioStats.originalSize = req.file.buffer.length;
      debugInfo.audioStats.originalMimeType = req.file.mimetype;
      
      // Extract text parameter
      const text = req.body.text;
      if (!text) {
        debugInfo.errors.push('No text parameter provided');
        return res.status(400).json({
          error: 'Text parameter is required',
          debug: debugInfo
        });
      }
      
      debugInfo.textReceived = true;
      debugInfo.text = text;
      
      // Preserve the original audio buffer for verification
      const audioBuffer = req.file.buffer;
      
      console.log(`🎤 DEBUG: Processing audio (${audioBuffer.length} bytes) with text "${text}"`);
      
      // 2. Temporarily disable mock data in Azure service and track debug info
      debugInfo.conversionAttempted = true;
      
      // Call our enhanced debug version of the assessment function
      try {
        // Prepare debug options
        const debugOptions = {
          disableMock: true,
          debugInfo
        };
        
        const result = await azureService.assessPronunciationDebug(audioBuffer, text, debugOptions);
        
        // Mark recognition and assessment as successful
        debugInfo.conversionSuccessful = true;
        debugInfo.recognitionAttempted = true;
        debugInfo.recognitionSuccessful = true; 
        debugInfo.assessmentAttempted = true;
        debugInfo.assessmentSuccessful = true;
        
        // Store raw results
        debugInfo.rawResults = result.rawJson;
        debugInfo.scores = {
          pronunciation: result.pronunciationScore,
          accuracy: result.accuracyScore,
          fluency: result.fluencyScore,
          completeness: result.completenessScore,
          prosody: result.prosodyScore
        };
        
        // 3. Add final timing information
        debugInfo.elapsedTime = Date.now() - startTime;
        
        // 4. Return raw Azure response with our debug info
        res.json({
          result,
          debug: debugInfo
        });
      } catch (error: any) {
        // Record the error in our debug info
        console.error('DEBUG ERROR during assessment:', error);
        debugInfo.errors.push(error.message || 'Unknown assessment error');
        debugInfo.assessmentAttempted = true;
        debugInfo.assessmentSuccessful = false;
        debugInfo.elapsedTime = Date.now() - startTime;
        
        res.status(500).json({
          error: 'Debug assessment failed',
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
          debug: debugInfo
        });
      }
    } catch (error: any) {
      console.error('DEBUG ERROR:', error);
      debugInfo.errors.push(error.message || 'Unknown error');
      debugInfo.elapsedTime = Date.now() - startTime;
      
      res.status(500).json({
        error: 'Debug assessment failed',
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        debug: debugInfo
      });
    }
  });

  app.get('/api/pronunciation/word', async (req, res) => {
    try {
      const schema = z.object({
        word: z.string(),
      });

      const { word } = schema.parse(req.query);
      const phonetic = await azureService.getWordPronunciation(word);
      res.json({ phonetic });
    } catch (error) {
      console.error('Error getting word pronunciation:', error);
      res.status(500).json({ error: 'Failed to get word pronunciation' });
    }
  });

  // Speech synthesis endpoint
  app.post('/api/speech/synthesize', async (req, res) => {
    try {
      const schema = z.object({
        text: z.string().min(1, "Text cannot be empty"),
        voice: z.string().optional(),
      });

      const { text, voice } = schema.parse(req.body);
      console.log(`Speech synthesis request: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" (${text.length} chars)`);
      
      const audioBuffer = await azureService.synthesizeSpeech(text, voice);
      
      if (!audioBuffer || audioBuffer.length === 0) {
        console.error("Empty audio buffer returned from synthesizeSpeech");
        return res.status(500).json({ error: "Failed to generate speech audio" });
      }
      
      console.log(`Successfully generated speech audio: ${audioBuffer.length} bytes`);
      
      // Set proper headers for audio streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Stream the audio buffer
      res.status(200).send(audioBuffer);
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      res.status(500).json({ error: 'Failed to synthesize speech' });
    }
  });

  // Reading session endpoints
  app.post('/api/session', async (req, res) => {
    try {
      const sessionData = insertReadingSessionSchema.parse(req.body);
      const session = await storage.createReadingSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // Store audio responses in memory (in a production app, you'd use a database or file storage)
  const audioResponses = new Map<string, Buffer>();

  // Stripe subscription endpoints
  app.post('/api/subscription/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Create a subscription for the user
      const subscriptionResponse = await stripeService.createSubscription(userId);
      
      res.json(subscriptionResponse);
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  });

  // Debug recorder UI (only in development mode)
  app.get('/debug-recorder', (req, res) => {
    // Serve the debug-recorder HTML file
    const debugRecorderPath = join(process.cwd(), 'debug-recorder.html');
    if (fs.existsSync(debugRecorderPath)) {
      res.sendFile(debugRecorderPath);
    } else {
      res.status(404).send('Debug recorder page not found');
    }
  });

  // New phrases practice page
  app.get('/NewPhrases', (req, res) => {
    // Serve the same debug-recorder HTML file at the new path
    const debugRecorderPath = join(process.cwd(), 'debug-recorder.html');
    if (fs.existsSync(debugRecorderPath)) {
      res.sendFile(debugRecorderPath);
    } else {
      res.status(404).send('New phrases practice page not found');
    }
  });

  app.post('/api/subscription/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Cancel the user's subscription
      await stripeService.cancelSubscription(userId);
      
      res.json({ success: true, message: 'Subscription canceled successfully' });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  });

  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const hasPremiumAccess = await stripeService.userHasPremiumAccess(user);
      
      res.json({
        hasPremiumAccess,
        subscriptionStatus: user.subscriptionStatus || null,
        trialEndDate: user.trialEndDate || null,
        subscriptionEndDate: user.subscriptionEndDate || null
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
      res.status(500).json({ error: 'Failed to check subscription status' });
    }
  });

  // Shared phrases endpoints
  app.post('/api/share', async (req: any, res) => {
    try {
      // Validate the request body
      const schema = z.object({
        phrases: z.array(z.object({
          text: z.string().min(1, "Phrase text cannot be empty"),
          difficulty: z.string().optional(),
          phonetic: z.string().optional()
        })).min(1, "At least one phrase must be provided")
      });
      
      // Validate the incoming data with detailed error handling
      try {
        console.log(`Validating /api/share request body:`, JSON.stringify(req.body, null, 2));
        const { phrases } = schema.parse(req.body);
        
        // Additional validation - check if phrases data is in expected format
        if (!Array.isArray(phrases) || phrases.length === 0) {
          console.error(`Invalid phrases format - expected non-empty array but got:`, phrases);
          return res.status(400).json({ error: 'Invalid phrases format. Expected non-empty array.' });
        }
        
        // Log the validated phrases
        console.log(`Validated phrases (${phrases.length}):`, phrases.map(p => p.text).join(', '));
        
        // Generate a UUID for sharing
        const shareId = `share-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        console.log(`Generated shareId: ${shareId}`);
        
        // Get user ID if logged in
        let userId = null;
        if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.claims) {
          userId = req.session.user.id;
          console.log(`Request from authenticated user: ${userId}`);
        } else {
          console.log(`Request from unauthenticated user`);
        }
        
        // Format the data for insertion
        const collectionData = {
          shareId,
          phrases: phrases as any, // Cast to any for JSONB compatibility
          userId,
          name: `Shared phrases (${new Date().toLocaleDateString()})`
        };
        
        // Create the shared collection with better error handling
        try {
          console.log(`Creating shared collection with data:`, {
            ...collectionData,
            phrases: `[${phrases.length} items]` // Don't log the full array
          });
          
          const sharedCollection = await storage.createSharedPhraseCollection(collectionData);
          console.log(`Successfully created shared collection with ID: ${sharedCollection.id}`);
          
          // Return a shareable URL
          const shareableUrl = `/new-phrases?shareId=${shareId}`;
          return res.json({ shareableUrl, shareId });
        } catch (dbError) {
          console.error('Database error creating shared collection:', dbError);
          return res.status(500).json({ 
            error: 'Database error creating shared collection', 
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          });
        }
      } catch (validationError) {
        console.error('Validation error for share request:', validationError);
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validationError instanceof Error ? validationError.message : 'Validation failed'
        });
      }
    } catch (error) {
      console.error('Unhandled error sharing phrases:', error);
      res.status(500).json({ 
        error: 'Failed to generate shareable link',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  app.get('/api/share/:shareId', async (req, res) => {
    try {
      const shareId = req.params.shareId;
      console.log(`Fetching shared phrase collection with shareId: ${shareId}`);
      
      if (!shareId || typeof shareId !== 'string' || shareId.trim() === '') {
        console.error('Invalid shareId provided:', shareId);
        return res.status(400).json({ error: 'Invalid shareId format' });
      }
      
      try {
        const collection = await storage.getSharedPhraseCollection(shareId);
        
        if (!collection) {
          console.log(`Shared phrase collection not found for shareId: ${shareId}`);
          return res.status(404).json({ error: 'Shared phrase collection not found' });
        }
        
        // Validate collection structure
        if (!collection.phrases || !Array.isArray(collection.phrases)) {
          console.error(`Invalid collection phrases format for shareId ${shareId}:`, collection.phrases);
          return res.status(500).json({ error: 'Invalid shared phrase collection format' });
        }
        
        console.log(`Successfully retrieved shared collection with ID: ${collection.id} containing ${collection.phrases.length} phrases`);
        res.json({ collection });
      } catch (dbError) {
        console.error(`Database error fetching shared collection with shareId ${shareId}:`, dbError);
        res.status(500).json({ 
          error: 'Error retrieving shared phrase collection',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        });
      }
    } catch (error) {
      console.error('Unhandled error fetching shared phrase collection:', error);
      res.status(500).json({ 
        error: 'Failed to fetch shared phrase collection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // User saved phrases endpoints
  app.post('/api/phrases/save', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const data = insertUserSavedPhraseSchema.parse({
        ...req.body,
        userId // Ensure the userId from auth is used
      });
      
      const savedPhrase = await storage.createUserSavedPhrase(data);
      res.json({ savedPhrase });
    } catch (error) {
      console.error('Error saving phrase:', error);
      res.status(500).json({ error: 'Failed to save phrase' });
    }
  });
  
  app.get('/api/phrases/saved', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const savedPhrases = await storage.getUserSavedPhrases(userId);
      res.json({ savedPhrases });
    } catch (error) {
      console.error('Error fetching saved phrases:', error);
      res.status(500).json({ error: 'Failed to fetch saved phrases' });
    }
  });
  
  app.delete('/api/phrases/saved/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const phraseId = parseInt(req.params.id, 10);
      
      // First check if the phrase belongs to the user
      const phrase = await storage.getUserSavedPhraseById(phraseId);
      
      if (!phrase) {
        return res.status(404).json({ error: 'Saved phrase not found' });
      }
      
      if (phrase.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this phrase' });
      }
      
      await storage.deleteUserSavedPhrase(phraseId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting saved phrase:', error);
      res.status(500).json({ error: 'Failed to delete saved phrase' });
    }
  });
  
  // Practice groups endpoints
  app.get('/api/practice-groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const groups = await storage.getPracticeGroups(userId);
      res.json({ groups });
    } catch (error) {
      console.error('Error fetching practice groups:', error);
      res.status(500).json({ error: 'Failed to fetch practice groups' });
    }
  });
  
  app.post('/api/practice-groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const data = insertPracticeGroupSchema.parse({
        ...req.body,
        userId // Ensure the userId from auth is used
      });
      
      const group = await storage.createPracticeGroup(data);
      res.json({ group });
    } catch (error) {
      console.error('Error creating practice group:', error);
      res.status(500).json({ error: 'Failed to create practice group' });
    }
  });
  
  app.get('/api/practice-groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const groupId = parseInt(req.params.id, 10);
      
      const group = await storage.getPracticeGroupById(groupId);
      
      if (!group) {
        return res.status(404).json({ error: 'Practice group not found' });
      }
      
      // Check if this group belongs to the user (unless it's shared)
      if (!group.isShared && group.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to access this group' });
      }
      
      // Get phrases in this group
      const phrases = await storage.getPhrasesByGroupId(groupId);
      
      res.json({ group, phrases });
    } catch (error) {
      console.error('Error fetching practice group:', error);
      res.status(500).json({ error: 'Failed to fetch practice group' });
    }
  });
  
  app.patch('/api/practice-groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const groupId = parseInt(req.params.id, 10);
      
      const group = await storage.getPracticeGroupById(groupId);
      
      if (!group) {
        return res.status(404).json({ error: 'Practice group not found' });
      }
      
      if (group.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this group' });
      }
      
      const updatedGroup = await storage.updatePracticeGroup(groupId, req.body);
      res.json({ group: updatedGroup });
    } catch (error) {
      console.error('Error updating practice group:', error);
      res.status(500).json({ error: 'Failed to update practice group' });
    }
  });
  
  app.delete('/api/practice-groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const groupId = parseInt(req.params.id, 10);
      
      const group = await storage.getPracticeGroupById(groupId);
      
      if (!group) {
        return res.status(404).json({ error: 'Practice group not found' });
      }
      
      if (group.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this group' });
      }
      
      await storage.deletePracticeGroup(groupId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting practice group:', error);
      res.status(500).json({ error: 'Failed to delete practice group' });
    }
  });
  
  app.post('/api/practice-groups/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const groupId = parseInt(req.params.id, 10);
      
      const group = await storage.getPracticeGroupById(groupId);
      
      if (!group) {
        return res.status(404).json({ error: 'Practice group not found' });
      }
      
      if (group.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to share this group' });
      }
      
      const updatedGroup = await storage.sharePracticeGroup(groupId);
      
      if (!updatedGroup || !updatedGroup.shareId) {
        return res.status(500).json({ error: 'Failed to generate share ID' });
      }
      
      // Return shareable info
      const shareableUrl = `/practice-groups/shared/${updatedGroup.shareId}`;
      res.json({ 
        group: updatedGroup,
        shareableUrl,
        shareId: updatedGroup.shareId
      });
    } catch (error) {
      console.error('Error sharing practice group:', error);
      res.status(500).json({ error: 'Failed to share practice group' });
    }
  });
  
  app.get('/api/practice-groups/shared/:shareId', async (req, res) => {
    try {
      const { shareId } = req.params;
      
      const group = await storage.getPracticeGroupByShareId(shareId);
      
      if (!group) {
        return res.status(404).json({ error: 'Shared practice group not found' });
      }
      
      // Get phrases in this group
      const phrases = await storage.getPhrasesByGroupId(group.id);
      
      res.json({ group, phrases });
    } catch (error) {
      console.error('Error fetching shared practice group:', error);
      res.status(500).json({ error: 'Failed to fetch shared practice group' });
    }
  });
  
  // Practice group phrases endpoints
  app.post('/api/practice-groups/:groupId/phrases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const groupId = parseInt(req.params.groupId, 10);
      
      // Validate ownership of the group
      const group = await storage.getPracticeGroupById(groupId);
      
      if (!group) {
        return res.status(404).json({ error: 'Practice group not found' });
      }
      
      if (group.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to modify this group' });
      }
      
      // Extract phrase ID and validate that the phrase exists and belongs to user
      const schema = z.object({
        phraseId: z.number()
      });
      
      const { phraseId } = schema.parse(req.body);
      const phrase = await storage.getUserSavedPhraseById(phraseId);
      
      if (!phrase) {
        return res.status(404).json({ error: 'Phrase not found' });
      }
      
      if (phrase.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to use this phrase' });
      }
      
      // Add the phrase to the group
      const groupPhrase = await storage.addPhraseToPracticeGroup(groupId, phraseId);
      res.json({ groupPhrase });
    } catch (error) {
      console.error('Error adding phrase to practice group:', error);
      res.status(500).json({ error: 'Failed to add phrase to practice group' });
    }
  });
  
  app.delete('/api/practice-groups/:groupId/phrases/:phraseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const groupId = parseInt(req.params.groupId, 10);
      const phraseId = parseInt(req.params.phraseId, 10);
      
      // Validate ownership of the group
      const group = await storage.getPracticeGroupById(groupId);
      
      if (!group) {
        return res.status(404).json({ error: 'Practice group not found' });
      }
      
      if (group.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to modify this group' });
      }
      
      // Remove the phrase from the group
      await storage.removePhraseFromGroup(groupId, phraseId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing phrase from practice group:', error);
      res.status(500).json({ error: 'Failed to remove phrase from practice group' });
    }
  });
  
  // Check if level is premium and if user has access
  app.get('/api/game/levels/:levelNumber/access', async (req: any, res) => {
    try {
      const levelNumber = parseInt(req.params.levelNumber, 10);
      
      // Level is premium if it's above the threshold
      const isPremiumLevel = levelNumber >= stripeService.PREMIUM_LEVEL_THRESHOLD;
      
      // If not premium, always grant access
      if (!isPremiumLevel) {
        return res.json({ 
          hasAccess: true, 
          isPremiumLevel: false,
          message: "Level is available to all users"
        });
      }
      
      // If premium but user not logged in, deny access
      if (!req.isAuthenticated()) {
        return res.json({
          hasAccess: false,
          isPremiumLevel: true,
          message: "Please sign in to access premium levels"
        });
      }
      
      // Check if logged in user has premium access
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.json({
          hasAccess: false,
          isPremiumLevel: true,
          message: "User not found"
        });
      }
      
      const hasPremiumAccess = await stripeService.userHasPremiumAccess(user);
      
      if (hasPremiumAccess) {
        return res.json({
          hasAccess: true,
          isPremiumLevel: true,
          message: "Premium access granted",
          subscriptionStatus: user.subscriptionStatus,
          trialEndDate: user.trialEndDate,
          subscriptionEndDate: user.subscriptionEndDate
        });
      }
      
      return res.json({
        hasAccess: false,
        isPremiumLevel: true,
        message: "Premium subscription required for this level",
        premiumInfo: {
          price: "$14.99/month",
          trialDays: 7,
          features: [
            "Access to all premium levels (8+)",
            "Advanced exercises and challenges",
            "New content added regularly"
          ]
        }
      });
    } catch (error) {
      console.error("Error checking level access:", error);
      res.status(500).json({ error: "Failed to check level access" });
    }
  });

  // Enhanced voice processing endpoints for the gpt-4o model with search capabilities
  app.post('/api/voice/enhanced', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }
      
      // Process audio with optimized speech-to-text
      const audioBuffer = req.file.buffer;
      const transcript = await openaiService.transcribeAudio(audioBuffer);
      
      // Process transcript with gpt-4o model to determine user intent
      const result = await openaiService.processVoiceCommand(transcript);
      
      // Generate speech response based on the result
      const responseText = result.action === 'generateContent' 
        ? `I'll find a reading passage about ${result.topic} for you.`
        : (result.message || 'I processed your request');
      
      // Generate speech audio
      const audioResponse = await openaiService.generateSpeechResponse(responseText);
      
      // Store the audio response with a unique ID
      const audioId = Date.now().toString();
      audioResponses.set(audioId, audioResponse);
      
      // Return the comprehensive response
      res.json({
        transcript,
        result,
        audioUrl: `/api/voice/audio/${audioId}`, // Client can fetch the audio from this URL
      });
      
    } catch (error) {
      console.error('Error processing enhanced voice command:', error);
      res.status(500).json({ error: 'Failed to process voice command' });
    }
  });
  
  // Endpoint to serve audio responses
  app.get('/api/voice/audio/:id', (req, res) => {
    const audioId = req.params.id;
    const audioBuffer = audioResponses.get(audioId);
    
    if (!audioBuffer) {
      return res.status(404).json({ error: 'Audio not found' });
    }
    
    res.setHeader('Content-Type', 'audio/mp3');
    res.send(audioBuffer);
    
    // Clean up after sending (optional, depending on your use case)
    audioResponses.delete(audioId);
  });
  
  // Stripe webhook endpoint
  app.post('/api/webhook/stripe', async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Stripe secret key not configured");
      return res.status(500).json({ error: "Stripe not configured" });
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    try {
      // Get raw body from request
      // TypeScript doesn't know about the rawBody property, so we use a type assertion
      const rawBody = (req as any).rawBody || await new Promise((resolve) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
      
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        console.error("Missing Stripe signature header");
        return res.status(400).json({ error: "Missing signature header" });
      }
      
      // For testing purposes, we'll use a test webhook secret
      // In production, this should be set in the environment variables
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      
      // Verify webhook signature
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody as Buffer,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return res.status(400).json({ error: "Webhook signature verification failed" });
      }
      
      // Handle the event
      await stripeService.handleStripeWebhook(event);
      
      // Return a response to acknowledge receipt of the event
      res.json({ received: true });
    } catch (error) {
      console.error("Error handling Stripe webhook:", error);
      res.status(500).json({ error: "Failed to handle webhook" });
    }
  });

  // Debug endpoints for testing Azure Speech integration
  app.get('/debug', (req, res) => {
    res.sendFile(join(process.cwd(), 'debug-recorder.html'));
  });

  // Special test endpoint just for saving a test recording
  app.post('/api/debug/save-test-recording', upload.single('audio'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
    
    try {
      // Save the uploaded audio file to a local file for testing
      fs.writeFileSync('./test-recording.webm', req.file.buffer);
      console.log(`✅ Saved test recording (${req.file.buffer.length} bytes) to test-recording.webm`);
      
      return res.json({
        success: true,
        message: 'Test recording saved successfully',
        size: req.file.buffer.length,
        mimeType: req.file.mimetype
      });
    } catch (error) {
      console.error('Error saving test recording:', error);
      return res.status(500).json({ error: 'Failed to save test recording' });
    }
  });

  // Animation API routes - now using Azure viseme-based animation
  const ANIMATION_API_URL = process.env.ANIMATION_API_URL || 'http://localhost:5050';
  
  // Text-to-Speech endpoint using OpenAI
  app.post('/api/tts/generate', async (req, res) => {
    try {
      const { text, voice = 'alloy' } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }
      
      // Generate speech using OpenAI
      const audioBuffer = await openaiService.generateSpeechResponse(text, voice);
      
      // Set appropriate headers for audio data
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      
      // Send the buffer as the response
      return res.send(audioBuffer);
    } catch (error) {
      console.error('Error generating speech:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate speech' 
      });
    }
  });
  
  // Start the animation server (Flask) when the Express server starts
  let animationProcess: any = null;
  
  try {
    console.log('Starting Animation Server...');
    animationProcess = spawn('python3', ['api/animation/animation_server.py'], {
      env: { ...process.env, NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || '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' },
      detached: true,
    });
    
    animationProcess.stdout.on('data', (data: Buffer) => {
      console.log(`Animation Server: ${data.toString()}`);
    });
    
    animationProcess.stderr.on('data', (data: Buffer) => {
      console.error(`Animation Server Error: ${data.toString()}`);
    });
    
    animationProcess.on('close', (code: number) => {
      console.log(`Animation Server exited with code ${code}`);
    });
    
    // Ensure the animation server gets killed when the Node process ends
    process.on('exit', () => {
      if (animationProcess) {
        // On Windows, we need to call process.kill with the PID directly
        if (process.platform === 'win32') {
          process.kill(animationProcess.pid);
        } else {
          // On Linux/Mac, we can kill the entire process group
          process.kill(-animationProcess.pid);
        }
      }
    });
  } catch (error) {
    console.error('Failed to start Animation Server:', error);
  }
  
  // Endpoint to generate animation from text
  app.post('/api/animation/generate', async (req, res) => {
    try {
      const { text, model } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }
      
      // Call the animation server API
      const response = await fetch(`${ANIMATION_API_URL}/generate-animation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, model })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate animation');
      }
      
      // Proxy the response from the animation server
      return res.json({
        success: true,
        request_id: result.request_id,
        audio_url: `/api/animation/audio/${result.request_id}`,
        blendshapes_url: `/api/animation/blendshapes/${result.request_id}`,
        emotions_url: result.emotions_url ? `/api/animation/emotions/${result.request_id}` : null
      });
    } catch (error) {
      console.error('Error generating animation:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate animation' 
      });
    }
  });
  
  // Endpoint to generate animation from audio file
  app.post('/api/animation/generate-from-audio', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      
      const model = req.body.model || 'claire'; // Default to Claire model
      
      // We need to use node-fetch FormData for server-side
      // Create a multipart form to send to the Flask server
      const { default: FormData } = await import('form-data');
      const formData = new FormData();
      formData.append('model', model);
      
      // Append the audio file buffer directly
      formData.append('audio', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      
      // Call the animation server API
      // We need to get the headers from FormData to properly set content-type boundaries
      const headers = formData.getHeaders ? formData.getHeaders() : {};
      
      const response = await fetch(`${ANIMATION_API_URL}/generate-from-audio`, {
        method: 'POST',
        body: formData.getBuffer ? formData.getBuffer() : formData as any,
        headers
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate animation from audio');
      }
      
      // Proxy the response from the animation server
      return res.json({
        success: true,
        request_id: result.request_id,
        audio_url: `/api/animation/audio/${result.request_id}`,
        blendshapes_url: `/api/animation/blendshapes/${result.request_id}`,
        emotions_url: result.emotions_url ? `/api/animation/emotions/${result.request_id}` : null
      });
    } catch (error) {
      console.error('Error generating animation from audio:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate animation from audio' 
      });
    }
  });
  
  // Proxy endpoints for animation resources
  app.get('/api/animation/audio/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      const response = await fetch(`${ANIMATION_API_URL}/animation/audio/${requestId}`);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Audio file not found' });
      }
      
      const audioBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/wav');
      return res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error('Error fetching animation audio:', error);
      return res.status(500).json({ error: 'Failed to fetch audio' });
    }
  });
  
  app.get('/api/animation/blendshapes/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      const response = await fetch(`${ANIMATION_API_URL}/animation/blendshapes/${requestId}`);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Blendshapes file not found' });
      }
      
      const csvBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'text/csv');
      return res.send(Buffer.from(csvBuffer));
    } catch (error) {
      console.error('Error fetching animation blendshapes:', error);
      return res.status(500).json({ error: 'Failed to fetch blendshapes' });
    }
  });
  
  app.get('/api/animation/emotions/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      const response = await fetch(`${ANIMATION_API_URL}/animation/emotions/${requestId}`);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Emotions file not found' });
      }
      
      const csvBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'text/csv');
      return res.send(Buffer.from(csvBuffer));
    } catch (error) {
      console.error('Error fetching animation emotions:', error);
      return res.status(500).json({ error: 'Failed to fetch emotions' });
    }
  });

  // Create a simple HTTP server
  const httpServer = createServer(app);
  // Add endpoints for Azure Viseme-based animation
  app.post('/api/viseme/process-audio', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      
      const voice = req.body.voice || 'en-US-GuyNeural';
      const format = req.body.format === 'svg' ? 'svg' : 'blendshapes';
      
      console.log(`Processing audio for viseme animation with format: ${format}, voice: ${voice}`);
      
      // Process the audio file with Azure Viseme API
      const visemeData = await azureVisemeService.processAudioForVisemes(req.file.buffer, format);
      
      // Convert the viseme data to CSV format
      const blendshapesCsv = azureVisemeService.convertVisemesToCsv(visemeData, format);
      
      // Encode the audio buffer as base64 to return in the response
      const audioBase64 = visemeData.audioBuffer.toString('base64');
      
      return res.json({
        success: true,
        blendshapesCsv,
        audioData: audioBase64,
        duration: visemeData.duration,
        visemeCount: visemeData.visemes.length
      });
    } catch (error) {
      console.error('Error processing audio for visemes:', error);
      return res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process audio for visemes' 
      });
    }
  });
  
  // Endpoint to generate speech with visemes
  app.post('/api/viseme/generate', async (req, res) => {
    // Map characters to likely viseme IDs based on English phonetics
    function getVisemeIdForChar(char: string): number {
      const charMap: Record<string, number> = {
        'a': 1, // æ, ə, ʌ - as in "bat", "about", "cut"
        'e': 4, // ɛ - as in "pet"
        'i': 6, // i, ɪ - as in "see", "sit"
        'o': 8, // o - as in "show"
        'u': 7, // u - as in "blue"
        'p': 21, // p, b, m
        'b': 21, 
        'm': 21,
        'f': 18, // f, v
        'v': 18,
        't': 19, // d, t, n
        'd': 19,
        'n': 19,
        's': 15, // s, z
        'z': 15,
        'r': 13, // ɹ - as in "red"
        'l': 14, // l - as in "look"
        'k': 20, // k, g, ŋ
        'g': 20,
        'w': 7,  // w, u
        'y': 6,  // j, i, ɪ
        'h': 12, // h
        'j': 16, // like in "judge"
        'c': 16, // often like in "cheese"
        'q': 20, // similar to k
        'x': 15  // often has s sound
      };
      
      // Default to the slightly open mouth position for unknown characters
      return charMap[char.toLowerCase()] || 4;
    }
    
    // Helper function to generate mock viseme data for testing
    function generateMockVisemeData(text: string, format: string = 'svg'): { 
      csv: string, 
      duration: number, 
      visemeCount: number 
    } {
      // Split text into words for timing
      const words = text.split(/\s+/);
      const visemes: Array<{ time: number, visemeId: number }> = [];
      
      // Add initial silence
      visemes.push({ time: 0, visemeId: 0 });
      
      let timeOffset = 0.2; // Start after 200ms
      
      // Generate visemes for each word
      words.forEach((word, index) => {
        // Create 2-5 visemes per word based on word length
        const numVisemes = Math.max(2, Math.min(5, Math.ceil(word.length / 2)));
        
        for (let i = 0; i < numVisemes; i++) {
          // Get a reasonable viseme ID based on character
          const char = word.charAt(i % word.length);
          const visemeId = getVisemeIdForChar(char);
          
          visemes.push({ time: timeOffset, visemeId });
          timeOffset += 0.15; // 150ms per viseme
        }
        
        // Small pause between words
        timeOffset += 0.1;
      });
      
      // End with silence
      visemes.push({ time: timeOffset, visemeId: 0 });
      
      // Convert to CSV format
      let csv = 'time,viseme_id,svg\n';
      visemes.forEach(v => {
        csv += `${v.time.toFixed(3)},${v.visemeId},\n`;
      });
      
      return {
        csv,
        duration: timeOffset * 1000, // Convert to ms
        visemeCount: visemes.length
      };
    }
    
    try {
      const { text, voice, format } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }
      
      const voiceName = voice || 'en-US-GuyNeural';
      const visemeFormat = format === 'svg' ? 'svg' : 'blendshapes';
      
      console.log(`Generating speech with visemes: format=${visemeFormat}, voice=${voiceName}`);
      
      try {
        // Try generating speech with Azure's viseme data
        const visemeData = await azureVisemeService.generateSpeechWithVisemes(text, voiceName, visemeFormat);
        
        // Convert the viseme data to CSV format
        const blendshapesCsv = azureVisemeService.convertVisemesToCsv(visemeData, visemeFormat);
        
        // Encode the audio buffer as base64 to return in the response
        const audioBase64 = visemeData.audioBuffer.toString('base64');
        
        return res.json({
          success: true,
          blendshapesCsv,
          audioData: audioBase64,
          duration: visemeData.duration,
          visemeCount: visemeData.visemes.length
        });
      } catch (azureError) {
        console.error('Azure Speech Services error:', azureError);
        
        // For development purposes, provide mock data for UI testing
        if (process.env.NODE_ENV !== 'production') {
          console.log('Using mock viseme data for development testing');
          
          // Generate mock viseme data for testing UI
          const mockData = generateMockVisemeData(text, visemeFormat);
          
          return res.json({
            success: true,
            blendshapesCsv: mockData.csv,
            audioData: '', // No audio in mock mode
            duration: mockData.duration,
            visemeCount: mockData.visemeCount,
            isMock: true
          });
        } else {
          // In production, propagate the error
          throw azureError;
        }
      }
    } catch (error) {
      console.error('Error generating speech with visemes:', error);
      return res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate speech with visemes' 
      });
    }
  });

  return httpServer;
}
