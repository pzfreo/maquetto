import { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { signInWithGoogle } from '../../lib/auth-actions';
import { CAD_SYSTEM_PROMPT } from '../../ai/system-prompt';

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
  const authUser = useAppStore((s) => s.authUser);
  const signOut = useAppStore((s) => s.signOut);
  const customSystemPrompt = useAppStore((s) => s.customSystemPrompt);
  const setCustomSystemPrompt = useAppStore((s) => s.setCustomSystemPrompt);
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [promptDraft, setPromptDraft] = useState('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Sync draft with store when modal opens
  useEffect(() => {
    if (isOpen) {
      setPromptDraft(customSystemPrompt ?? '');
      setShowPromptEditor(!!customSystemPrompt);
    }
  }, [isOpen, customSystemPrompt]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // Error logged in signInWithGoogle
    }
  };

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

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  const inputStyle = {
    flex: 1,
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #444',
    background: '#0d0d1a',
    color: '#e0e0e0',
    fontSize: '13px',
    fontFamily: 'monospace',
    outline: 'none',
  } as const;

  const sectionStyle = {
    marginBottom: '16px',
    padding: '12px',
    borderRadius: '8px',
    background: '#16162a',
  } as const;

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
          maxWidth: '520px',
          width: '90%',
          maxHeight: '85vh',
          overflowY: 'auto',
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
          Settings
        </h2>

        {/* Account section */}
        <div style={sectionStyle}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Account
          </div>
          {authUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {authUser.avatarUrl && (
                <img
                  src={authUser.avatarUrl}
                  alt=""
                  width={28}
                  height={28}
                  style={{ borderRadius: '50%' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#e0e0e0' }}>
                  {authUser.name ?? authUser.email}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {authUser.provider === 'google' ? 'Google' : 'GitHub'}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #f44336',
                  background: 'transparent',
                  color: '#f44336',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#4285f4',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#fff"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#fff" opacity="0.8"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#fff" opacity="0.6"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#fff" opacity="0.9"/>
              </svg>
              Sign in with Google
            </button>
          )}
        </div>

        {/* AI Provider section */}
        <div style={sectionStyle}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            AI Provider
          </div>
          <div style={{ fontSize: '13px', marginBottom: '10px' }}>
            <span style={{ color: '#888' }}>Current: </span>
            <span style={{ color: '#e0e0e0', fontWeight: 500 }}>
              {aiProvider.type === 'none'
                ? 'None'
                : aiProvider.type === 'google'
                  ? 'Google Gemini (API key)'
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

          {/* Gemini API key */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Gemini API key..."
              style={inputStyle}
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

          {/* Anthropic API key */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="Anthropic API key..."
              style={inputStyle}
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

          <p style={{ fontSize: '11px', color: '#666', margin: '8px 0 0 0' }}>
            Keys are stored locally in your browser and never sent to our servers.
          </p>
        </div>

        {/* System Prompt section */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              System Prompt
            </div>
            {!showPromptEditor ? (
              <button
                onClick={() => { setShowPromptEditor(true); setPromptDraft(customSystemPrompt ?? CAD_SYSTEM_PROMPT); }}
                style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  border: '1px solid #444',
                  background: 'transparent',
                  color: '#aaa',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {customSystemPrompt ? 'Edit' : 'Customize'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    const trimmed = promptDraft.trim();
                    setCustomSystemPrompt(trimmed === CAD_SYSTEM_PROMPT || !trimmed ? null : trimmed);
                    setShowPromptEditor(false);
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '3px',
                    border: 'none',
                    background: '#4a9eff',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                {customSystemPrompt && (
                  <button
                    onClick={() => {
                      setCustomSystemPrompt(null);
                      setPromptDraft('');
                      setShowPromptEditor(false);
                    }}
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
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setShowPromptEditor(false)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '3px',
                    border: '1px solid #444',
                    background: 'transparent',
                    color: '#888',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {showPromptEditor ? (
            <textarea
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#0d0d1a',
                color: '#e0e0e0',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
              {customSystemPrompt ? 'Using custom system prompt.' : 'Using default system prompt.'}
            </p>
          )}
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
