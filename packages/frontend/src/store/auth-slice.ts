import type { StateCreator } from 'zustand';
import type { AuthSlice, AppStore } from '@maquetto/api-types';
import { supabase } from '../lib/supabase';

export const createAuthSlice: StateCreator<AppStore, [], [], AuthSlice> = (set, get) => ({
  authUser: null,
  authLoading: true,
  providerToken: null,

  setAuthUser: (authUser) => {
    set({ authUser });
  },

  setAuthLoading: (authLoading) => {
    set({ authLoading });
  },

  setProviderToken: (providerToken) => {
    set({ providerToken });
    // Auto-configure Gemini when we get a Google provider token
    if (providerToken) {
      const user = get().authUser;
      if (user?.provider === 'google') {
        console.log('[Auth] Auto-configuring Gemini with Google provider token');
        get().setAIProvider({ type: 'google', credential: providerToken });
      }
    }
  },

  signOut: async () => {
    console.log('[Auth] Signing out');
    await supabase.auth.signOut();
    set({ authUser: null, providerToken: null });
    // Clear AI provider if it was using the Google token
    const provider = get().aiProvider;
    if (provider.type === 'google') {
      get().setAIProvider({ type: 'none' });
    }
  },
});
