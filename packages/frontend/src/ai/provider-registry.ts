import type { AIProviderConfig } from '@maquetto/api-types';
import { createGoogleTransport } from './transports/google-transport';
import { createAnthropicTransport } from './transports/anthropic-transport';
import { CAD_SYSTEM_PROMPT } from './system-prompt';

/**
 * Creates a ChatTransport for the given AI provider configuration.
 * Returns null if no provider is configured.
 */
export function createTransport(config: AIProviderConfig) {
  if (config.type === 'none' || !config.credential) {
    return null;
  }

  switch (config.type) {
    case 'google':
      return createGoogleTransport(config.credential, CAD_SYSTEM_PROMPT);
    case 'anthropic':
      return createAnthropicTransport(config.credential, CAD_SYSTEM_PROMPT);
    default:
      return null;
  }
}
