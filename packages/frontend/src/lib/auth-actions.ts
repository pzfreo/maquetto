import { supabase } from './supabase';

export async function signInWithGoogle() {
  console.log('[Auth] Starting Google OAuth sign-in');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/generative-language',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) {
    console.error('[Auth] Google sign-in error:', error.message);
    throw error;
  }
}

export async function signInWithGitHub() {
  console.log('[Auth] Starting GitHub OAuth sign-in');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
  });
  if (error) {
    console.error('[Auth] GitHub sign-in error:', error.message);
    throw error;
  }
}
