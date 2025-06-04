import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from React App environment variables
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://hehogfyncmkakwxrgocj.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaG9nZnluY21rYWt3eHJnb2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njg2NDksImV4cCI6MjA2MjU0NDY0OX0.yR5n4YzA4sbr4GQejD_yT4mnPU6_Zwhs9twDvOu60Jk';

// Create the Supabase client with additional options
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});