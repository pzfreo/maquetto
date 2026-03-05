import { useState } from 'react';
import { useAppStore } from '../../store';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProviderSettingsModal({
  isOpen,
  onClose,
}: ProviderSettingsModalProps) {
  const aiProvider = useAppStore((s) => s.aiProvider);
  const setAIProvider = useAppStore((s) => s.setAIProvider);
  const [apiKey, setApiKey] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth in Phase 7
    setAIProvider({ type: 'google', credential: '' });
    onClose();
  };

  const handleAnthropicKey = () => {
    if (!apiKey.trim()) return;
    setAIProvider({ type: 'anthropic', credential: apiKey.trim() });
    setApiKey('');
    onClose();
  };

  const handleDisconnect = () => {
    setAIProvider({ type: 'none' });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#1e1e2e',
          borderRadius: '12px',
          padding: '28px',
          maxWidth: '400px',
          width: '90%',
          border: '1px solid #333',
        }}
      >
        <h2
          style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#e0e0e0',
          }}
        >
          AI Provider Settings
        </h2>

        {/* Current provider */}
        <div
          style={{
            marginBottom: '20px',
            padding: '10px 14px',
            borderRadius: '6px',
            background: '#16162a',
            fontSize: '13px',
          }}
        >
          <span style={{ color: '#888' }}>Current: </span>
          <span style={{ color: '#e0e0e0', fontWeight: 500 }}>
            {aiProvider.type === 'none'
              ? 'None'
              : aiProvider.type === 'google'
                ? 'Google Gemini'
                : 'Anthropic Claude'}
          </span>
          {aiProvider.type !== 'none' && (
            <button
              onClick={handleDisconnect}
              style={{
                marginLeft: '12px',
                padding: '2px 8px',
                borderRadius: '3px',
                border: '1px solid #f44336',
                background: 'transparent',
                color: '#f44336',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '6px',
            border: 'none',
            background: '#4285f4',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          Sign in with Google (Gemini)
        </button>

        {/* Anthropic */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
          }}
        >
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Anthropic API key..."
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #444',
              background: '#0d0d1a',
              color: '#e0e0e0',
              fontSize: '13px',
              fontFamily: 'monospace',
              outline: 'none',
            }}
          />
          <button
            onClick={handleAnthropicKey}
            disabled={!apiKey.trim()}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: apiKey.trim() ? '#d97706' : '#333',
              color: apiKey.trim() ? '#fff' : '#888',
              fontSize: '13px',
              cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #444',
            background: 'transparent',
            color: '#888',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
