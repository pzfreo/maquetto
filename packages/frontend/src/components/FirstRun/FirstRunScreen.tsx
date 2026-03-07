import { useState } from 'react';
import { useAppStore } from '../../store';
import { signInWithGoogle } from '../../lib/auth-actions';

const FIRST_RUN_KEY = 'maquetto:first-run-complete';

export function useFirstRun() {
  const [isFirstRun] = useState(() => {
    return !localStorage.getItem(FIRST_RUN_KEY);
  });
  const aiProvider = useAppStore((s) => s.aiProvider);
  const authUser = useAppStore((s) => s.authUser);

  // Show first-run if never completed AND no auth AND no AI provider
  return isFirstRun && aiProvider.type === 'none' && !authUser;
}

function completeFirstRun() {
  localStorage.setItem(FIRST_RUN_KEY, 'true');
}

interface FirstRunScreenProps {
  onComplete: () => void;
}

export function FirstRunScreen({ onComplete }: FirstRunScreenProps) {
  const setAIProvider = useAppStore((s) => s.setAIProvider);
  const [showAnthropicInput, setShowAnthropicInput] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showGeminiKeyInput, setShowGeminiKeyInput] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // OAuth redirect will happen — onComplete called after redirect via auth listener
      completeFirstRun();
    } catch {
      // Error already logged in signInWithGoogle
    }
  };

  const handleGeminiKey = () => {
    if (!geminiKey.trim()) return;
    setAIProvider({ type: 'google', credential: geminiKey.trim() });
    completeFirstRun();
    onComplete();
  };

  const handleAnthropicKey = () => {
    if (!anthropicKey.trim()) return;
    setAIProvider({ type: 'anthropic', credential: anthropicKey.trim() });
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
        <img src="/logo.svg" alt="" width={64} height={64} style={{ marginBottom: '16px' }} />
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
          {/* Google Sign In (for auth / cloud save) */}
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
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          <p style={{ fontSize: '11px', color: '#666', margin: '0' }}>
            Sign in to save your work to the cloud
          </p>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '8px 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#333' }} />
            <span style={{ fontSize: '12px', color: '#666' }}>set up AI assistant</span>
            <div style={{ flex: 1, height: '1px', background: '#333' }} />
          </div>

          {/* Gemini API Key (free from aistudio.google.com) */}
          <div>
            {!showGeminiKeyInput ? (
              <button
                onClick={() => setShowGeminiKeyInput(true)}
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
                Use Gemini API Key
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Gemini API key..."
                  autoFocus
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #4285f4',
                    background: '#1e1e2e',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleGeminiKey}
                  disabled={!geminiKey.trim()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: geminiKey.trim() ? '#4285f4' : '#333',
                    color: geminiKey.trim() ? '#fff' : '#888',
                    fontSize: '14px',
                    cursor: geminiKey.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Connect
                </button>
              </div>
            )}
          </div>

          {/* Anthropic (Secondary) */}
          <div>
            {!showAnthropicInput ? (
              <button
                onClick={() => setShowAnthropicInput(true)}
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
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api..."
                  autoFocus
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
                  disabled={!anthropicKey.trim()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: anthropicKey.trim() ? '#d97706' : '#333',
                    color: anthropicKey.trim() ? '#fff' : '#888',
                    fontSize: '14px',
                    cursor: anthropicKey.trim() ? 'pointer' : 'not-allowed',
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
