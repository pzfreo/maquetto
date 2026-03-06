import { useState } from 'react';
import { useAppStore } from '../../store';
import { EngineStatusBadge } from './EngineStatusBadge';
import { ProviderSettingsModal } from '../Settings/ProviderSettingsModal';

interface ToolbarProps {
  onCompile?: () => void;
  onRetryEngine?: () => void;
}

export function Toolbar({ onCompile, onRetryEngine }: ToolbarProps) {
  const enginePhase = useAppStore((s) => s.engineStatus.phase);
  const compilationStatus = useAppStore((s) => s.compilationStatus);
  const qualityLevel = useAppStore((s) => s.qualityLevel);
  const setQualityLevel = useAppStore((s) => s.setQualityLevel);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isReady = enginePhase === 'ready';
  const isCompiling = compilationStatus === 'compiling';

  return (
    <div
      className="toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 16px',
        height: '44px',
        background: '#16162a',
        borderBottom: '1px solid #2a2a3e',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontWeight: 600,
          fontSize: '15px',
          color: '#e0e0e0',
          marginRight: '8px',
        }}
      >
        Maquetto
      </span>

      <button
        onClick={onCompile}
        disabled={!isReady || isCompiling}
        title={!isReady ? 'Engine is loading…' : 'Run code (Ctrl+Enter)'}
        style={{
          padding: '4px 14px',
          borderRadius: '4px',
          border: 'none',
          background: isReady && !isCompiling ? '#4caf50' : '#333',
          color: isReady && !isCompiling ? '#fff' : '#888',
          cursor: isReady && !isCompiling ? 'pointer' : 'not-allowed',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        {isCompiling ? 'Running…' : '▶ Run'}
      </button>

      <EngineStatusBadge onRetry={onRetryEngine} />

      <div style={{ flex: 1 }} />

      <select
        value={qualityLevel}
        onChange={(e) =>
          setQualityLevel(e.target.value as 'draft' | 'normal' | 'high')
        }
        style={{
          padding: '3px 8px',
          borderRadius: '4px',
          border: '1px solid #444',
          background: '#222',
          color: '#ccc',
          fontSize: '12px',
        }}
      >
        <option value="draft">Draft</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
      </select>

      <button
        title="Settings"
        onClick={() => setSettingsOpen(true)}
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #444',
          background: 'transparent',
          color: '#ccc',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        ⚙
      </button>

      <ProviderSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
