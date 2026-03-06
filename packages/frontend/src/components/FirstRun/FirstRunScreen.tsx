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
  const [showGeminiInput, setShowGeminiInput] = useState(false);
  const [showAnthropicInput, setShowAnthropicInput] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

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
          {/* Google Gemini (Primary) */}
          <div>
            {!showGeminiInput ? (
              <button
                onClick={() => setShowGeminiInput(true)}
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
                }}
              >
                Use Google Gemini
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
            <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0' }}>
              Free API key from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4a9eff' }}
              >
                aistudio.google.com
              </a>
            </p>
          </div>

          {/* Anthropic (Secondary) */}
          <div style={{ marginTop: '16px' }}>
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
