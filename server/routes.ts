import type { Express, Request, Response, NextFunction } from "express";
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
import { setupAuth, isAuthenticated } from "./replitAuth";
import Stripe from "stripe";
import fs from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// Configure multer for file uploads (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  await setupAuth(app);

  // Basic health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Add API routes
  app.get('/api/auth/user', async (req, res) => {
    // Check if the user is authenticated
    const session = req.session as any;
    const userId = session?.userId;
    const username = session?.username;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
      // Get or create user from storage
      const user = await storage.getUserById(userId.toString());
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (err) {
      console.error('Error getting user:', err);
      res.status(500).json({ message: 'Error fetching user data' });
    }
  });

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

  // Generate viseme data from text for Azure animation
  app.post('/api/viseme/generate', async (req, res) => {
    try {
      const { text, voice, format = 'svg' } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }
      
      console.log(`Generating speech with visemes for: "${text}" using voice: ${voice}, format: ${format}`);
      
      // Use Azure to generate speech with viseme data
      const visemeData = await azureVisemeService.generateSpeechWithVisemes(text, voice, format);
      
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
      console.error('Error generating speech with visemes:', error);
      return res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate speech with visemes' 
      });
    }
  });
  
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

  // Create a simple HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}