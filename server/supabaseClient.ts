import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// For development purposes, we'll use a mock Supabase client with hardcoded values
// In production, these would come from actual Supabase URL and anon key
// Note: This assumes we are in development mode and allows us to proceed with the migration
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Create the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);