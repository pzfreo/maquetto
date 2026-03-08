import { ToolLoopAgent, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createTestCodeTool, type CompileFn } from '../tools/test-code-tool';
import { DataUrlSafeChatTransport } from './data-url-safe-transport';

/**
 * Creates a ChatTransport that talks directly to Google Gemini.
 * Google's Generative AI API supports CORS, so no proxy needed.
 *
 * @param credential - A Gemini API key (BYOK) or OAuth access token
 * @param useOAuth - If true, send credential as Bearer header instead of API key
 */
export function createGoogleTransport(
  credential: string,
  systemPrompt: string,
  compileFn: CompileFn,
  modelId?: string,
  useOAuth?: boolean,
) {
  const resolvedModel = modelId || 'gemini-3-flash-preview';
  console.log(`[Google] Initializing Gemini transport (model: ${resolvedModel}, oauth: ${!!useOAuth})`);

  // OAuth tokens must be sent as Bearer header; API keys go as ?key= query param.
  // The SDK always appends ?key= to the URL, so for OAuth we use a custom fetch
  // that strips the key param and adds the Authorization header instead.
  const google = useOAuth
    ? createGoogleGenerativeAI({
        apiKey: 'oauth',
        fetch: (url, init) => {
          const u = new URL(typeof url === 'string' ? url : (url as Request).url);
          u.searchParams.delete('key');
          const headers = new Headers(init?.headers);
          headers.set('Authorization', `Bearer ${credential}`);
          return fetch(u.toString(), { ...init, headers });
        },
      })
    : createGoogleGenerativeAI({ apiKey: credential });

  const tools = { test_code: createTestCodeTool(compileFn) };

  // Track whether the last test_code call failed so we can force a retry
  let lastTestFailed = true;

  const agent = new ToolLoopAgent({
    model: google(resolvedModel),
    instructions: systemPrompt,
    tools,
    stopWhen: stepCountIs(6),
    // Force tool use on step 0 (initial test) and whenever the previous
    // test_code call returned errors, so the AI must fix and retry rather
    // than presenting broken code.
    prepareStep({ stepNumber }: { stepNumber: number }) {
      const force = stepNumber === 0 || lastTestFailed;
      return { toolChoice: force ? ('required' as const) : ('auto' as const) };
    },
    onStepFinish({ stepNumber, finishReason, toolCalls, toolResults }) {
      console.log(`[Google] Step ${stepNumber} finished: reason=${finishReason}, toolCalls=${toolCalls.length}, toolResults=${toolResults.length}`);
      for (const r of toolResults) {
        console.log(`[Google]   tool=${r.toolName} output=`, r.output);
        if (r.toolName === 'test_code') {
          const output = r.output as Record<string, unknown>;
          lastTestFailed = output.success !== true;
        }
      }
    },
  });

  return new DataUrlSafeChatTransport({ agent });
}
