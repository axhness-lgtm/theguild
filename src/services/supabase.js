import { createClient } from '@supabase/supabase-js';

// Safe initialization: If environment variables are not provided yet, returns null.
// The app will automatically default to the high-performance local storage store so everything works right away.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
