import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import OpenAI from "openai";
import fs from 'fs';
import { log } from "./vite";
import { ReadingContent } from "@shared/schema";
import { generateReadingContent, generateSampleContent } from "./openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development",
});

// Store active sessions and their associated data
const activeSessions = new Map<string, {
  socket: WebSocket,
  openaiStream?: any,
  buffer: Buffer[]
}>();

// Generate a unique session ID
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Handle realtime session creation
export async function createRealtimeSession(): Promise<string> {
  const sessionId = generateSessionId();
  activeSessions.set(sessionId, {
    socket: null as any, // Will be set when the client connects
    buffer: []
  });
  
  // Clean up session after 5 minutes of inactivity
  setTimeout(() => {
    if (activeSessions.has(sessionId)) {
      const session = activeSessions.get(sessionId);
      if (session?.socket && session.socket.readyState === WebSocket.OPEN) {
        session.socket.close();
      }
      activeSessions.delete(sessionId);
    }
  }, 300000);
  
  return sessionId;
}

// Set up WebSocket connection for realtime session
export function setupRealtimeWebsocket(ws: WebSocket, req: IncomingMessage) {
  // Extract session ID from URL path
  const url = req.url || '';
  const sessionId = url.split('/').pop();
  
  if (!sessionId || !activeSessions.has(sessionId)) {
    ws.close(1008, 'Invalid session ID');
    return;
  }
  
  const session = activeSessions.get(sessionId)!;
  session.socket = ws;
  
  // Set up handlers
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle audio data
      if (data.type === 'audio') {
        // Decode base64 audio data
        const audioBuffer = Buffer.from(data.content, 'base64');
        session.buffer.push(audioBuffer);
        
        // Process audio with OpenAI
        await processAudioWithRealtimeAPI(sessionId, audioBuffer);
      }
      
      // Handle stop command
      if (data.type === 'stop') {
        if (session.openaiStream) {
          try {
            // Close the OpenAI stream if it exists
            await session.openaiStream.controller.abort();
            session.openaiStream = undefined;
          } catch (error) {
            log('Error closing OpenAI stream: ' + error, 'realtime');
          }
        }
      }
    } catch (error) {
      log('Error processing WebSocket message: ' + error, 'realtime');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error processing message'
      }));
    }
  });
  
  ws.on('close', () => {
    log(`WebSocket closed for session ${sessionId}`, 'realtime');
    if (session.openaiStream) {
      try {
        session.openaiStream.controller.abort();
      } catch (error) {
        // Ignore errors when closing the stream
      }
    }
    activeSessions.delete(sessionId);
  });
  
  // Send confirmation that connection is established
  ws.send(JSON.stringify({
    type: 'status',
    status: 'connected'
  }));
}

// Process audio with OpenAI's realtime API
async function processAudioWithRealtimeAPI(sessionId: string, audioChunk: Buffer) {
  const session = activeSessions.get(sessionId);
  if (!session || !session.socket) return;
  
  try {
    // Initialize or reuse stream
    if (!session.openaiStream) {
      // Create a new stream with the realtime API
      const controller = new AbortController();
      
      // Call OpenAI's speech API
      const speechData = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: "Hello, I'm Obla, your voice assistant for reading practice. How can I help you today?",
      });
      
      // Using a controller for handling request cancellation
      // Will be enhanced when the OpenAI Realtime API is fully available
      
      // Store a temporary file for OpenAI API
      const tempFilePath = `/tmp/audio-${Date.now()}.webm`;
      fs.writeFileSync(tempFilePath, audioChunk);
      
      // Create a readable stream from the file
      const audioFileStream = fs.createReadStream(tempFilePath);
      
      // Parse and process the audio
      const transcription = await openai.audio.transcriptions.create({
        file: audioFileStream,
        model: "whisper-1"
      });
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);
      
      session.openaiStream = { controller };
      
      // Send the transcript to the client
      session.socket.send(JSON.stringify({
        type: 'text',
        content: transcription.text
      }));
      
      // Process the transcript with GPT-4
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI voice assistant named Obla, designed to help people practice their speech.
              with reading practice and pronunciation. Parse the user's request and respond in JSON format.
              
              If the user is asking for a reading passage, respond with:
              {"action": "generateContent", "topic": "requested topic", "parameters": {"difficulty": "easy"}}
              
              For other requests, respond with:
              {"action": "respond", "message": "your helpful response"}
              
              Be compassionate, patient, and encouraging, as users may have speech difficulties.`
          },
          {
            role: "user",
            content: transcription.text
          }
        ],
        response_format: { type: "json_object" }
      });
      
      try {
        // Check for null content and provide a default
        const content = completion.choices[0].message.content || '{"action":"respond","message":"I didn\'t understand that. Could you please try again?"}';
        const responseContent = JSON.parse(content);
        
        // Send the action to the client
        session.socket.send(JSON.stringify({
          type: 'action',
          content: responseContent
        }));
        
        // If it's a content generation request, handle it
        if (responseContent.action === 'generateContent' && responseContent.topic) {
          handleContentGeneration(sessionId, responseContent.topic, responseContent.parameters?.difficulty || 'easy');
        }
        
        // Generate speech response
        const speechResponse = responseContent.action === 'respond' ? responseContent.message : 
          `I'll find a reading passage about ${responseContent.topic} for you.`;
          
        const speechData = await openai.audio.speech.create({
          model: "tts-1",
          voice: "nova",
          input: speechResponse
        });
        
        // Convert to Buffer and send
        const buffer = Buffer.from(await speechData.arrayBuffer());
        session.socket.send(JSON.stringify({
          type: 'audio',
          audioData: buffer.toString('base64')
        }));
      } catch (error) {
        console.error('Error processing completion:', error);
      }
    }
    
    // In the future, we'll implement real-time audio processing
    // For now, we're processing each audio chunk separately
    
  } catch (error) {
    log('Error processing audio with realtime API: ' + error, 'realtime');
    session.socket.send(JSON.stringify({
      type: 'error',
      message: 'Error processing audio'
    }));
    
    // Reset the stream on error
    if (session.openaiStream) {
      try {
        await session.openaiStream.controller.abort();
      } catch (e) {
        // Ignore errors when aborting
      }
      session.openaiStream = undefined;
    }
  }
}

// Handle content generation requests
async function handleContentGeneration(sessionId: string, topic: string, difficulty: string = 'easy') {
  const session = activeSessions.get(sessionId);
  if (!session || !session.socket) return;
  
  try {
    // Generate content using existing function
    const content = await generateReadingContent(topic, difficulty);
    
    // Send the generated content to the client
    session.socket.send(JSON.stringify({
      type: 'content',
      content
    }));
    
  } catch (error) {
    log('Error generating content: ' + error, 'realtime');
    session.socket.send(JSON.stringify({
      type: 'error',
      message: 'Error generating content'
    }));
  }
}