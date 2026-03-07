import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function initSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth disabled',
    );
    // Return a dummy client that won't crash but won't do anything useful.
    // createClient requires a valid URL shape, so use a placeholder.
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = initSupabase();
export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
