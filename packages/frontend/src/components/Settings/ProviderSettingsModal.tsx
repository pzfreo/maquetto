import { useState, useEffect } from 'react';
import { AI_MODELS, DEFAULT_MODEL } from '@maquetto/api-types';
import type { AIProviderType } from '@maquetto/api-types';
import { useAppStore } from '../../store';
import { signInWithGoogle, signInWithGoogleAI } from '../../lib/auth-actions';
import { setPendingGoogleAI } from '../../hooks/useAuthListener';
import { CAD_SYSTEM_PROMPT } from '../../ai/system-prompt';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProviderOption = 'google-oauth' | 'google' | 'anthropic';

export function ProviderSettingsModal({
  isOpen,
  onClose,
}: ProviderSettingsModalProps) {
  const aiProvider = useAppStore((s) => s.aiProvider);
  const setAIProvider = useAppStore((s) => s.setAIProvider);
  const credentialStatus = useAppStore((s) => s.credentialStatus);
  const credentialError = useAppStore((s) => s.credentialError);
  const authUser = useAppStore((s) => s.authUser);
  const signOut = useAppStore((s) => s.signOut);
  const customSystemPrompt = useAppStore((s) => s.customSystemPrompt);
  const setCustomSystemPrompt = useAppStore((s) => s.setCustomSystemPrompt);
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [promptDraft, setPromptDraft] = useState('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [connectingGoogleAI, setConnectingGoogleAI] = useState(false);

  // Sync draft with store when modal opens
  useEffect(() => {
    if (isOpen) {
      setPromptDraft(customSystemPrompt ?? '');
      setShowPromptEditor(!!customSystemPrompt);
    }
  }, [isOpen, customSystemPrompt]);

  const statusLabel = (provider: ProviderOption) => {
    if (activeProvider !== provider) return null;
    switch (credentialStatus) {
      case 'checking':
        return <span style={{ fontSize: '10px', color: '#888', fontWeight: 400 }}>Checking...</span>;
      case 'valid':
        return <span style={{ fontSize: '10px', color: '#4caf50', fontWeight: 400 }}>Connected</span>;
      case 'invalid':
        return <span style={{ fontSize: '10px', color: '#f44336', fontWeight: 400 }} title={credentialError ?? undefined}>Invalid credential</span>;
      default:
        return <span style={{ fontSize: '10px', color: '#4caf50', fontWeight: 400 }}>Connected</span>;
    }
  };

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // Error logged in signInWithGoogle
    }
  };

  const handleConnectGoogleAI = async () => {
    setConnectingGoogleAI(true);
    try {
      setPendingGoogleAI();
      await signInWithGoogleAI();
    } catch {
      setConnectingGoogleAI(false);
    }
  };

  const handleGeminiKey = () => {
    if (!geminiKey.trim()) return;
    setAIProvider({ type: 'google', credential: geminiKey.trim() });
    setGeminiKey('');
  };

  const handleAnthropicKey = () => {
    if (!anthropicKey.trim()) return;
    setAIProvider({ type: 'anthropic', credential: anthropicKey.trim() });
    setAnthropicKey('');
  };

  const handleDisconnect = () => {
    setAIProvider({ type: 'none' });
  };

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  // Determine which provider option is active
  const activeProvider: ProviderOption | null =
    aiProvider.type === 'none' ? null : aiProvider.type as ProviderOption;

  // Model selector uses the base provider type for lookup
  const modelProvider: Exclude<AIProviderType, 'none'> | null =
    activeProvider ? activeProvider : null;

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

  const sectionLabelStyle = {
    fontSize: '11px',
    color: '#888',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  const providerCardStyle = (isActive: boolean) => ({
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${isActive ? '#4a9eff' : '#333'}`,
    background: isActive ? '#1a1a3e' : '#0d0d1a',
    marginBottom: '8px',
  });

  const providerLabelStyle = (isActive: boolean) => ({
    fontSize: '13px',
    fontWeight: 600 as const,
    color: isActive ? '#4a9eff' : '#e0e0e0',
    marginBottom: '6px',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
  });

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
          <div style={sectionLabelStyle}>Account</div>
          {authUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#4a9eff', color: '#fff', fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, flexShrink: 0,
              }}>
                {(authUser.name ?? authUser.email ?? '?')[0]!.toUpperCase()}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#e0e0e0' }}>
                  {authUser.name ?? authUser.email}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {authUser.provider === 'google' ? 'Google' : 'GitHub'}
                  {aiProvider.type === 'google-oauth' && ' + Gemini AI'}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleConnectGoogleAI}
                disabled={connectingGoogleAI}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: connectingGoogleAI ? '#333' : '#4285f4',
                  color: connectingGoogleAI ? '#888' : '#fff',
                  fontSize: '13px',
                  cursor: connectingGoogleAI ? 'not-allowed' : 'pointer',
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
                {connectingGoogleAI ? 'Connecting...' : 'Sign in with Google + Gemini AI'}
              </button>
              <p style={{ fontSize: '11px', color: '#666', margin: '0', textAlign: 'center' }}>
                Cloud save + AI assistant. No API key needed.
              </p>
              <button
                onClick={handleGoogleSignIn}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #4285f4',
                  background: 'transparent',
                  color: '#4285f4',
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
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285f4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34a853"/>
                  <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#fbbc05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#ea4335"/>
                </svg>
                Sign in with Google
              </button>
              <p style={{ fontSize: '11px', color: '#666', margin: '0', textAlign: 'center' }}>
                Cloud save only. Set up AI separately below.
              </p>
            </div>
          )}
        </div>

        {/* AI Provider section */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={sectionLabelStyle}>AI Provider</div>
            {activeProvider && (
              <button
                onClick={handleDisconnect}
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
                Disconnect
              </button>
            )}
          </div>

          {/* Option 1: Google OAuth */}
          <div style={providerCardStyle(activeProvider === 'google-oauth')}>
            <div style={providerLabelStyle(activeProvider === 'google-oauth')}>
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285f4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34a853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#fbbc05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#ea4335"/>
              </svg>
              Google Gemini (Sign in)
              {statusLabel('google-oauth')}
            </div>
            {activeProvider === 'google-oauth' ? (
              <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>
                Using Google OAuth for Gemini access. No API key needed.
              </p>
            ) : (
              <>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px 0' }}>
                  Sign in with your Google account to use Gemini. Free tier available.
                </p>
                <button
                  onClick={handleConnectGoogleAI}
                  disabled={connectingGoogleAI}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: connectingGoogleAI ? '#333' : '#4285f4',
                    color: connectingGoogleAI ? '#888' : '#fff',
                    fontSize: '12px',
                    cursor: connectingGoogleAI ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {connectingGoogleAI ? 'Connecting...' : 'Connect Google AI'}
                </button>
              </>
            )}
          </div>

          {/* Option 2: Google BYOK */}
          <div style={providerCardStyle(activeProvider === 'google')}>
            <div style={providerLabelStyle(activeProvider === 'google')}>
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285f4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34a853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#fbbc05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#ea4335"/>
              </svg>
              Google Gemini (API Key)
              {statusLabel('google')}
            </div>
            {activeProvider !== 'google' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Gemini API key from aistudio.google.com"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGeminiKey(); }}
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
                    flexShrink: 0,
                  }}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Option 3: Claude BYOK */}
          <div style={providerCardStyle(activeProvider === 'anthropic')}>
            <div style={providerLabelStyle(activeProvider === 'anthropic')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect width="14" height="14" rx="3" fill="#d97706"/>
                <text x="7" y="11" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">A</text>
              </svg>
              Anthropic Claude (API Key)
              {statusLabel('anthropic')}
            </div>
            {activeProvider !== 'anthropic' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="Anthropic API key from console.anthropic.com"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAnthropicKey(); }}
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
                    flexShrink: 0,
                  }}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {credentialStatus === 'invalid' && credentialError && (
            <p style={{ fontSize: '11px', color: '#f44336', margin: '4px 0 0 0' }}>
              {credentialError}. Please check your credential and try again.
            </p>
          )}
          <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0 0' }}>
            API keys are stored locally in your browser and never sent to our servers.
          </p>

          {/* Model selector */}
          {modelProvider && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Model</div>
              <select
                value={aiProvider.modelId || DEFAULT_MODEL[modelProvider]}
                onChange={(e) => setAIProvider({ ...aiProvider, modelId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: '#0d0d1a',
                  color: '#e0e0e0',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {AI_MODELS[modelProvider].map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* System Prompt section */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={sectionLabelStyle}>
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

        {/* Close + Reset row */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
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
          <button
            onClick={async () => {
              if (!window.confirm('Clear all settings and sign out? This will reset the app to the first-run experience.')) return;
              // Clear all maquetto localStorage keys
              const keys = Object.keys(localStorage).filter((k) => k.startsWith('maquetto:'));
              keys.forEach((k) => localStorage.removeItem(k));
              localStorage.removeItem('maquetto:first-run-complete');
              await signOut();
              window.location.reload();
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: '1px solid #f44336',
              background: 'transparent',
              color: '#f44336',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Clear all settings
          </button>
        </div>
      </div>
    </div>
  );
}
