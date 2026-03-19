interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  const linkStyle = { color: '#4a9eff', textDecoration: 'none' };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#1e1e2e',
          borderRadius: '12px',
          border: '1px solid #333',
          width: '520px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          padding: '28px 32px',
          color: '#ccc',
          fontSize: '14px',
          lineHeight: 1.7,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#e0e0e0' }}>
            Maquetto
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            x
          </button>
        </div>

        <p style={{ color: '#aaa', margin: '0 0 16px' }}>
          AI-powered CAD IDE for 3D modeling in your browser.
        </p>

        <p>
          Maquetto lets you write parametric 3D models in Python using{' '}
          <a href="https://build123d.readthedocs.io/" target="_blank" rel="noopener noreferrer" style={linkStyle}>Build123d</a>,
          powered by OpenCASCADE via WebAssembly. See real-time 3D previews as you code,
          and use AI to modify designs through natural language with spatial context from the viewport.
        </p>

        <p>
          Everything runs locally in your browser — no installation required.
          Export to STL or STEP for 3D printing or further CAD work.
          Sign in with Google for cloud project storage and free access to Gemini AI,
          or bring your own API key for Gemini or Claude.
        </p>

        <div style={{ margin: '20px 0', height: '1px', background: '#333' }} />

        <div style={{ fontSize: '13px' }}>
          <p style={{ margin: '0 0 8px' }}>
            <a href="https://github.com/pzfreo/maquetto" target="_blank" rel="noopener noreferrer" style={linkStyle}>GitHub</a>
            {' · '}
            <a href="https://github.com/pzfreo/maquetto/issues" target="_blank" rel="noopener noreferrer" style={linkStyle}>Report an Issue</a>
            {' · '}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={linkStyle}>Privacy</a>
            {' · '}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={linkStyle}>Terms</a>
          </p>
          <p style={{ margin: 0, color: '#666' }}>
            Created by Paul Fremantle
          </p>
        </div>
      </div>
    </div>
  );
}
