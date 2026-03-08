/**
 * Refresh a Google OAuth access token using a refresh token.
 *
 * For public OAuth clients (browser SPAs), Google's token endpoint
 * accepts refresh requests without a client_secret.
 * Requires VITE_GOOGLE_CLIENT_ID to be set.
 */

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface TokenError {
  error: string;
  error_description?: string;
}

export async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    console.warn('[TokenRefresh] VITE_GOOGLE_CLIENT_ID not set — cannot refresh token');
    return null;
  }

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as TokenError;
      console.error('[TokenRefresh] Failed:', errorData.error, errorData.error_description);
      return null;
    }

    const data = await response.json() as TokenResponse;
    console.log(`[TokenRefresh] Token refreshed, expires in ${data.expires_in}s`);
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (err) {
    console.error('[TokenRefresh] Network error:', err);
    return null;
  }
}
