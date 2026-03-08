import { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { signInWithGoogle, signInWithGoogleAI } from '../../lib/auth-actions';

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
  const providerToken = useAppStore((s) => s.providerToken);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showClaudeFlow, setShowClaudeFlow] = useState(false);
  const [connectingGemini, setConnectingGemini] = useState(false);
  const [signingInForClaude, setSigningInForClaude] = useState(false);

  // Auto-connect AI provider when Google AI OAuth completes
  useEffect(() => {
    if (connectingGemini && providerToken) {
      setAIProvider({ type: 'google-oauth', credential: providerToken });
      setConnectingGemini(false);
      completeFirstRun();
      onComplete();
    }
  }, [connectingGemini, providerToken, setAIProvider, onComplete]);

  const handleGoogleGemini = async () => {
    setConnectingGemini(true);
    try {
      await signInWithGoogleAI();
    } catch {
      setConnectingGemini(false);
    }
  };

  const handleGoogleForClaude = async () => {
    setSigningInForClaude(true);
    try {
      await signInWithGoogle();
      completeFirstRun();
      // After sign-in, show the Claude key input
    } catch {
      setSigningInForClaude(false);
    }
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

  const googleIcon = (fill: string) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill={fill}/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill={fill} opacity="0.8"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill={fill} opacity="0.6"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill={fill} opacity="0.9"/>
    </svg>
  );

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
          {/* Option 1: Google + Gemini (one click, everything works) */}
          <button
            onClick={handleGoogleGemini}
            disabled={connectingGemini}
            style={{
              padding: '14px 24px',
              borderRadius: '8px',
              border: 'none',
              background: connectingGemini ? '#333' : '#4285f4',
              color: connectingGemini ? '#888' : '#fff',
              fontSize: '15px',
              fontWeight: 500,
              cursor: connectingGemini ? 'not-allowed' : 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            {googleIcon('#fff')}
            {connectingGemini ? 'Connecting...' : 'Sign in with Google + Gemini AI'}
          </button>
          <p style={{ fontSize: '11px', color: '#666', margin: '0' }}>
            One sign-in for cloud save and AI. No API key needed.
          </p>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '4px 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#333' }} />
            <span style={{ fontSize: '12px', color: '#666' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#333' }} />
          </div>

          {/* Option 2: Google + Claude */}
          {!showClaudeFlow ? (
            <>
              <button
                onClick={() => setShowClaudeFlow(true)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #d97706',
                  background: 'transparent',
                  color: '#d97706',
                  fontSize: '14px',
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
                  <rect width="18" height="18" rx="4" fill="#d97706"/>
                  <text x="9" y="14" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">A</text>
                </svg>
                Sign in with Google + Claude AI
              </button>
              <p style={{ fontSize: '11px', color: '#666', margin: '0' }}>
                Cloud save via Google, AI powered by Anthropic Claude.
              </p>
            </>
          ) : (
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #d97706',
                background: '#1a1a2e',
              }}
            >
              <p style={{ fontSize: '13px', color: '#ccc', margin: '0 0 12px 0', textAlign: 'left' }}>
                Step 1: Sign in with Google for cloud save
              </p>
              <button
                onClick={handleGoogleForClaude}
                disabled={signingInForClaude}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: signingInForClaude ? '#333' : '#4285f4',
                  color: signingInForClaude ? '#888' : '#fff',
                  fontSize: '13px',
                  cursor: signingInForClaude ? 'not-allowed' : 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                {googleIcon('#fff')}
                {signingInForClaude ? 'Signing in...' : 'Sign in with Google'}
              </button>

              <p style={{ fontSize: '13px', color: '#ccc', margin: '0 0 8px 0', textAlign: 'left' }}>
                Step 2: Enter your Claude API key
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api..."
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAnthropicKey(); }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #d97706',
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
                    flexShrink: 0,
                  }}
                >
                  Connect
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#666', margin: '8px 0 0 0', textAlign: 'left' }}>
                Get a key from console.anthropic.com. Stored locally, never sent to our servers.
              </p>
            </div>
          )}

          <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0 0', lineHeight: 1.5 }}>
            <a href="/privacy.html" target="_blank" style={{ color: '#4a9eff' }}>Privacy policy</a>
          </p>

          {/* Skip */}
          <button
            onClick={handleSkip}
            style={{
              marginTop: '12px',
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
