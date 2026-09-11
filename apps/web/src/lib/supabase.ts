import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ykzjbxtjzxmpuwpuyvzr.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrempieHRqenhtcHV3cHV5dnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjA1NDQsImV4cCI6MjEwNDA5NjU0NH0.j7v8hmWSN8fcqSQa2pAh7_l8YQ8PUJn-kshuZfUwJQw';

/**
 * Public Supabase client using anon key.
 * Strictly adheres to Supabase security rules: service-role key is never exposed to the frontend.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
