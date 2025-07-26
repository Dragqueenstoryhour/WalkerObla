import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_REACT_APP_SUPABASE_URL || import.meta.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || import.meta.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate that we have the required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables:', {
    SUPABASE_URL: !!SUPABASE_URL,
    SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY
  });
  throw new Error('Missing required Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with proper config for browser usage
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'supabase.auth.token',
    detectSessionInUrl: false // We'll handle this manually with auth-callback.html
  }
});

// Helper to get the current auth session
export async function getSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      // Handle specific error types gracefully
      if (error.name === 'AuthRetryableFetchError' && error.status === 0) {
        console.debug('Network error getting session (expected when offline):', error.status);
      } else {
        console.error('Error getting session:', error);
      }
      return null;
    }
    return data.session;
  } catch (error) {
    console.debug('Session retrieval failed:', error);
    return null;
  }
}

// Helper to get the current user
export async function getCurrentUser() {
  try {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
      // Handle specific error types gracefully
      if (error.name === 'AuthRetryableFetchError' && error.status === 0) {
        console.debug('Network error getting user (expected when offline):', error.status);
      } else {
        console.error('Error getting user:', error);
      }
      return null;
    }
    return data.user;
  } catch (error) {
    console.debug('User retrieval failed:', error);
    return null;
  }
}

// Get auth token for API requests
export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await getSession();
    return session?.access_token || null;
  } catch (error) {
    console.debug('Token retrieval failed:', error);
    return null;
  }
}

// Add authorization header to fetch requests
export async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const token = await getAuthToken();
    console.log('getAuthHeaders: Token available:', !!token);
    if (token) {
      console.log('getAuthHeaders: Token segments:', token.split('.').length);
      console.log('getAuthHeaders: Token first 50 chars:', token.substring(0, 50));
    }
    return token 
      ? { Authorization: `Bearer ${token}` }
      : {};
  } catch (error) {
    console.debug('Auth headers generation failed:', error);
    return {};
  }
}

// Setup auth state change listener for debugging
supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
});

// Initialize auth - check for hash params from OAuth redirect
export async function initializeAuth() {
  // Listen for OAuth callback message from popup window
  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin) return;
    
    if (event.data?.type === 'SUPABASE_AUTH_CALLBACK' && event.data?.hash) {
      try {
        // Process the hash
        const hashParams = new URLSearchParams(
          event.data.hash.substring(1) // Remove the # character
        );
        
        // Get auth parameters from hash
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');
        
        if (accessToken && refreshToken) {
          // Set the session from the hash params
          const { error } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Error setting session:', error);
          } else {
            console.log('Session set successfully from OAuth callback');
          }
        } else {
          console.error('Missing tokens in OAuth callback');
        }
      } catch (error) {
        console.error('Error processing OAuth callback:', error);
      }
    }
  });
  
  // Get existing session
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('Error getting initial session:', error);
  }
  return data.session;
}

// Export a function to get the client (for backward compatibility)
export function getSupabaseClient() {
  return supabaseClient;
}