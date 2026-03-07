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
    name: user.user_metadata.full_name as string ?? user.user_metadata.name as string ?? null,
    avatarUrl: user.user_metadata.avatar_url as string ?? null,
    provider,
  };
}

/**
 * Listens for Supabase auth state changes and syncs to the Zustand store.
 * Call once at app root.
 */
export function useAuthListener() {
  useEffect(() => {
    const { setAuthUser, setAuthLoading, setProviderToken } = useAppStore.getState();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('[Auth] Existing session found');
        setAuthUser(extractAuthUser(session));
        setProviderToken(session.provider_token ?? null);
      }
      setAuthLoading(false);
    });

    // Listen for changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[Auth] State change: ${event}`);
        if (session) {
          setAuthUser(extractAuthUser(session));
          if (session.provider_token) {
            setProviderToken(session.provider_token);
          }
        } else {
          setAuthUser(null);
          setProviderToken(null);
        }
        setAuthLoading(false);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
