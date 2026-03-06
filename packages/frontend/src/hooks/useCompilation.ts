import { useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import type { CadEngine } from '@maquetto/api-types';

/**
 * Provides triggerCompile() which reads code from the store,
 * calls engine.compile(), and updates the compilation slice.
 *
 * Also handles auto-compile: if the user wrote code while the engine
 * was loading, compiles automatically when the engine reaches ready.
 */
export function useCompilation(engine: CadEngine | null) {
  const pendingCompileRef = useRef(false);

  const triggerCompile = useCallback(async () => {
    if (!engine) {
      console.warn('[Compile] Engine not ready, queuing compile...');
      pendingCompileRef.current = true;
      return;
    }

    const { code, qualityLevel } = useAppStore.getState();
    console.log(`[Compile] Starting (quality=${qualityLevel}, ${code.length} chars)`);
    useAppStore.getState().setCompilationStatus('compiling');

    const result = await engine.compile(code, qualityLevel);
    console.log(`[Compile] Done: ${result.errors.length} errors, ${result.warnings.length} warnings, ${result.executionTimeMs}ms`);
    useAppStore.getState().setCompileResult(result);
    useAppStore.getState().setDirty(false);
  }, [engine]);

  // Auto-compile when engine becomes ready if there's a pending compile
  const enginePhase = useAppStore((s) => s.engineStatus.phase);

  useEffect(() => {
    if (enginePhase === 'ready' && pendingCompileRef.current && engine) {
      console.log('[Compile] Engine ready, running queued compile');
      pendingCompileRef.current = false;
      void triggerCompile();
    }
  }, [enginePhase, engine, triggerCompile]);

  return { triggerCompile };
}
