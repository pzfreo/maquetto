import { describe, it, expect } from 'vitest';
import type { CadEngine, CompileResult, EngineStatus } from '@maquetto/api-types';
import { useAppStore } from '../../store';

/**
 * Integration test: simulates the full compile flow through the store.
 * Engine → setCompileResult → store state updated correctly.
 */
function createMockEngine(result: CompileResult): CadEngine {
  const listeners = new Set<(status: EngineStatus) => void>();
  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
    async compile() {
      return result;
    },
    retry() {
      for (const cb of listeners) {
        cb({ phase: 'loading-pyodide', progress: 10 });
      }
    },
    dispose() {
      listeners.clear();
    },
  };
}

describe('Compile flow integration', () => {
  it('successful compile updates store correctly', async () => {
    const result: CompileResult = {
      gltfBase64: btoa('test-glb'),
      parts: [
        {
          id: '@1',
          color: [0.259, 0.522, 0.957],
          boundingBox: { min: [0, 0, 0], max: [10, 10, 10] },
          faceCount: 6,
          volume: 1000,
        },
      ],
      errors: [],
      warnings: [],
      executionTimeMs: 42,
    };

    const engine = createMockEngine(result);
    const store = useAppStore.getState();

    // Simulate compile flow
    store.setCompilationStatus('compiling');
    expect(useAppStore.getState().compilationStatus).toBe('compiling');

    const compileResult = await engine.compile('Box(10, 10, 10)', 'normal');
    store.setCompileResult(compileResult);

    const state = useAppStore.getState();
    expect(state.compilationStatus).toBe('success');
    expect(state.parts).toHaveLength(1);
    expect(state.parts[0]?.id).toBe('@1');
    expect(state.errors).toHaveLength(0);
    expect(state.gltfData).not.toBeNull();
    expect(state.executionTimeMs).toBe(42);
  });

  it('failed compile shows errors in store', async () => {
    const result: CompileResult = {
      gltfBase64: '',
      parts: [],
      errors: [
        {
          type: 'syntax',
          message: 'unexpected EOF',
          line: 1,
          column: 5,
        },
      ],
      warnings: [],
      executionTimeMs: 3,
    };

    const engine = createMockEngine(result);
    const compileResult = await engine.compile('Box(', 'normal');
    useAppStore.getState().setCompileResult(compileResult);

    const state = useAppStore.getState();
    expect(state.compilationStatus).toBe('error');
    expect(state.errors).toHaveLength(1);
    expect(state.errors[0]?.type).toBe('syntax');
    expect(state.gltfData).toBeNull();
  });

  it('clearCompilation resets state', () => {
    useAppStore.getState().clearCompilation();

    const state = useAppStore.getState();
    expect(state.compilationStatus).toBe('idle');
    expect(state.parts).toHaveLength(0);
    expect(state.errors).toHaveLength(0);
    expect(state.gltfData).toBeNull();
    expect(state.executionTimeMs).toBeNull();
  });
});
