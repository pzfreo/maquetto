import { useAppStore } from '../../store';
import type { EnginePhase } from '@maquette/api-types';

const PHASE_LABELS: Record<EnginePhase, string> = {
  idle: 'Idle',
  'loading-pyodide': 'Loading Python…',
  'loading-ocp': 'Loading CAD Engine…',
  'loading-build123d': 'Loading Build123d…',
  initializing: 'Initializing…',
  ready: 'Ready',
  error: 'Error',
};

const PHASE_COLORS: Record<EnginePhase, string> = {
  idle: '#888',
  'loading-pyodide': '#4a9eff',
  'loading-ocp': '#4a9eff',
  'loading-build123d': '#4a9eff',
  initializing: '#4a9eff',
  ready: '#4caf50',
  error: '#f44336',
};

interface EngineStatusBadgeProps {
  onRetry?: () => void;
}

export function EngineStatusBadge({ onRetry }: EngineStatusBadgeProps) {
  const { phase, progress } = useAppStore((s) => s.engineStatus);

  const isLoading =
    phase !== 'idle' && phase !== 'ready' && phase !== 'error';

  return (
    <div
      className="engine-status-badge"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        background: 'rgba(255,255,255,0.05)',
        color: PHASE_COLORS[phase],
      }}
    >
      {isLoading && (
        <div
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: PHASE_COLORS[phase],
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
      <span>{PHASE_LABELS[phase]}</span>
      {phase === 'error' && onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '2px 8px',
            borderRadius: '3px',
            border: '1px solid #f44336',
            background: 'transparent',
            color: '#f44336',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
