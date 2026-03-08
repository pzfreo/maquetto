import type { StateCreator } from 'zustand';
import type { AuthSlice, AppStore } from '@maquetto/api-types';
import { supabase } from '../lib/supabase';

const REFRESH_TOKEN_KEY = 'maquetto:provider-refresh-token';

function loadProviderRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export const createAuthSlice: StateCreator<AppStore, [], [], AuthSlice> = (set, get) => ({
  authUser: null,
  authLoading: true,
  providerToken: null,
  providerRefreshToken: loadProviderRefreshToken(),

  setAuthUser: (authUser) => {
    set({ authUser });
  },

  setAuthLoading: (authLoading) => {
    set({ authLoading });
  },

  setProviderToken: (providerToken) => {
    set({ providerToken });
  },

  setProviderRefreshToken: (providerRefreshToken) => {
    if (providerRefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, providerRefreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    set({ providerRefreshToken });
  },

  signOut: async () => {
    console.log('[Auth] Signing out');
    await supabase.auth.signOut();
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ authUser: null, providerToken: null, providerRefreshToken: null });
  },
});
