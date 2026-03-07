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
  },

  signOut: async () => {
    console.log('[Auth] Signing out');
    await supabase.auth.signOut();
    set({ authUser: null, providerToken: null });
  },
});
