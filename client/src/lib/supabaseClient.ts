import { createClient } from '@supabase/supabase-js';

// These values will be derived from our backend
async function getSupabaseConfig() {
  const response = await fetch('/api/auth/config');
  const data = await response.json();
  return data;
}

// Initialize supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

export async function initSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  try {
    const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
  }
}

// Export a function to get the client
export async function getSupabaseClient() {
  if (!supabaseClient) {
    return initSupabaseClient();
  }
  return supabaseClient;
}