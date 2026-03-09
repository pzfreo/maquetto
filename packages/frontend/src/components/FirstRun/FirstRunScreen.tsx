import { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { signInWithGoogleAI } from '../../lib/auth-actions';
import { setPendingGoogleAI, clearPendingGoogleAI } from '../../hooks/useAuthListener';

const FIRST_RUN_KEY = 'maquetto:first-run-complete';

export function useFirstRun() {
  const [isFirstRun] = useState(() => {
    return !localStorage.getItem(FIRST_RUN_KEY);
  });
  const aiProvider = useAppStore((s) => s.aiProvider);
  const authUser = useAppStore((s) => s.authUser);

  // If the user chose "Google + Gemini" but the AI provider hasn't been
  // configured yet, keep showing first-run. Without this, onAuthStateChange
  // sets authUser (dismissing the screen) before the provider_token arrives.
  const pendingGoogleAI = localStorage.getItem('maquetto:pending-google-ai') === 'true';
  if (isFirstRun && pendingGoogleAI && aiProvider.type === 'none') {
    return true;
  }

  // Show first-run if never completed AND no auth AND no AI provider
  return isFirstRun && aiProvider.type === 'none' && !authUser;
}

function completeFirstRun() {
  localStorage.setItem(FIRST_RUN_KEY, 'true');
}

interface FirstRunScreenProps {
  onComplete: () => void;
}

type BYOKProvider = 'gemini' | 'claude';

export function FirstRunScreen({ onComplete }: FirstRunScreenProps) {
  const setAIProvider = useAppStore((s) => s.setAIProvider);
  const [apiKey, setApiKey] = useState('');
  const [byokProvider, setByokProvider] = useState<BYOKProvider>('gemini');
  const [connectingGemini, setConnectingGemini] = useState(false);

  // Safety timeout: if pending flag is set but provider never arrives,
  // clear the flag after 60s so the user isn't stuck on this screen.
  useEffect(() => {
    if (!connectingGemini) return;
    const timeout = setTimeout(() => {
      if (useAppStore.getState().aiProvider.type === 'none') {
        console.warn('[FirstRun] Timed out waiting for Google AI provider');
        clearPendingGoogleAI();
        setConnectingGemini(false);
      }
    }, 60_000);
    return () => clearTimeout(timeout);
  }, [connectingGemini]);

  const handleBYOKConnect = () => {
    const key = apiKey.trim();
    if (!key) return;
    if (byokProvider === 'gemini') {
      setAIProvider({ type: 'google', credential: key });
    } else {
      setAIProvider({ type: 'anthropic', credential: key });
    }
    completeFirstRun();
    onComplete();
  };

  const handleGoogleGemini = async () => {
    setConnectingGemini(true);
    try {
      setPendingGoogleAI();
      await signInWithGoogleAI();
      completeFirstRun();
    } catch {
      clearPendingGoogleAI();
      setConnectingGemini(false);
    }
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

  const placeholder = byokProvider === 'gemini' ? 'AIza...' : 'sk-ant-api...';
  const keyHelpUrl = byokProvider === 'gemini'
    ? 'https://aistudio.google.com/apikey'
    : 'https://platform.claude.com/';
  const keyHelpLabel = byokProvider === 'gemini'
    ? 'Google AI Studio'
    : 'platform.claude.com';

  const tabStyle = (active: boolean) => ({
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px 8px 0 0',
    border: 'none',
    borderBottom: active ? '2px solid #4a9eff' : '2px solid transparent',
    background: active ? '#2a2a4e' : 'transparent',
    color: active ? '#fff' : '#888',
    fontSize: '14px',
    fontWeight: active ? 600 : 400 as const,
    cursor: 'pointer',
  });

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
        <img src="/logo.svg" alt="Maquetto" width={96} height={96} style={{ marginBottom: '20px' }} />
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
            marginBottom: '36px',
            lineHeight: 1.6,
          }}
        >
          AI-powered CAD IDE for Build123d.
          <br />
          Write Python code, see real-time 3D previews,
          <br />
          and use AI to modify designs through natural language.
        </p>

        {/* Primary: BYOK card */}
        <div
          style={{
            borderRadius: '12px',
            border: '1px solid #4a4a6a',
            background: '#1e1e3a',
            overflow: 'hidden',
            marginBottom: '20px',
          }}
        >
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#ccc',
              margin: 0,
              padding: '16px 16px 12px',
            }}
          >
            Connect your AI
          </h2>

          {/* Provider tabs */}
          <div style={{ display: 'flex', padding: '0 16px' }}>
            <button
              onClick={() => { setByokProvider('gemini'); setApiKey(''); }}
              style={tabStyle(byokProvider === 'gemini')}
            >
              Google Gemini
            </button>
            <button
              onClick={() => { setByokProvider('claude'); setApiKey(''); }}
              style={tabStyle(byokProvider === 'claude')}
            >
              Anthropic Claude
            </button>
          </div>

          {/* API key input */}
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={placeholder}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBYOKConnect(); }}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #555',
                  background: '#12122a',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleBYOKConnect}
                disabled={!apiKey.trim()}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: apiKey.trim() ? '#4a9eff' : '#333',
                  color: apiKey.trim() ? '#fff' : '#888',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                }}
              >
                Go
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#666', margin: '10px 0 0 0', textAlign: 'left' }}>
              Get a key from <a href={keyHelpUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff' }}>{keyHelpLabel}</a>.
              Stored locally in your browser, never sent to our servers.
            </p>
          </div>
        </div>

        {/* Secondary: Google + Gemini OAuth */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '0 0 16px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#4a4a6a' }} />
          <span style={{ fontSize: '12px', color: '#666' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#4a4a6a' }} />
        </div>

        <button
          onClick={handleGoogleGemini}
          disabled={connectingGemini}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: '1px solid #556',
            background: 'transparent',
            color: connectingGemini ? '#888' : '#ccc',
            fontSize: '14px',
            fontWeight: 500,
            cursor: connectingGemini ? 'not-allowed' : 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          {googleIcon('#ccc')}
          {connectingGemini ? 'Connecting...' : 'Sign in with Google + Gemini AI'}
        </button>
        <p style={{ fontSize: '11px', color: '#555', margin: '8px 0 0 0' }}>
          One-click sign-in for free Gemini AI and cloud save. No API key needed.
        </p>

        <p style={{ fontSize: '11px', color: '#666', margin: '16px 0 0 0', lineHeight: 1.5 }}>
          <a href="/privacy.html" target="_blank" style={{ color: '#4a9eff' }}>Privacy policy</a>
          {' · '}
          Sign in with Google anytime later for cloud save.
        </p>

        {/* Skip */}
        <button
          onClick={handleSkip}
          style={{
            marginTop: '16px',
            padding: '8px',
            background: 'transparent',
            border: 'none',
            color: '#555',
            fontSize: '13px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Skip — use editor only
        </button>
      </div>
    </div>
  );
}
