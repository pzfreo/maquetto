import { DirectChatTransport, ToolLoopAgent } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * The URL of the edge proxy for Anthropic API requests.
 * Anthropic does not allow browser CORS, so requests must go through a proxy.
 *
 * For local development, this can point to a local proxy.
 * In production, deploy the api-proxy package and set this URL.
 */
const ANTHROPIC_PROXY_URL =
  import.meta.env.VITE_ANTHROPIC_PROXY_URL ?? '/api/anthropic';

/**
 * Creates a ChatTransport that talks to Anthropic Claude via an edge proxy.
 * The proxy forwards requests to api.anthropic.com with the user's API key.
 *
 * Note: If no proxy is available, this will attempt direct connection which
 * will fail due to CORS. Users should set VITE_ANTHROPIC_PROXY_URL.
 */
export function createAnthropicTransport(
  credential: string,
  systemPrompt: string,
) {
  const anthropic = createAnthropic({
    apiKey: credential,
    baseURL: ANTHROPIC_PROXY_URL,
  });
  const agent = new ToolLoopAgent({
    model: anthropic('claude-sonnet-4-20250514'),
    instructions: systemPrompt,
  });

  return new DirectChatTransport({ agent });
}
