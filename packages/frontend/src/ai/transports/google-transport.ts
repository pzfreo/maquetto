import { DirectChatTransport, ToolLoopAgent } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Creates a ChatTransport that talks directly to Google Gemini.
 * Google's Generative AI API supports CORS, so no proxy needed.
 */
export function createGoogleTransport(
  credential: string,
  systemPrompt: string,
) {
  console.log('[Google] Initializing Gemini transport (model: gemini-2.0-flash)');
  const google = createGoogleGenerativeAI({ apiKey: credential });
  const agent = new ToolLoopAgent({
    model: google('gemini-2.0-flash'),
    instructions: systemPrompt,
  });

  return new DirectChatTransport({ agent });
}
