import { createClient } from '@supabase/supabase-js';

// Define the Supabase URL and anon key directly in the client
const SUPABASE_URL = 'https://hehogfyncmkakwxrgocj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaG9nZnluY21rYWt3eHJnb2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njg2NDksImV4cCI6MjA2MjU0NDY0OX0.yR5n4YzA4sbr4GQejD_yT4mnPU6_Zwhs9twDvOu60Jk';

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
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return data.session;
}

// Helper to get the current user
export async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return data.user;
}

// Get auth token for API requests
export async function getAuthToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token || null;
}

// Add authorization header to fetch requests
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return token 
    ? { Authorization: `Bearer ${token}` }
    : {};
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