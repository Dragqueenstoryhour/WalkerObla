import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { validationErrorMiddleware } from './utils/errorHandlers';
import compression from 'compression';
import { setupVite, serveStatic, log } from "./vite";
import authRoutes from './routes/authRoutes';
import { supabase } from './supabaseClient';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true // Allow all origins in production deployment
    : 'http://localhost:5000', // Allow only localhost in development
  credentials: true, // Allow cookies and authorization headers
  allowedHeaders: ['Content-Type', 'Authorization'], // Explicitly allow Authorization header
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      const MAX_LOG_LENGTH = 120;
      if (logLine.length > MAX_LOG_LENGTH) {
        logLine = logLine.slice(0, MAX_LOG_LENGTH - 1) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Health check endpoint for deployment
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/auth', authRoutes);

app.get('/test-supabase-auth', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      throw error;
    }
    res.send({ message: 'Supabase connection successful!', data });
  } catch (error: any) {
    res.status(500).send({ message: 'Supabase connection failed.', error: error.message });
  }
});

(async () => {
  const server = await registerRoutes(app);

  app.use(validationErrorMiddleware);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Enhanced error logging with request context
    console.error(`Error ${status} on ${req.method} ${req.path}:`, {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      body: req.method === 'POST' ? req.body : undefined
    });

    // Send appropriate error response
    res.status(status).json({ 
      message: "Internal Server Error",
      timestamp: new Date().toISOString()
    });
    
    // Never throw errors in production to prevent crashes
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable in production, fallback to 5000 for development
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
