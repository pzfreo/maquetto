import { tool } from 'ai';
import { z } from 'zod';
import type { CompileResult } from '@maquetto/api-types';
import { useAppStore } from '../../store';

export type CompileFn = (code: string) => Promise<CompileResult>;

/** Max time for AI-triggered compilation before we give up (ms). */
const COMPILE_TIMEOUT_MS = 60_000;

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
    execute: async (
      { code }: z.infer<typeof inputSchema>,
      { abortSignal }: { abortSignal?: AbortSignal },
    ) => {
      console.log('[test_code] Testing code...', code.length, 'chars');

      // Bail early if already aborted (user clicked Stop)
      if (abortSignal?.aborted) {
        console.log('[test_code] Aborted before compilation');
        return { success: false as const, errors: [{ type: 'runtime' as const, message: 'Cancelled', line: null }] };
      }

      // Check if engine is in error/loading state — don't waste tool loop
      // iterations retrying when the engine itself is broken or not ready.
      const enginePhase = useAppStore.getState().engineStatus.phase;
      if (enginePhase === 'error') {
        console.log('[test_code] Engine is in error state, aborting');
        return {
          success: false as const,
          engineError: true,
          errors: [{
            type: 'runtime' as const,
            message: 'The CAD engine has crashed (WASM error). Do NOT retry — tell the user to click the Retry button in the error banner to restart the engine, then try again.',
            line: null,
          }],
        };
      }
      if (enginePhase !== 'ready') {
        console.log('[test_code] Engine not ready, phase:', enginePhase);
        return {
          success: false as const,
          engineError: true,
          errors: [{
            type: 'runtime' as const,
            message: `The CAD engine is not ready (status: ${enginePhase}). Do NOT retry — tell the user to wait for the engine to finish loading.`,
            line: null,
          }],
        };
      }

      try {
        // Race the compilation against a timeout and the abort signal.
        // If the worker hangs (crash, infinite loop), this prevents the
        // chat from blocking forever.
        let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
        const result = await Promise.race([
          compileFn(code),
          new Promise<never>((_, reject) => {
            timeoutTimer = setTimeout(
              () => reject(new Error('Compilation timed out after 60s')),
              COMPILE_TIMEOUT_MS,
            );
            // Also reject if abort signal fires during compilation
            abortSignal?.addEventListener('abort', () => {
              clearTimeout(timeoutTimer);
              reject(new Error('Cancelled'));
            }, { once: true });
          }),
        ]);
        // Clear timeout on happy path — prevents timer leak
        clearTimeout(timeoutTimer);

        // Check abort again after compilation — don't push stale results
        if (abortSignal?.aborted) {
          console.log('[test_code] Aborted after compilation');
          return { success: false as const, errors: [{ type: 'runtime' as const, message: 'Cancelled', line: null }] };
        }

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
        // and the editor shows the tested code immediately (don't wait for
        // streaming to finish — the AI might not repeat the code in its text).
        const store = useAppStore.getState();
        const previousCode = store.code;
        store.setCompileResult(result);
        store.setCode(code);
        store.setDirty(false);
        // Save a version so the user can revert
        if (code !== previousCode) {
          store.saveVersion(previousCode, 'ai', 'AI code update', null);
        }

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
