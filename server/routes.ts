import type { Express } from "express";
import { createServer, type Server } from "http";


// Import modular routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import pronunciationRoutes from './routes/pronunciationRoutes';
import contentRoutes from './routes/contentRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import therapistRoutes from './routes/therapistRoutes';
import contactRoutes from './routes/contactRoutes';
import voiceRoutes from './routes/voiceRoutes';
import visemeRoutes from './routes/visemeRoutes';
import invitationRoutes from './routes/invitationRoutes';

export async function registerRoutes(app: Express): Promise<Server> {
  // Readiness check endpoint for deployment
  app.get('/ready', async (req, res) => {
    try {
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

  

  // Register modular routes
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/pronunciation', pronunciationRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/therapist', therapistRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/voice', voiceRoutes);
  app.use('/api/visemes', visemeRoutes);
  app.use('/api/invitation', invitationRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
