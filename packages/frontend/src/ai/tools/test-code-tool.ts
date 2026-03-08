import { tool } from 'ai';
import { z } from 'zod';
import type { CompileResult } from '@maquetto/api-types';
import { useAppStore } from '../../store';

export type CompileFn = (code: string) => Promise<CompileResult>;

/**
 * Creates the test_code tool. The compileFn uses a ref internally so it's
 * always up to date — if the engine isn't ready it throws, which the
 * try/catch handles gracefully.
 *
 * Note: Screenshots are NOT included in tool results to avoid blowing up
 * the token count. A single base64 PNG screenshot is ~25K tokens, and with
 * multiple tool calls per conversation this quickly exceeds context limits.
 * The AI gets part count/metadata instead, and the user can attach a
 * screenshot manually via "+ Screenshot" if needed.
 */
export function createTestCodeTool(compileFn: CompileFn) {
  const inputSchema = z.object({
    code: z.string().describe('Complete Build123d Python code to test'),
  });

  // The `as any` cast is needed because the Vercel AI SDK tool() overloads
  // can't resolve the complex union return type of execute(). The tool()
  // function is a pass-through (literally `return tool2`), so this is safe.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: any = {
    description:
      'MANDATORY: Test Build123d Python code by compiling it in the CAD engine. You MUST call this tool before presenting ANY code to the user. Returns compilation errors (fix and retry) or success with part count.',
    inputSchema,
    execute: async ({ code }: z.infer<typeof inputSchema>) => {
      console.log('[test_code] Testing code...', code.length, 'chars');
      try {
        const result = await compileFn(code);
        if (result.errors.length > 0) {
          console.log('[test_code] Errors:', result.errors.length);
          return {
            success: false as const,
            errors: result.errors.map((e) => ({
              type: e.type,
              message: e.message,
              line: e.line,
            })),
          };
        }
        console.log('[test_code] Success:', result.parts.length, 'parts');

        // Push the result into the store so the viewport renders the new model
        useAppStore.getState().setCompileResult(result);

        return {
          success: true as const,
          partCount: result.parts.length,
          warnings: result.warnings,
        };
      } catch (err) {
        console.error('[test_code] Compile threw:', err);
        return {
          success: false as const,
          errors: [{ type: 'runtime' as const, message: String(err), line: null }],
        };
      }
    },
  };

  return tool(config);
}
