import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import OpenAI from "openai";
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
      
      // Call OpenAI's realtime API
      const realtime = await openai.beta.realtime.voice({
        model: "gpt-4o-realtime-preview",
        stream: true,
        
        // System instructions for the voice agent
        instructions: `You are an AI voice assistant named ReadAssist, designed to help stroke recovery patients 
          with reading practice and pronunciation. You can generate reading materials, provide pronunciation feedback, 
          and guide users through reading exercises.
          
          You can perform these actions:
          1. Generate a reading passage on a specific topic when the user asks for one
          2. Answer questions about reading, pronunciation, or stroke recovery
          3. Provide encouragement and positive feedback
          
          When a user asks for a reading passage, you should immediately return a structured response with 
          action: "generateContent" and topic: "the requested topic".
          
          Sample structured response:
          {
            "action": "generateContent",
            "topic": "gardening",
            "parameters": {
              "difficulty": "easy"
            }
          }
          
          Be compassionate, patient, and encouraging, as users may have speech difficulties.`,
          
        signal: controller.signal,
      });
      
      session.openaiStream = { realtime, controller };
      
      // Handle the realtime stream
      for await (const message of realtime) {
        // Send the transcript if available
        if (message.type === 'message' && message.content.response.transcript) {
          session.socket.send(JSON.stringify({
            type: 'text',
            content: message.content.response.transcript
          }));
        }
        
        // Process speech output
        if (message.type === 'speech') {
          // Create URL for the audio
          const audioBlob = new Blob([message.content], { type: 'audio/mp3' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          session.socket.send(JSON.stringify({
            type: 'audio',
            audioUrl
          }));
        }
        
        // Process structured output for actions
        if (message.type === 'message' && message.content.response.message) {
          // Try to parse the message for structured data
          try {
            const messageText = message.content.response.message;
            
            // Look for potential JSON in the text
            const jsonMatch = messageText.match(/\\{.*?\\}/s);
            if (jsonMatch) {
              const jsonStr = jsonMatch[0];
              const parsedData = JSON.parse(jsonStr);
              
              // If we have action data, send it to the client
              if (parsedData.action) {
                session.socket.send(JSON.stringify({
                  type: 'action',
                  content: parsedData
                }));
                
                // If it's a content generation request, handle it
                if (parsedData.action === 'generateContent' && parsedData.topic) {
                  handleContentGeneration(sessionId, parsedData.topic, parsedData.parameters?.difficulty || 'easy');
                }
              }
            }
          } catch (error) {
            // Ignore parsing errors, it might not contain valid JSON
          }
        }
      }
    }
    
    // Send the audio chunk to the realtime API
    await session.openaiStream.realtime.sendAudio(audioChunk);
    
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