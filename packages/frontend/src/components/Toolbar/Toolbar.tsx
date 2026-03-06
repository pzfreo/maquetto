import { useState, useRef, useEffect } from 'react';
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
  const resetCode = useAppStore((s) => s.resetCode);
  const clearVersionHistory = useAppStore((s) => s.clearVersionHistory);
  const clearCompilation = useAppStore((s) => s.clearCompilation);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  const isReady = enginePhase === 'ready';
  const isCompiling = compilationStatus === 'compiling';

  // Close file menu on outside click
  useEffect(() => {
    if (!fileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [fileMenuOpen]);

  const handleNew = () => {
    setFileMenuOpen(false);
    resetCode();
    clearVersionHistory();
    clearCompilation();
  };

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

      {/* File menu */}
      <div ref={fileMenuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setFileMenuOpen(!fileMenuOpen)}
          aria-label="Menu"
          style={{
            padding: '4px 6px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            color: '#ccc',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="3" width="14" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="8" width="14" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="13" width="14" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        {fileMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: '#1e1e2e',
              border: '1px solid #444',
              borderRadius: '6px',
              padding: '4px 0',
              minWidth: '160px',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={handleNew}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: '#e0e0e0',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              New
            </button>
          </div>
        )}
      </div>

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
