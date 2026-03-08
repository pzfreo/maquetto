import { supabase } from './supabase';

const CALLBACK_PATH = '/oauth-callback.html';

/**
 * Open OAuth in a popup to avoid reloading the page (and Pyodide).
 * The popup redirects to oauth-callback.html which sends tokens via postMessage.
 * Falls back to redirect if popup is blocked.
 */
async function signInWithPopup(
  provider: 'google' | 'github',
  extraOptions?: { scopes?: string; queryParams?: Record<string, string> },
) {
  console.log(`[Auth] Starting ${provider} OAuth sign-in (popup)`);

  const redirectTo = window.location.origin + CALLBACK_PATH;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...extraOptions,
    },
  });

  if (error) {
    console.error(`[Auth] ${provider} sign-in error:`, error.message);
    throw error;
  }

  if (!data?.url) {
    throw new Error('No OAuth URL returned');
  }

  // Clear any stale result
  localStorage.removeItem('oauth-result');

  // Open centered popup
  const width = 500;
  const height = 650;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const popup = window.open(
    data.url,
    'oauth-popup',
    `width=${width},height=${height},left=${left},top=${top},popup=yes`,
  );

  if (!popup) {
    // Popup blocked — fall back to full redirect
    console.warn('[Auth] Popup blocked, falling back to redirect');
    window.location.href = data.url;
  }
}

export async function signInWithGoogle() {
  return signInWithPopup('google');
}

/**
 * Sign in with Google AND request the Gemini API scope.
 * The provider_token returned can be used as a credential for the Google AI transport.
 */
export async function signInWithGoogleAI() {
  return signInWithPopup('google', {
    scopes: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/generative-language.tuning',
    queryParams: { access_type: 'offline', prompt: 'consent' },
  });
}

export async function signInWithGitHub() {
  return signInWithPopup('github');
}
