import { ToolLoopAgent } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createTestCodeTool, type CompileFn } from '../tools/test-code-tool';
import { DataUrlSafeChatTransport } from './data-url-safe-transport';

/**
 * Creates a ChatTransport that talks directly to Google Gemini.
 * Google's Generative AI API supports CORS, so no proxy needed.
 *
 * @param credential - Either an API key or an OAuth access token
 * @param isOAuthToken - If true, credential is a Supabase provider_token (OAuth bearer)
 */
export function createGoogleTransport(
  credential: string,
  systemPrompt: string,
  compileFn: CompileFn | null,
  isOAuthToken = false,
) {
  console.log(`[Google] Initializing Gemini transport (model: gemini-2.0-flash, auth: ${isOAuthToken ? 'OAuth' : 'API key'})`);

  // OAuth tokens use Authorization: Bearer header; API keys use x-goog-api-key.
  // The SDK always sets x-goog-api-key from apiKey, so for OAuth we pass a
  // dummy key and use a custom fetch to replace it with the Bearer header.
  const google = isOAuthToken
    ? createGoogleGenerativeAI({
        apiKey: 'oauth-placeholder',
        fetch: (url, init) => {
          const headers = new Headers(init?.headers);
          headers.delete('x-goog-api-key');
          headers.set('Authorization', `Bearer ${credential}`);
          return fetch(url, { ...init, headers });
        },
      })
    : createGoogleGenerativeAI({ apiKey: credential });

  const tools = compileFn
    ? { test_code: createTestCodeTool(compileFn) }
    : undefined;

  const agent = new ToolLoopAgent({
    model: google('gemini-2.0-flash'),
    instructions: systemPrompt,
    ...(tools && { tools, maxSteps: 5 }),
  });

  return new DataUrlSafeChatTransport({ agent });
}
