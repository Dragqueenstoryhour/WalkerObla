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
 * JWT authentication middleware
 */
export const authMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
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
      
      // Return user data
      res.json(user);
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