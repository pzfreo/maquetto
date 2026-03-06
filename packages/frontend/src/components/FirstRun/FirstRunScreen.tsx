import { useState } from 'react';
import { useAppStore } from '../../store';

const FIRST_RUN_KEY = 'maquetto:first-run-complete';

export function useFirstRun() {
  const [isFirstRun] = useState(() => {
    return !localStorage.getItem(FIRST_RUN_KEY);
  });
  const aiProvider = useAppStore((s) => s.aiProvider);

  return isFirstRun && aiProvider.type === 'none';
}

function completeFirstRun() {
  localStorage.setItem(FIRST_RUN_KEY, 'true');
}

interface FirstRunScreenProps {
  onComplete: () => void;
}

export function FirstRunScreen({ onComplete }: FirstRunScreenProps) {
  const setAIProvider = useAppStore((s) => s.setAIProvider);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth in Phase 7
    // For now, set provider type to trigger the flow
    setAIProvider({ type: 'google', credential: '' });
    completeFirstRun();
    onComplete();
  };

  const handleAnthropicKey = () => {
    if (!apiKey.trim()) return;
    setAIProvider({ type: 'anthropic', credential: apiKey.trim() });
    completeFirstRun();
    onComplete();
  };

  const handleSkip = () => {
    setAIProvider({ type: 'none' });
    completeFirstRun();
    onComplete();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e0e0e0',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '8px',
            color: '#fff',
          }}
        >
          Maquetto
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: '#aaa',
            marginBottom: '40px',
            lineHeight: 1.6,
          }}
        >
          AI-powered CAD IDE for Build123d.
          <br />
          Write Python code, see real-time 3D previews,
          <br />
          and use AI to modify designs through natural language.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Google Sign-In (Primary) */}
          <button
            onClick={handleGoogleSignIn}
            style={{
              padding: '14px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#4285f4',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            Sign in with Google
          </button>
          <p style={{ fontSize: '11px', color: '#666', margin: '0' }}>
            Uses Gemini AI — free tier available, no API key needed
          </p>

          {/* Anthropic (Secondary) */}
          <div style={{ marginTop: '16px' }}>
            {!showKeyInput ? (
              <button
                onClick={() => setShowKeyInput(true)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  background: 'transparent',
                  color: '#ccc',
                  fontSize: '14px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Use Anthropic API Key
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api..."
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#1e1e2e',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleAnthropicKey}
                  disabled={!apiKey.trim()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: apiKey.trim() ? '#d97706' : '#333',
                    color: apiKey.trim() ? '#fff' : '#888',
                    fontSize: '14px',
                    cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Connect
                </button>
                <p style={{ fontSize: '11px', color: '#666', margin: '0' }}>
                  Key stored locally, never sent to any third party
                </p>
              </div>
            )}
          </div>

          {/* Skip */}
          <button
            onClick={handleSkip}
            style={{
              marginTop: '20px',
              padding: '8px',
              background: 'transparent',
              border: 'none',
              color: '#666',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Skip for now — use editor only
          </button>
        </div>
      </div>
    </div>
  );
}
