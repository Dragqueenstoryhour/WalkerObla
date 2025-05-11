import { createClient } from '@supabase/supabase-js';

// Define the Supabase URL and anon key directly in the client
const SUPABASE_URL = 'https://hehogfyncmkakwxrgocj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaG9nZnluY21rYWt3eHJnb2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njg2NDksImV4cCI6MjA2MjU0NDY0OX0.yR5n4YzA4sbr4GQejD_yT4mnPU6_Zwhs9twDvOu60Jk';

// Create Supabase client
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'supabase-auth-token',
    detectSessionInUrl: true
  }
});

// Export a function to get the client (for backward compatibility)
export async function getSupabaseClient() {
  return supabaseClient;
}