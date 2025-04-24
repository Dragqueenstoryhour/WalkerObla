import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import * as openaiService from "./openai";
import * as azureService from "./azure";
import * as realtimeService from "./realtime";
import * as stripeService from "./stripe";
import multer from 'multer';
import { z } from "zod";
import { insertReadingContentSchema, insertReadingSessionSchema } from "@shared/schema";
import WebSocket from "ws";
import { setupAuth, isAuthenticated } from "./replitAuth";
import Stripe from "stripe";

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
        contentId: z.string().transform(Number),
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
      
      res.setHeader('Content-Type', 'audio/mp3');
      res.send(audioBuffer);
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
      const rawBody = req.rawBody || await new Promise((resolve) => {
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

  // Create a simple HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
