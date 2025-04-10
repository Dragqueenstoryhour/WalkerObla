import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import * as openaiService from "./openai";
import * as azureService from "./azure";
import * as realtimeService from "./realtime";
import multer from 'multer';
import { z } from "zod";
import { insertReadingContentSchema, insertReadingSessionSchema } from "@shared/schema";
import WebSocket from "ws";

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
    apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development",
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
      
      // Return the comprehensive response
      res.json({
        transcript,
        result,
        audioUrl: `/api/voice/audio/${Date.now()}`, // Client can fetch the audio from this URL
      });
      
    } catch (error) {
      console.error('Error processing enhanced voice command:', error);
      res.status(500).json({ error: 'Failed to process voice command' });
    }
  });
  
  // Create a simple HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
