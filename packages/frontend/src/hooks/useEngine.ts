import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { createWorkerEngine } from '../engine/create-worker-engine';
import type { CadEngine } from '@maquetto/api-types';

/**
 * Creates the CAD engine once and subscribes to status updates.
 * Call this at the top level of the app (App.tsx).
 */
export function useEngine(): CadEngine | null {
  const engineRef = useRef<CadEngine | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    console.log('[App] Creating CAD engine...');
    const engine = createWorkerEngine();
    engineRef.current = engine;
    forceRender((n) => n + 1);

    const unsubscribe = engine.subscribe((status) => {
      useAppStore.getState().setEngineStatus(status);
    });

    return () => {
      console.log('[App] Disposing CAD engine');
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return engineRef.current;
}
