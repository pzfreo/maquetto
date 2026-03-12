import { useEffect } from 'react';
import { useAppStore } from '../store';
import { validateCredential } from '../ai/validate-credential';

/**
 * Validates the AI credential on startup and whenever the provider changes.
 * Updates credentialStatus in the store so the UI can reflect it.
 */
export function useCredentialCheck() {
  const aiProvider = useAppStore((s) => s.aiProvider);
  const providerRefreshToken = useAppStore((s) => s.providerRefreshToken);
  const setCredentialStatus = useAppStore((s) => s.setCredentialStatus);

  useEffect(() => {
    if (aiProvider.type === 'none' || !aiProvider.credential) {
      setCredentialStatus('unchecked');
      return;
    }

    // For google-oauth with a refresh token, skip validation here —
    // useTokenRefresh manages the token lifecycle and sets credentialStatus
    // directly. Validating here would race with the refresh and flash errors.
    if (aiProvider.type === 'google-oauth' && providerRefreshToken) {
      return;
    }

    let cancelled = false;
    setCredentialStatus('checking');

    validateCredential(aiProvider).then((result) => {
      if (cancelled) return;
      if (result.valid) {
        console.log(`[CredentialCheck] ${aiProvider.type} credential is valid`);
        setCredentialStatus('valid');
      } else {
        console.warn(`[CredentialCheck] ${aiProvider.type} credential invalid: ${result.error}`);
        setCredentialStatus('invalid', result.error);
      }
    });

    return () => { cancelled = true; };
  }, [aiProvider, providerRefreshToken, setCredentialStatus]);
}
