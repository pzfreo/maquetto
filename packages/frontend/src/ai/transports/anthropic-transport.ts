import { ToolLoopAgent, stepCountIs } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createTestCodeTool, type CompileFn } from '../tools/test-code-tool';
import { DataUrlSafeChatTransport } from './data-url-safe-transport';

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
  compileFn: CompileFn | null,
) {
  console.log('[Anthropic] Initializing Claude transport (direct browser access)');
  const anthropic = createAnthropic({
    apiKey: credential,
    headers: {
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  });

  const tools = compileFn
    ? { test_code: createTestCodeTool(compileFn) }
    : undefined;

  const agent = new ToolLoopAgent({
    model: anthropic('claude-sonnet-4-20250514'),
    instructions: systemPrompt,
    ...(tools && { tools }),
    stopWhen: stepCountIs(6),
    onStepFinish({ stepNumber, finishReason, toolCalls, toolResults }) {
      console.log(`[Anthropic] Step ${stepNumber} finished: reason=${finishReason}, toolCalls=${toolCalls.length}, toolResults=${toolResults.length}`);
      for (const r of toolResults) {
        console.log(`[Anthropic]   tool=${r.toolName} output=`, r.output);
      }
    },
  });

  return new DataUrlSafeChatTransport({ agent });
}
