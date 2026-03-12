import { ToolLoopAgent } from 'ai';
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

  const tools = { test_code: createTestCodeTool(compileFn) };

  let lastTestResult: 'none' | 'failed' | 'succeeded' = 'none';
  let stepsAfterSuccess = 0;

  const agent = new ToolLoopAgent({
    model: anthropic(resolvedModel),
    instructions: systemPrompt,
    tools,
    stopWhen: ({ steps }) => {
      if (steps.length >= 6) return true;
      if (lastTestResult === 'succeeded') {
        stepsAfterSuccess++;
        if (stepsAfterSuccess > 1) {
          console.log('[Anthropic] Stopping loop: success + text step completed');
          return true;
        }
      }
      return false;
    },
    prepareStep() {
      if (lastTestResult === 'succeeded') return { toolChoice: 'none' as const };
      if (lastTestResult === 'failed') return { toolChoice: 'required' as const };
      return { toolChoice: 'auto' as const };
    },
    onStepFinish({ stepNumber, finishReason, toolCalls, toolResults }) {
      console.log(`[Anthropic] Step ${stepNumber} finished: reason=${finishReason}, toolCalls=${toolCalls.length}, toolResults=${toolResults.length}`);
      for (const r of toolResults) {
        console.log(`[Anthropic]   tool=${r.toolName} output=`, r.output);
        if (r.toolName === 'test_code') {
          const output = r.output as Record<string, unknown>;
          lastTestResult = output.success === true ? 'succeeded' : 'failed';
        }
      }
    },
  });

  return new DataUrlSafeChatTransport({
    agent,
    onBeforeStream() {
      lastTestResult = 'none';
      stepsAfterSuccess = 0;
    },
  });
}
