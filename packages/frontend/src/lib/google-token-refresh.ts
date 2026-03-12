/**
 * Refresh a Google OAuth access token using a refresh token.
 *
 * Google's token endpoint requires client_secret for "Web application"
 * OAuth clients. For browser SPAs the secret is not truly confidential
 * (it's in the JS bundle), but Google requires it anyway.
 * Requires VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET to be set.
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
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string | undefined;
  if (!clientId) {
    console.warn('[TokenRefresh] VITE_GOOGLE_CLIENT_ID not set — cannot refresh token');
    return null;
  }

  try {
    const params: Record<string, string> = {
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };
    if (clientSecret) {
      params.client_secret = clientSecret;
    }

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
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
