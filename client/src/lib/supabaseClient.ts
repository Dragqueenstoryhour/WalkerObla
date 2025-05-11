import { createClient } from '@supabase/supabase-js';

// Define the Supabase URL and anon key directly in the client
const SUPABASE_URL = 'https://hehogfyncmkakwxrgocj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaG9nZnluY21rYWt3eHJnb2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njg2NDksImV4cCI6MjA2MjU0NDY0OX0.yR5n4YzA4sbr4GQejD_yT4mnPU6_Zwhs9twDvOu60Jk';

// Create Supabase client with proper config for browser usage
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'supabase-auth-token',
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Setup auth state change listener
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    console.log('User signed in:', session.user.id);
    // Optionally store user data or update UI
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Clear any user data from the UI
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

// Export a function to get the client (for backward compatibility)
export async function getSupabaseClient() {
  return supabaseClient;
}