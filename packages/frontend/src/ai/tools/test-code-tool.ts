import { tool } from 'ai';
import { z } from 'zod';
import type { CompileResult } from '@maquetto/api-types';

export type CompileFn = (code: string) => Promise<CompileResult>;

/**
 * Wait for the viewport to render the new model, then capture the canvas.
 * Returns a base64 data URL or null if capture fails.
 */
function captureViewportScreenshot(): Promise<string | null> {
  return new Promise((resolve) => {
    // Wait two animation frames for the glTF to load and render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const canvas = document.querySelector('canvas');
          if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            console.log('[test_code] Captured viewport screenshot');
            resolve(dataUrl);
            return;
          }
        } catch {
          // Canvas capture can fail (tainted, security)
        }
        resolve(null);
      });
    });
  });
}

export function createTestCodeTool(compileFn: CompileFn) {
  return tool({
    description:
      'MANDATORY: Test Build123d Python code by compiling it in the CAD engine. You MUST call this tool before presenting ANY code to the user. Returns compilation errors (fix and retry) or success with part count and a viewport screenshot showing the rendered result.',
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

        // Capture the viewport after successful compile so the AI can
        // visually verify the result looks correct
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
  });
}
