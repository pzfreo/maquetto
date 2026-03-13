import { createAnthropic } from '@ai-sdk/anthropic';
import type { CompileFn } from '../tools/test-code-tool';
import { DataUrlSafeChatTransport } from './data-url-safe-transport';
import { createToolLoopAgent } from './create-tool-loop-agent';

/**
 * Creates a ChatTransport that talks directly to Anthropic Claude.
 * Uses the `anthropic-dangerous-direct-browser-access` header to bypass
 * CORS restrictions. This is safe because the API key is BYOK — the user
 * provides their own key and it's sent directly to Anthropic, not through
 * any intermediary.
 */
export function createAnthropicTransport(
  credential: string,
  systemPrompt: string,
  compileFn: CompileFn,
  modelId?: string,
) {
  const resolvedModel = modelId || 'claude-sonnet-4-20250514';
  console.log(`[Anthropic] Initializing Claude transport (model: ${resolvedModel})`);
  const anthropic = createAnthropic({
    apiKey: credential,
    headers: {
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  });

  const { agent, onBeforeStream } = createToolLoopAgent(
    anthropic(resolvedModel),
    systemPrompt,
    compileFn,
    'Anthropic',
  );

  return new DataUrlSafeChatTransport({ agent, onBeforeStream });
}
