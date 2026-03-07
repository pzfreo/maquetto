import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store';
import { EngineStatusBadge } from './EngineStatusBadge';
import { ProviderSettingsModal } from '../Settings/ProviderSettingsModal';
import { signInWithGoogle } from '../../lib/auth-actions';
import type { AIProviderType } from '@maquetto/api-types';

interface ToolbarProps {
  onCompile?: () => void;
  onRetryEngine?: () => void;
}

export function Toolbar({ onCompile, onRetryEngine }: ToolbarProps) {
  const enginePhase = useAppStore((s) => s.engineStatus.phase);
  const compilationStatus = useAppStore((s) => s.compilationStatus);
  const qualityLevel = useAppStore((s) => s.qualityLevel);
  const setQualityLevel = useAppStore((s) => s.setQualityLevel);
  const aiProvider = useAppStore((s) => s.aiProvider);
  const setAIProvider = useAppStore((s) => s.setAIProvider);
  const authUser = useAppStore((s) => s.authUser);
  const providerToken = useAppStore((s) => s.providerToken);
  const resetCode = useAppStore((s) => s.resetCode);
  const clearVersionHistory = useAppStore((s) => s.clearVersionHistory);
  const clearCompilation = useAppStore((s) => s.clearCompilation);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  const isReady = enginePhase === 'ready';
  const isCompiling = compilationStatus === 'compiling';

  // Determine which AI providers are available
  const hasGoogleOAuth = authUser?.provider === 'google' && !!providerToken;
  const hasGoogleKey = aiProvider.type === 'google' && !hasGoogleOAuth;
  const hasAnthropicKey = !!localStorage.getItem('maquetto:anthropic-key');

  // Check if there's a stored Anthropic key (persisted separately from active provider)
  const storedAnthropicKey = useRef<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem('maquetto:ai-provider');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.type === 'anthropic' && parsed.credential) {
          storedAnthropicKey.current = parsed.credential;
        }
      } catch { /* ignore */ }
    }
  }, [aiProvider]);

  const availableProviders: { type: AIProviderType; label: string; active: boolean }[] = [];
  if (hasGoogleOAuth || hasGoogleKey) {
    availableProviders.push({
      type: 'google',
      label: hasGoogleOAuth ? 'Gemini (Google)' : 'Gemini (API key)',
      active: aiProvider.type === 'google',
    });
  }
  if (hasAnthropicKey || aiProvider.type === 'anthropic') {
    availableProviders.push({
      type: 'anthropic',
      label: 'Claude (API key)',
      active: aiProvider.type === 'anthropic',
    });
  }

  const activeProvider = availableProviders.find((p) => p.active);

  // Close menus on outside click
  useEffect(() => {
    if (!fileMenuOpen && !aiMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (fileMenuOpen && fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
      if (aiMenuOpen && aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setAiMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [fileMenuOpen, aiMenuOpen]);

  const handleNew = () => {
    setFileMenuOpen(false);
    resetCode();
    clearVersionHistory();
    clearCompilation();
  };

  const handleSwitchProvider = (type: AIProviderType) => {
    setAiMenuOpen(false);
    if (type === 'google' && hasGoogleOAuth) {
      setAIProvider({ type: 'google', credential: providerToken! });
    } else if (type === 'anthropic' && storedAnthropicKey.current) {
      setAIProvider({ type: 'anthropic', credential: storedAnthropicKey.current });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch { /* logged in signInWithGoogle */ }
  };

  const menuItemStyle = {
    display: 'block' as const,
    width: '100%',
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '4px',
    background: '#1e1e2e',
    border: '1px solid #444',
    borderRadius: '6px',
    padding: '4px 0',
    minWidth: '180px',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
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
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 600,
          fontSize: '15px',
          color: '#e0e0e0',
          marginRight: '8px',
        }}
      >
        <img src="/logo.svg" alt="" width={22} height={22} />
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
          <div style={{ ...dropdownStyle, left: 0, right: 'auto' }}>
            <button
              onClick={handleNew}
              style={menuItemStyle}
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

      {/* AI provider indicator / switcher */}
      {activeProvider ? (
        <div ref={aiMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => availableProviders.length > 1 ? setAiMenuOpen(!aiMenuOpen) : setSettingsOpen(true)}
            style={{
              padding: '3px 10px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: aiProvider.type === 'google' ? '#4285f4' : '#d97706',
              background: 'transparent',
              color: aiProvider.type === 'google' ? '#4285f4' : '#d97706',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {activeProvider.label}
            {availableProviders.length > 1 && <span style={{ fontSize: '9px' }}>▼</span>}
          </button>
          {aiMenuOpen && availableProviders.length > 1 && (
            <div style={dropdownStyle}>
              {availableProviders.map((p) => (
                <button
                  key={p.type}
                  onClick={() => handleSwitchProvider(p.type)}
                  style={{
                    ...menuItemStyle,
                    color: p.active ? '#fff' : '#aaa',
                    fontWeight: p.active ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {p.active ? '● ' : '○ '}{p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <span style={{ fontSize: '11px', color: '#666' }}>No AI</span>
      )}

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

      {/* Auth / sign-in */}
      {authUser ? (
        <button
          onClick={() => setSettingsOpen(true)}
          title={authUser.email ?? 'Account'}
          style={{
            padding: '3px 10px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: 'transparent',
            color: '#ccc',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            maxWidth: '180px',
          }}
        >
          {authUser.avatarUrl && (
            <img src={authUser.avatarUrl} alt="" width={18} height={18} style={{ borderRadius: '50%' }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {authUser.email ?? authUser.name}
          </span>
        </button>
      ) : (
        <button
          onClick={handleGoogleSignIn}
          style={{
            padding: '3px 10px',
            borderRadius: '4px',
            border: 'none',
            background: '#4285f4',
            color: '#fff',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Sign in
        </button>
      )}

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

      <span
        title={`Build ${__BUILD_NUMBER__} (${__COMMIT_HASH__})`}
        style={{
          fontSize: '10px',
          color: '#555',
          fontFamily: 'monospace',
          userSelect: 'none',
        }}
      >
        b{__BUILD_NUMBER__}
      </span>

      <ProviderSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
