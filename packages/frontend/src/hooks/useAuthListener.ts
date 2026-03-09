import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import type { AuthUser } from '@maquetto/api-types';
import type { Session } from '@supabase/supabase-js';

function extractAuthUser(session: Session): AuthUser {
  const user = session.user;
  const provider = (user.app_metadata.provider as string) === 'github' ? 'github' : 'google';
  return {
    id: user.id,
    email: user.email ?? null,
    name: (user.user_metadata.full_name as string) ?? (user.user_metadata.name as string) ?? null,
    avatarUrl: (user.user_metadata.avatar_url as string) ?? null,
    provider,
  };
}

interface OAuthResult {
  type: 'oauth-result';
  access_token?: string;
  refresh_token?: string;
  provider_token?: string;
  provider_refresh_token?: string;
  code?: string;
}

const PENDING_GOOGLE_AI_KEY = 'maquetto:pending-google-ai';

/**
 * Signal that the next Google OAuth sign-in should auto-configure Google AI.
 * Called from the UI before opening the OAuth popup.
 */
export function setPendingGoogleAI() {
  localStorage.setItem(PENDING_GOOGLE_AI_KEY, 'true');
}

/**
 * Auto-configure the AI provider if a pending Google AI flag is set
 * and we received a provider_token from the OAuth flow.
 */
function maybeAutoConfigureAI(providerToken: string | null) {
  if (!localStorage.getItem(PENDING_GOOGLE_AI_KEY)) return;
  if (!providerToken) {
    console.warn('[Auth] Pending Google AI flag set but no provider_token received');
    return;
  }
  localStorage.removeItem(PENDING_GOOGLE_AI_KEY);
  console.log('[Auth] Auto-configuring Google AI provider from OAuth');
  useAppStore.getState().setAIProvider({ type: 'google-oauth', credential: providerToken });
}

/**
 * Process OAuth result from popup (implicit tokens or PKCE code).
 */
async function handleOAuthResult(result: OAuthResult) {
  const { setAuthUser, setAuthLoading, setProviderToken, setProviderRefreshToken } = useAppStore.getState();

  if (result.access_token && result.refresh_token) {
    // Implicit flow — set session directly from tokens
    console.log('[Auth] Setting session from popup tokens...');
    const { data, error } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
    if (error) {
      console.error('[Auth] setSession failed:', error);
      return;
    }
    if (data.session) {
      const token = result.provider_token ?? data.session.provider_token ?? null;
      setProviderToken(token);
      maybeAutoConfigureAI(token);
      setAuthUser(extractAuthUser(data.session));
      // Capture provider refresh token for Google AI OAuth
      if (result.provider_refresh_token) {
        console.log('[Auth] Storing provider refresh token');
        setProviderRefreshToken(result.provider_refresh_token);
      }
    }
    setAuthLoading(false);
  } else if (result.code) {
    // PKCE flow — exchange code for session
    console.log('[Auth] Exchanging OAuth code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(result.code);
    if (error) {
      console.error('[Auth] Code exchange failed:', error);
      return;
    }
    if (data.session) {
      const token = data.session.provider_token ?? null;
      setProviderToken(token);
      maybeAutoConfigureAI(token);
      setAuthUser(extractAuthUser(data.session));
      if (data.session.provider_refresh_token) {
        console.log('[Auth] Storing provider refresh token (PKCE)');
        setProviderRefreshToken(data.session.provider_refresh_token);
      }
    }
    setAuthLoading(false);
  }
}

/**
 * Listens for Supabase auth state changes and OAuth popup results.
 * Call once at app root.
 */
export function useAuthListener() {
  useEffect(() => {
    const { setAuthUser, setAuthLoading, setProviderToken, setProviderRefreshToken } = useAppStore.getState();
    let exchanging = false;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('[Auth] Existing session found');
        setAuthUser(extractAuthUser(session));
        setProviderToken(session.provider_token ?? null);
        if (session.provider_refresh_token) {
          setProviderRefreshToken(session.provider_refresh_token);
        }
        // If we have a Google provider token but aiProvider is 'none',
        // the initial config was lost — recover it
        if (session.provider_token && useAppStore.getState().aiProvider.type === 'none') {
          const userProvider = (session.user.app_metadata.provider as string);
          if (userProvider === 'google') {
            console.log('[Auth] Recovering Google AI provider from session');
            useAppStore.getState().setAIProvider({ type: 'google-oauth', credential: session.provider_token });
          }
        }
      }
      setAuthLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[Auth] State change: ${event}`);
        if (session) {
          setAuthUser(extractAuthUser(session));
          if (session.provider_token) {
            setProviderToken(session.provider_token);
            // Fallback: if handleOAuthResult missed the provider_token
            // (e.g. PKCE flow), auto-configure here when the pending flag is set
            maybeAutoConfigureAI(session.provider_token);
          }
          if (session.provider_refresh_token) {
            setProviderRefreshToken(session.provider_refresh_token);
          }
        } else {
          setAuthUser(null);
          setProviderToken(null);
        }
        setAuthLoading(false);
      },
    );

    // Listen for postMessage from OAuth popup (preferred — tokens never touch storage)
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'oauth-result') return;
      if (exchanging) return;
      exchanging = true;
      handleOAuthResult(event.data as OAuthResult).finally(() => { exchanging = false; });
    }
    window.addEventListener('message', onMessage);

    // Fallback: listen for localStorage changes from redirect flow
    function onStorage(event: StorageEvent) {
      if (event.key !== 'oauth-result' || !event.newValue) return;
      if (exchanging) return;
      exchanging = true;
      localStorage.removeItem('oauth-result');
      try {
        const result = JSON.parse(event.newValue) as OAuthResult;
        handleOAuthResult(result).finally(() => { exchanging = false; });
      } catch {
        exchanging = false;
      }
    }
    window.addEventListener('storage', onStorage);

    // Also poll localStorage as fallback (storage event can be unreliable)
    const pollInterval = setInterval(() => {
      const stored = localStorage.getItem('oauth-result');
      if (stored && !exchanging) {
        exchanging = true;
        localStorage.removeItem('oauth-result');
        try {
          const result = JSON.parse(stored) as OAuthResult;
          handleOAuthResult(result).finally(() => { exchanging = false; });
        } catch {
          exchanging = false;
        }
      }
    }, 500);

    // Handle redirect fallback (tokens in URL hash if popup was blocked)
    if (window.location.hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setAuthUser(extractAuthUser(session));
          setProviderToken(session.provider_token ?? null);
          if (session.provider_refresh_token) {
            setProviderRefreshToken(session.provider_refresh_token);
          }
        }
        // Strip tokens from URL
        history.replaceState(null, '', window.location.pathname);
        setAuthLoading(false);
      });
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
      clearInterval(pollInterval);
    };
  }, []);
}
