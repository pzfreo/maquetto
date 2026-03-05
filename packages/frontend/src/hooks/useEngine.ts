import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { createWorkerEngine } from '../engine/create-worker-engine';
import type { CadEngine } from '@maquette/api-types';

/**
 * Creates the CAD engine once and subscribes to status updates.
 * Call this at the top level of the app (App.tsx).
 */
export function useEngine(): CadEngine | null {
  const engineRef = useRef<CadEngine | null>(null);

  useEffect(() => {
    const engine = createWorkerEngine();
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((status) => {
      useAppStore.getState().setEngineStatus(status);
    });

    return () => {
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return engineRef.current;
}
