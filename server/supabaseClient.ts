import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// The Supabase URL should be the first part of the connection string up to ".supabase.co"
const getSupabaseUrl = (databaseUrl: string) => {
  try {
    // Extract hostname from connection string
    const url = new URL(databaseUrl);
    const hostnameParts = url.hostname.split('.');
    
    // If we have a valid supabase.co hostname
    if (hostnameParts.length >= 3 && hostnameParts[1] === 'supabase') {
      return `https://${hostnameParts[0]}.supabase.co`;
    }
    throw new Error('Could not extract Supabase URL from DATABASE_URL');
  } catch (error) {
    console.error('Error extracting Supabase URL:', error);
    throw new Error('Invalid DATABASE_URL format');
  }
};

// Extract the password from the connection string to use as the anon key
const getSupabaseAnonKey = (databaseUrl: string) => {
  try {
    const url = new URL(databaseUrl);
    // Extract password from connection string
    return url.password || '';
  } catch (error) {
    console.error('Error extracting Supabase anon key:', error);
    throw new Error('Invalid DATABASE_URL format');
  }
};

const supabaseUrl = getSupabaseUrl(process.env.DATABASE_URL);
const supabaseAnonKey = getSupabaseAnonKey(process.env.DATABASE_URL);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);