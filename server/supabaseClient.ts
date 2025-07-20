import { createClient } from '@supabase/supabase-js';
import * as schema from '../shared/schema';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL from env:', supabaseUrl);
console.log('Supabase Anon Key from env (first few chars):', supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'not set');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or anonymous key');
}

export const supabase = createClient<schema.User>(supabaseUrl, supabaseAnonKey);
