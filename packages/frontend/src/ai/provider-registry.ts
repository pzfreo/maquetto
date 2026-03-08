import type { AIProviderConfig } from '@maquetto/api-types';
import { createGoogleTransport } from './transports/google-transport';
import { createAnthropicTransport } from './transports/anthropic-transport';
import { CAD_SYSTEM_PROMPT } from './system-prompt';
import type { CompileFn } from './tools/test-code-tool';

/**
 * Creates a ChatTransport for the given AI provider configuration.
 * Returns null if no provider is configured.
 */
export function createTransport(
  config: AIProviderConfig,
  compileFn: CompileFn,
  customSystemPrompt?: string | null,
) {
  if (config.type === 'none' || !config.credential) {
    console.log('[Provider] No AI provider configured');
    return null;
  }

  const systemPrompt = customSystemPrompt || CAD_SYSTEM_PROMPT;
  console.log(`[Provider] Creating transport for: ${config.type}${customSystemPrompt ? ' (custom prompt)' : ''}`);
  switch (config.type) {
    case 'google':
      return createGoogleTransport(config.credential, systemPrompt, compileFn, config.modelId);
    case 'anthropic':
      return createAnthropicTransport(config.credential, systemPrompt, compileFn, config.modelId);
    default:
      console.warn(`[Provider] Unknown provider type: ${config.type}`);
      return null;
  }
}
