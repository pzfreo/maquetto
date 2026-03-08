import { ToolLoopAgent, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createTestCodeTool, type CompileFn } from '../tools/test-code-tool';
import { DataUrlSafeChatTransport } from './data-url-safe-transport';
import { useAppStore } from '../../store';
import { refreshGoogleToken } from '../../lib/google-token-refresh';

/**
 * Try to refresh the OAuth token and update the store.
 * Returns the new access token, or null on failure.
 */
async function tryRefreshOAuthToken(): Promise<string | null> {
  const refreshToken = useAppStore.getState().providerRefreshToken;
  if (!refreshToken) return null;

  console.log('[Google OAuth] Token expired, attempting refresh...');
  const result = await refreshGoogleToken(refreshToken);
  if (!result) return null;

  const current = useAppStore.getState().aiProvider;
  if (current.type === 'google-oauth') {
    useAppStore.getState().setAIProvider({
      ...current,
      credential: result.accessToken,
    });
    useAppStore.getState().setProviderToken(result.accessToken);
    console.log('[Google OAuth] Token refreshed successfully');
  }
  return result.accessToken;
}

/**
 * Creates a ChatTransport that talks directly to Google Gemini.
 * Google's Generative AI API supports CORS, so no proxy needed.
 *
 * @param credential - A Gemini API key (BYOK) or OAuth access token (used as initial value).
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
  console.log(`[Google] Initializing Gemini transport (model: ${resolvedModel}, oauth: ${!!useOAuth}, credential: ${credential.substring(0, 10)}...)`);

  // For BYOK: pass API key directly.
  // For OAuth: use custom fetch that always reads the latest credential
  // from the store (not a stale closure) and retries on 401 with token refresh.
  const google = useOAuth
    ? createGoogleGenerativeAI({
        apiKey: 'oauth-placeholder',
        fetch: async (input, init) => {
          const makeRequest = async (token: string) => {
            const url = new URL(typeof input === 'string' ? input : (input as Request).url);
            url.searchParams.delete('key');
            const headers = new Headers(init?.headers);
            headers.delete('x-goog-api-key');
            headers.set('Authorization', `Bearer ${token}`);
            console.log(`[Google OAuth] ${init?.method ?? 'GET'} ${url.pathname}`);
            return globalThis.fetch(url.toString(), { ...init, headers });
          };

          // Use latest credential from store, not the closed-over value
          const currentCredential = useAppStore.getState().aiProvider.credential || credential;
          const response = await makeRequest(currentCredential);
          console.log(`[Google OAuth] Response: ${response.status} ${response.statusText}, content-type: ${response.headers.get('content-type')}`);

          // On 401, try refreshing the token and retry once
          if (response.status === 401) {
            console.warn('[Google OAuth] Got 401, attempting token refresh...');
            const newToken = await tryRefreshOAuthToken();
            if (newToken) {
              const retryResponse = await makeRequest(newToken);
              console.log(`[Google OAuth] Retry response: ${retryResponse.status} ${retryResponse.statusText}`);
              if (!retryResponse.ok) {
                const body = await retryResponse.clone().text();
                console.error(`[Google OAuth] Retry error body:`, body);
              }
              return retryResponse;
            }
          }

          if (!response.ok) {
            const body = await response.clone().text();
            console.error(`[Google OAuth] Error body:`, body);
          }
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
