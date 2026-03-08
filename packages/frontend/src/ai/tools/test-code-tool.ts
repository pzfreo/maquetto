import { tool } from 'ai';
import { z } from 'zod';
import type { CompileResult } from '@maquetto/api-types';
import { useAppStore } from '../../store';

export type CompileFn = (code: string) => Promise<CompileResult>;

/**
 * Wait for the viewport to render the new model, then capture via the
 * store-registered screenshot function (provided by ScreenshotRegistrar
 * inside the R3F Canvas).
 */
function captureViewportScreenshot(): Promise<string | null> {
  return new Promise((resolve) => {
    // Wait 500ms for the glTF to load into the scene, then capture after a frame
    setTimeout(() => {
      requestAnimationFrame(() => {
        const capture = useAppStore.getState().captureScreenshot;
        if (capture) {
          const dataUrl = capture();
          if (dataUrl) {
            console.log('[test_code] Captured viewport screenshot');
            resolve(dataUrl);
            return;
          }
        }
        resolve(null);
      });
    }, 500);
  });
}

/**
 * Creates the test_code tool. The compileFn uses a ref internally so it's
 * always up to date — if the engine isn't ready it throws, which the
 * try/catch handles gracefully.
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
      'MANDATORY: Test Build123d Python code by compiling it in the CAD engine. You MUST call this tool before presenting ANY code to the user. Returns compilation errors (fix and retry) or success with part count and a viewport screenshot showing the rendered result.',
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

        // Push the result into the store so the viewport actually renders
        // the new model before we capture the screenshot
        useAppStore.getState().setCompileResult(result);

        // Capture the viewport after the store update propagates to Three.js
        const screenshot = await captureViewportScreenshot();

        return {
          success: true as const,
          partCount: result.parts.length,
          warnings: result.warnings,
          ...(screenshot && { viewportScreenshot: screenshot }),
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
