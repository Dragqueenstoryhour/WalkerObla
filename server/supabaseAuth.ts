import { Request, Response, NextFunction, Express, RequestHandler } from 'express';
import { supabase } from './supabaseClient';
import { Provider } from '@supabase/supabase-js';
import { storage } from './storage';

// List of available OAuth providers
export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
  FACEBOOK: 'facebook',
  TWITTER: 'twitter'
} as const;

export type OAuthProvider = typeof OAUTH_PROVIDERS[keyof typeof OAUTH_PROVIDERS];

/**
 * Verify a Supabase JWT token
 */
export async function verifyToken(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Error verifying token:', error.message);
      return null;
    }
    return data.user;
  } catch (error) {
    console.error('Error in token verification:', error);
    return null;
  }
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

/**
 * Session-based authentication middleware with JWT fallback
 */
export const authMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  // First check for session-based auth
  if ((req as any).session?.user) {
    (req as any).user = { id: (req as any).session.user.id };
    return next();
  }
  
  // Fallback to JWT token auth
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }
  
  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  // Attach the user to the request
  (req as any).user = user;
  next();
};

/**
 * Register auth-related routes
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Health check/configuration endpoint
  app.get('/api/auth/config', (req, res) => {
    res.json({
      providers: Object.values(OAUTH_PROVIDERS),
      redirectUrl: '/auth-callback.html',
    });
  });

  // Sign up endpoint
  app.post('/api/auth/signup', async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      if (data.user) {
        // Create user in our database
        await storage.upsertUser({
          id: data.user.id,
          username: email.split('@')[0],
          email,
          firstName: firstName || null,
          lastName: lastName || null
        });
        
        // Create session
        (req as any).session.user = { id: data.user.id };
      }
      
      res.json({ user: data.user, session: data.session });
    } catch (error: any) {
      console.error('Sign up error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  // Sign in endpoint
  app.post('/api/auth/signin', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      if (data.user) {
        // Ensure user exists in our database
        await storage.upsertUser({
          id: data.user.id,
          username: data.user.email?.split('@')[0] || `user_${data.user.id.substring(0, 8)}`,
          email: data.user.email || null,
          firstName: data.user.user_metadata?.first_name || null,
          lastName: data.user.user_metadata?.last_name || null
        });
        
        // Create session
        (req as any).session.user = { id: data.user.id };
      }
      
      res.json({ user: data.user, session: data.session });
    } catch (error: any) {
      console.error('Sign in error:', error);
      res.status(500).json({ error: 'Failed to sign in' });
    }
  });

  // Sign out endpoint
  app.post('/api/auth/signout', async (req: any, res) => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      // Destroy session
      if ((req as any).session) {
        (req as any).session.destroy();
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Sign out error:', error);
      res.status(500).json({ error: 'Failed to sign out' });
    }
  });

  // OAuth login endpoint
  app.post('/api/auth/oauth', async (req: any, res) => {
    try {
      const { provider } = req.body;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: `${req.get('origin')}/auth-callback.html`
        }
      });
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      res.json({ url: data.url });
    } catch (error: any) {
      console.error('OAuth error:', error);
      res.status(500).json({ error: 'Failed to start OAuth flow' });
    }
  });
  
  // User data endpoint (requires authentication)
  app.get('/api/auth/user', authMiddleware, async (req: any, res) => {
    try {
      // Get user data from storage based on auth ID
      const userId = req.user.id;
      let user = await storage.getUserById(userId);
      
      // If user doesn't exist in our database yet, create them
      if (!user) {
        user = await storage.createUser({
          id: userId,
          username: req.user.email ? req.user.email.split('@')[0] : `user_${userId.substring(0, 8)}`, 
          email: req.user.email,
          firstName: req.user.user_metadata?.first_name || null,
          lastName: req.user.user_metadata?.last_name || null,
          bio: req.user.user_metadata?.bio || null,
          profileImageUrl: req.user.user_metadata?.avatar_url || null
        });
      }
      
      // Return user data with progress statistics
      const savedPhrases = await storage.getUserSavedPhrases(userId);
      const practiceGroups = await storage.getPracticeGroups(userId);
      
      const userWithProgress = {
        ...user,
        progressStats: {
          savedWordsCount: savedPhrases.length,
          practiceGroupsCount: practiceGroups.length,
          joinedDate: user.createdAt
        }
      };
      
      res.json(userWithProgress);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });
  
  // User profile update endpoint (requires authentication)
  app.post('/api/auth/profile', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, bio } = req.body;
      
      // Update user profile in our database
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        bio
      });
      
      // Also update user metadata in Supabase
      await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          bio
        }
      });
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });
}

// For backward compatibility (used in routes.ts)
export const isAuthenticated = authMiddleware;