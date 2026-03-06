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
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

  if (!isOpen) return null;

  const handleGeminiKey = () => {
    if (!geminiKey.trim()) return;
    setAIProvider({ type: 'google', credential: geminiKey.trim() });
    setGeminiKey('');
    onClose();
  };

  const handleAnthropicKey = () => {
    if (!anthropicKey.trim()) return;
    setAIProvider({ type: 'anthropic', credential: anthropicKey.trim() });
    setAnthropicKey('');
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

        {/* Google Gemini */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="Gemini API key..."
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
            onClick={handleGeminiKey}
            disabled={!geminiKey.trim()}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: geminiKey.trim() ? '#4285f4' : '#333',
              color: geminiKey.trim() ? '#fff' : '#888',
              fontSize: '13px',
              cursor: geminiKey.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>

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
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
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
            disabled={!anthropicKey.trim()}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: anthropicKey.trim() ? '#d97706' : '#333',
              color: anthropicKey.trim() ? '#fff' : '#888',
              fontSize: '13px',
              cursor: anthropicKey.trim() ? 'pointer' : 'not-allowed',
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
