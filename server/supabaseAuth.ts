import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and service role key from environment variables
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY)) {
  throw new Error('Missing required Supabase environment variables');
}

// Create Supabase client for server-side operations
const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function getUser(req) {
  if (!req.headers.authorization) {
    return null;
  }
  
  const token = req.headers.authorization.split(' ')[1];
  if (!token) {
    return null;
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function protect(req, res, next) {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }
    
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Attach user to request for route handlers
    req.user = { 
      claims: { 
        sub: user.id,
        email: user.email 
      }
    };
    
    next();
  } catch (error) {
    console.error('Protect middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
