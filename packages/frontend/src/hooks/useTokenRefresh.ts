import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { refreshGoogleToken } from '../lib/google-token-refresh';

/** Refresh 5 minutes before expiry (Google tokens last 3600s) */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
// On page load we don't know when the token was issued, so refresh
// proactively after 5 minutes. If it's still valid, Google returns
// a new one cheaply. This avoids the case where a user reloads the
// page 50 minutes into the token's lifetime and then hits a 401.
const INITIAL_REFRESH_MS = 5 * 60 * 1000;

/**
 * Automatically refreshes the Google OAuth access token before it expires.
 * Only active when the AI provider is 'google-oauth' and a refresh token is available.
 */
export function useTokenRefresh() {
  const aiProvider = useAppStore((s) => s.aiProvider);
  const providerRefreshToken = useAppStore((s) => s.providerRefreshToken);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only run for google-oauth provider
    if (aiProvider.type !== 'google-oauth' || !providerRefreshToken) {
      return;
    }

    async function doRefresh() {
      const refreshToken = useAppStore.getState().providerRefreshToken;
      if (!refreshToken) return;

      console.log('[TokenRefresh] Refreshing Google OAuth token...');
      const result = await refreshGoogleToken(refreshToken);
      if (!result) {
        console.warn('[TokenRefresh] Refresh failed — token may expire');
        return;
      }

      // Update the AI provider credential with the new access token
      const current = useAppStore.getState().aiProvider;
      if (current.type === 'google-oauth') {
        useAppStore.getState().setAIProvider({
          ...current,
          credential: result.accessToken,
        });
        // Also update providerToken in auth state
        useAppStore.getState().setProviderToken(result.accessToken);
        console.log('[TokenRefresh] AI provider credential updated');
      }

      // Schedule the next refresh
      const nextRefreshMs = (result.expiresIn * 1000) - REFRESH_MARGIN_MS;
      scheduleRefresh(Math.max(nextRefreshMs, 60_000)); // minimum 1 minute
    }

    function scheduleRefresh(ms: number) {
      if (timerRef.current) clearTimeout(timerRef.current);
      console.log(`[TokenRefresh] Next refresh in ${Math.round(ms / 60_000)}min`);
      timerRef.current = setTimeout(() => void doRefresh(), ms);
    }

    // Schedule the first refresh aggressively — we don't know when
    // the token was issued, so refresh soon to avoid expired-token errors.
    scheduleRefresh(INITIAL_REFRESH_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [aiProvider.type, providerRefreshToken]);
}
