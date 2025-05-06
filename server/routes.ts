import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import * as openaiService from "./openai";
import * as azureService from "./azure";
import * as realtimeService from "./realtime";
import * as stripeService from "./stripe";
import multer from 'multer';
import { z } from "zod";
import { insertReadingContentSchema, insertReadingSessionSchema, insertSharedPhraseCollectionSchema, insertUserSavedPhraseSchema } from "@shared/schema";
import WebSocket from "ws";
import { setupAuth, isAuthenticated } from "./replitAuth";
import Stripe from "stripe";
import fs from 'fs';
import { join } from 'path';

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
  
  // Set up authentication
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
        topic: z.string(),
        difficulty: z.enum(['easy', 'medium', 'hard']),
      });

      const { topic, difficulty } = schema.parse(req.body);
      const content = await openaiService.generateReadingContent(topic, difficulty);
      res.json(content);
    } catch (error) {
      console.error('Error generating content:', error);
      res.status(500).json({ error: 'Failed to generate content' });
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
      });

      const { topic } = schema.parse(req.body);
      
      // Use OpenAI to generate phrases related to the topic
      const response = await openaiService.generateTopicPhrases(topic);
      res.json({ phrases: response });
    } catch (error) {
      console.error('Error generating phrases:', error);
      res.status(500).json({ error: 'Failed to generate phrases' });
    }
  });

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
        text: z.string(),
      });

      const { contentId, text } = schema.parse(req.body);
      const audioBuffer = req.file.buffer;
      
      const assessmentResult = await azureService.assessPronunciation(audioBuffer, text);
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
        text: z.string(),
        voice: z.string().optional(),
      });

      const { text, voice } = schema.parse(req.body);
      const audioBuffer = await azureService.synthesizeSpeech(text, voice);
      
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
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
          text: z.string(),
          difficulty: z.string().optional(),
          phonetic: z.string().optional()
        }))
      });
      
      const { phrases } = schema.parse(req.body);
      
      // Generate a UUID for sharing
      const shareId = `share-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Get user ID if logged in
      let userId = null;
      if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.claims) {
        userId = req.user.claims.sub;
      }
      
      // Create the shared collection
      const sharedCollection = await storage.createSharedPhraseCollection({
        shareId,
        phrases,
        userId,
        name: `Shared phrases (${new Date().toLocaleDateString()})`
      });
      
      // Return a shareable URL
      const shareableUrl = `/new-phrases?shareId=${shareId}`;
      res.json({ shareableUrl, shareId });
    } catch (error) {
      console.error('Error sharing phrases:', error);
      res.status(500).json({ error: 'Failed to generate shareable link' });
    }
  });
  
  app.get('/api/share/:shareId', async (req, res) => {
    try {
      const shareId = req.params.shareId;
      const collection = await storage.getSharedPhraseCollection(shareId);
      
      if (!collection) {
        return res.status(404).json({ error: 'Shared phrase collection not found' });
      }
      
      res.json({ collection });
    } catch (error) {
      console.error('Error fetching shared phrase collection:', error);
      res.status(500).json({ error: 'Failed to fetch shared phrase collection' });
    }
  });
  
  // User saved phrases endpoints
  app.post('/api/phrases/save', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const savedPhrases = await storage.getUserSavedPhrases(userId);
      res.json({ savedPhrases });
    } catch (error) {
      console.error('Error fetching saved phrases:', error);
      res.status(500).json({ error: 'Failed to fetch saved phrases' });
    }
  });
  
  app.delete('/api/phrases/saved/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Create a simple HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
