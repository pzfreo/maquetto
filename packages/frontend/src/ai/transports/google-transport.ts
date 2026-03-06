import { DirectChatTransport, ToolLoopAgent } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createTestCodeTool, type CompileFn } from '../tools/test-code-tool';

/**
 * Creates a ChatTransport that talks directly to Google Gemini.
 * Google's Generative AI API supports CORS, so no proxy needed.
 */
export function createGoogleTransport(
  credential: string,
  systemPrompt: string,
  compileFn: CompileFn | null,
) {
  console.log('[Google] Initializing Gemini transport (model: gemini-2.0-flash)');
  const google = createGoogleGenerativeAI({ apiKey: credential });

  const tools = compileFn
    ? { test_code: createTestCodeTool(compileFn) }
    : undefined;

  const agent = new ToolLoopAgent({
    model: google('gemini-2.0-flash'),
    instructions: systemPrompt,
    ...(tools && { tools, maxSteps: 5 }),
  });

  return new DirectChatTransport({ agent });
}
