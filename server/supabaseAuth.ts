import { Request, Response, NextFunction, Express, RequestHandler } from 'express';
import { supabase } from './supabaseClient';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import { db } from './db';

// Set up session management
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'speakup-speech-therapy-app-supabase',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Function to update the user in our database from Supabase auth data
async function upsertUser(supabaseUser: any) {
  try {
    await storage.upsertUser({
      id: supabaseUser.id,
      username: supabaseUser.email ? supabaseUser.email.split('@')[0] : `user-${supabaseUser.id.substring(0, 8)}`,
      email: supabaseUser.email,
      firstName: supabaseUser.user_metadata?.first_name,
      lastName: supabaseUser.user_metadata?.last_name,
      bio: supabaseUser.user_metadata?.bio,
      profileImageUrl: supabaseUser.user_metadata?.avatar_url,
    });
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Sign up endpoint
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        await upsertUser(data.user);
        
        // Set the user in the session
        req.session.user = data.user;
        return res.json({ user: data.user });
      }
      
      return res.status(400).json({ error: 'Could not sign up user' });
    } catch (error: any) {
      console.error('Error signing up:', error);
      return res.status(500).json({ error: error.message || 'Authentication failed' });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        await upsertUser(data.user);
        
        // Set the user in the session
        req.session.user = data.user;
        return res.json({ user: data.user });
      }
      
      return res.status(400).json({ error: 'Could not log in user' });
    } catch (error: any) {
      console.error('Error logging in:', error);
      return res.status(500).json({ error: error.message || 'Authentication failed' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Failed to log out' });
      }
      
      res.json({ success: true });
    });
  });

  // Get current user endpoint
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Verify the session with Supabase
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      // Session is invalid, clear it
      req.session.destroy();
      return res.status(401).json({ error: 'Session expired or invalid' });
    }
    
    // Check if the user in session matches current authenticated user
    if (req.session.user.id !== data.user.id) {
      // User mismatch, clear session
      req.session.destroy();
      return res.status(401).json({ error: 'Session user mismatch' });
    }
    
    next();
  } catch (error) {
    console.error('Error validating authentication:', error);
    return res.status(500).json({ error: 'Authentication validation failed' });
  }
};