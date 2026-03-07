import { tool } from 'ai';
import { z } from 'zod';
import type { CompileResult } from '@maquetto/api-types';

export type CompileFn = (code: string) => Promise<CompileResult>;

export function createTestCodeTool(compileFn: CompileFn) {
  return tool({
    description:
      'MANDATORY: Test Build123d Python code by compiling it in the CAD engine. You MUST call this tool before presenting ANY code to the user. Returns compilation errors (fix and retry) or success with part count.',
    inputSchema: z.object({
      code: z.string().describe('Complete Build123d Python code to test'),
    }),
    execute: async ({ code }) => {
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
  });
}
