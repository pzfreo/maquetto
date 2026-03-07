import { tool } from 'ai';
import { z } from 'zod';
import type { CompileResult } from '@maquetto/api-types';
import { useAppStore } from '../../store';

export type CompileFn = (code: string) => Promise<CompileResult>;

/**
 * Wait for the viewport to render the new model, then capture the canvas.
 * Returns a base64 data URL or null if capture fails.
 */
function captureViewportScreenshot(): Promise<string | null> {
  return new Promise((resolve) => {
    // Wait 500ms for the glTF to load into the scene, then capture after a frame
    setTimeout(() => {
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
    }, 500);
  });
}

export function createTestCodeTool(compileFn: CompileFn) {
  const inputSchema = z.object({
    code: z.string().describe('Complete Build123d Python code to test'),
  });

  // Build tool config with experimental_toToolResultContent for image support.
  // The `as any` is needed because the Vercel AI SDK tool() overload doesn't
  // expose experimental_toToolResultContent in its public type signature yet.
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
    // Return screenshot as an image content part so the model can actually see it
    experimental_toToolResultContent(result: Record<string, unknown>) {
      const parts: Array<
        { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }
      > = [];

      // Always include the structured result as text (without the huge data URL)
      const { viewportScreenshot, ...rest } = result;
      parts.push({ type: 'text', text: JSON.stringify(rest) });

      // If there's a screenshot, include it as an image content part
      if (typeof viewportScreenshot === 'string' && viewportScreenshot.startsWith('data:image/png;base64,')) {
        const base64 = viewportScreenshot.replace('data:image/png;base64,', '');
        parts.push({ type: 'image', data: base64, mimeType: 'image/png' });
      }

      return parts;
    },
  };

  return tool(config);
}
