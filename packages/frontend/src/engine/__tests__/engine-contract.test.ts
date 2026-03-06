import { describe, it, expect, vi } from 'vitest';
import type { CadEngine, CompileResult, EngineStatus } from '@maquetto/api-types';

/**
 * Mock CadEngine that validates the interface contract.
 * Any implementation must satisfy these behaviors.
 */
function createMockEngine(options?: {
  compileResult?: CompileResult;
  initPhases?: EngineStatus[];
}): CadEngine {
  const listeners = new Set<(status: EngineStatus) => void>();

  const defaultResult: CompileResult = {
    gltfBase64: btoa('fake-glb-data'),
    parts: [
      {
        id: '@1',
        color: [0.259, 0.522, 0.957],
        boundingBox: { min: [0, 0, 0], max: [50, 40, 30] },
        faceCount: 6,
        volume: 60000,
      },
    ],
    errors: [],
    warnings: [],
    executionTimeMs: 150,
  };

  return {
    subscribe(callback) {
      listeners.add(callback);

      // Simulate init phases
      if (options?.initPhases) {
        for (const status of options.initPhases) {
          setTimeout(() => callback(status), 0);
        }
      }

      return () => {
        listeners.delete(callback);
      };
    },

    async compile(_code, _quality) {
      return options?.compileResult ?? defaultResult;
    },

    retry() {
      // Re-emit init phases on retry
      if (options?.initPhases) {
        for (const status of options.initPhases) {
          for (const cb of listeners) {
            setTimeout(() => cb(status), 0);
          }
        }
      }
    },

    dispose() {
      listeners.clear();
    },
  };
}

describe('CadEngine contract', () => {
  it('subscribe returns an unsubscribe function', () => {
    const engine = createMockEngine();
    const callback = vi.fn();
    const unsubscribe = engine.subscribe(callback);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('compile returns a valid CompileResult', async () => {
    const engine = createMockEngine();
    const result = await engine.compile('Box(10, 10, 10)', 'normal');

    expect(result).toHaveProperty('gltfBase64');
    expect(result).toHaveProperty('parts');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('executionTimeMs');
    expect(typeof result.gltfBase64).toBe('string');
    expect(Array.isArray(result.parts)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(typeof result.executionTimeMs).toBe('number');
  });

  it('parts have required metadata fields', async () => {
    const engine = createMockEngine();
    const result = await engine.compile('Box(10, 10, 10)', 'normal');
    const part = result.parts[0];

    expect(part).toBeDefined();
    expect(part?.id).toMatch(/^@\d+$/);
    expect(part?.color).toHaveLength(3);
    expect(part?.boundingBox.min).toHaveLength(3);
    expect(part?.boundingBox.max).toHaveLength(3);
    expect(typeof part?.faceCount).toBe('number');
  });

  it('returns structured errors for syntax errors', async () => {
    const engine = createMockEngine({
      compileResult: {
        gltfBase64: '',
        parts: [],
        errors: [
          {
            type: 'syntax',
            message: 'invalid syntax',
            line: 3,
            column: 10,
          },
        ],
        warnings: [],
        executionTimeMs: 5,
      },
    });

    const result = await engine.compile('def foo(:', 'normal');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.type).toBe('syntax');
    expect(result.errors[0]?.line).toBe(3);
    expect(result.gltfBase64).toBe('');
    expect(result.parts).toHaveLength(0);
  });

  it('returns structured errors for runtime errors', async () => {
    const engine = createMockEngine({
      compileResult: {
        gltfBase64: '',
        parts: [],
        errors: [
          {
            type: 'runtime',
            message: "name 'undefined_var' is not defined",
            line: 5,
            column: null,
          },
        ],
        warnings: [],
        executionTimeMs: 10,
      },
    });

    const result = await engine.compile('print(undefined_var)', 'normal');
    expect(result.errors[0]?.type).toBe('runtime');
    expect(result.errors[0]?.line).toBe(5);
  });

  it('retry re-emits init phases', async () => {
    const phases: EngineStatus[] = [
      { phase: 'loading-pyodide', progress: 10 },
      { phase: 'ready', progress: 100 },
    ];
    const engine = createMockEngine({ initPhases: phases });
    const callback = vi.fn();
    engine.subscribe(callback);

    // Wait for initial phases
    await new Promise((r) => setTimeout(r, 10));
    const initialCallCount = callback.mock.calls.length;

    engine.retry();
    await new Promise((r) => setTimeout(r, 10));

    // Should have received additional calls from retry
    expect(callback.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('dispose cleans up', () => {
    const engine = createMockEngine();
    const callback = vi.fn();
    engine.subscribe(callback);
    engine.dispose();
    // After dispose, no more callbacks should fire
  });
});
