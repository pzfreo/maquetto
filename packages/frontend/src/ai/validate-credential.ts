import type { AIProviderConfig } from '@maquetto/api-types';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an AI provider credential by making a lightweight API call.
 * - Google (BYOK): lists models with the API key
 * - Google (OAuth): lists models with the Bearer token
 * - Anthropic: lists models with the API key
 */
export async function validateCredential(config: AIProviderConfig): Promise<ValidationResult> {
  if (config.type === 'none' || !config.credential) {
    return { valid: false, error: 'No provider configured' };
  }

  try {
    switch (config.type) {
      case 'google':
        return await validateGoogle(config.credential, false);
      case 'google-oauth':
        return await validateGoogle(config.credential, true);
      case 'anthropic':
        return await validateAnthropic(config.credential);
      default:
        return { valid: false, error: `Unknown provider: ${config.type}` };
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[Validate] Credential check failed:`, message);
    return { valid: false, error: message };
  }
}

async function validateGoogle(credential: string, useOAuth: boolean): Promise<ValidationResult> {
  const url = useOAuth
    ? 'https://generativelanguage.googleapis.com/v1beta/models'
    : `https://generativelanguage.googleapis.com/v1beta/models?key=${credential}`;

  const headers: Record<string, string> = {};
  if (useOAuth) {
    headers['Authorization'] = `Bearer ${credential}`;
  }

  const response = await fetch(url, { headers });
  if (response.ok) {
    return { valid: true };
  }

  if (response.status === 401 || response.status === 403) {
    return { valid: false, error: useOAuth ? 'OAuth token expired or revoked' : 'Invalid API key' };
  }

  return { valid: false, error: `API returned ${response.status}` };
}

async function validateAnthropic(credential: string): Promise<ValidationResult> {
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': credential,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  });

  if (response.ok) {
    return { valid: true };
  }

  if (response.status === 401) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: false, error: `API returned ${response.status}` };
}
