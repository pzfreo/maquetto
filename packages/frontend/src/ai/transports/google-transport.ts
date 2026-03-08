import { ToolLoopAgent, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createTestCodeTool, type CompileFn } from '../tools/test-code-tool';
import { DataUrlSafeChatTransport } from './data-url-safe-transport';

/**
 * Creates a ChatTransport that talks directly to Google Gemini.
 * Google's Generative AI API supports CORS, so no proxy needed.
 *
 * @param credential - A Gemini API key (BYOK) or OAuth access token.
 * @param useOAuth - If true, send credential as Bearer token instead of API key.
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

  // For BYOK: pass API key directly (SDK sends it as ?key= or x-goog-api-key header).
  // For OAuth: use custom fetch to replace API key auth with Bearer token.
  // The SDK requires apiKey, so we provide a placeholder for OAuth and swap in
  // the Authorization header via custom fetch.
  const google = useOAuth
    ? createGoogleGenerativeAI({
        apiKey: 'oauth-placeholder',
        fetch: async (input, init) => {
          const url = new URL(typeof input === 'string' ? input : (input as Request).url);
          // Strip the placeholder API key from URL
          url.searchParams.delete('key');
          const headers = new Headers(init?.headers);
          // Remove any API key header the SDK added
          headers.delete('x-goog-api-key');
          // Set OAuth Bearer token
          headers.set('Authorization', `Bearer ${credential}`);
          console.log(`[Google OAuth] ${init?.method ?? 'GET'} ${url.pathname}`);
          const response = await globalThis.fetch(url.toString(), { ...init, headers });
          console.log(`[Google OAuth] Response: ${response.status} ${response.statusText}`);
          return response;
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
