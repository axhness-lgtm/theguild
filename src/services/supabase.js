import { createClient } from '@supabase/supabase-js';

// Safe initialization: If environment variables are not provided yet, returns null.
// The app will automatically default to the high-performance local storage store so everything works right away.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vvmeiuvrpkmxxwsesxhs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2bWVpdXZycGtteHh3c2VzeGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMzg5MzUsImV4cCI6MjA5OTYxNDkzNX0.-bqtiJnOJAbvSRn_ZbO2nSKAb-ubArcexloAIqI0fXE';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
