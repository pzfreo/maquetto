import { useState, useEffect, useCallback } from 'react';
import { useEngine } from './hooks/useEngine';
import { useCompilation } from './hooks/useCompilation';
import { useAuthListener } from './hooks/useAuthListener';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { Layout } from './components/Layout/Layout';
import {
  FirstRunScreen,
  useFirstRun,
} from './components/FirstRun/FirstRunScreen';
import { useAppStore } from './store';
import './styles/global.css';

export function App() {
  useAuthListener();
  useTokenRefresh();
  const engine = useEngine();
  const { triggerCompile } = useCompilation(engine);
  const showFirstRun = useFirstRun();
  const [firstRunDismissed, setFirstRunDismissed] = useState(false);

  // Auto-compile the starter script when engine becomes ready
  const enginePhase = useAppStore((s) => s.engineStatus.phase);
  const [hasAutoCompiled, setHasAutoCompiled] = useState(false);

  useEffect(() => {
    if (enginePhase === 'ready' && !hasAutoCompiled) {
      console.log('[App] Engine ready — auto-compiling starter script');
      setHasAutoCompiled(true);
      triggerCompile();
    }
  }, [enginePhase, hasAutoCompiled, triggerCompile]);

  const handleRetryEngine = useCallback(() => {
    engine?.retry();
  }, [engine]);

  const handleStop = useCallback(() => {
    engine?.cancelCompile();
  }, [engine]);

  if (showFirstRun && !firstRunDismissed) {
    console.log('[App] Showing first-run setup');
    return <FirstRunScreen onComplete={() => {
      console.log('[App] First-run complete');
      setFirstRunDismissed(true);
    }} />;
  }

  return (
    <Layout onCompile={triggerCompile} onStop={handleStop} onRetryEngine={handleRetryEngine} engine={engine} />
  );
}
