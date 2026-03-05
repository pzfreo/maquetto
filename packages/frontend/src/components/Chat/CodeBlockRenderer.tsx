import { useAppStore } from '../../store';

interface CodeBlockRendererProps {
  code: string;
  language: string;
}

export function CodeBlockRenderer({ code, language }: CodeBlockRendererProps) {
  const setCode = useAppStore((s) => s.setCode);

  const isPython =
    language === 'python' || language === 'py' || language === '';

  const handleApply = () => {
    setCode(code.trim());
  };

  return (
    <div
      style={{
        margin: '8px 0',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid #333',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 10px',
          background: '#1a1a2a',
          fontSize: '11px',
          color: '#888',
        }}
      >
        <span>{language || 'code'}</span>
        {isPython && (
          <button
            onClick={handleApply}
            style={{
              padding: '2px 10px',
              borderRadius: '3px',
              border: '1px solid #4a9eff',
              background: 'transparent',
              color: '#4a9eff',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Apply to Editor
          </button>
        )}
      </div>
      <pre
        style={{
          margin: 0,
          padding: '10px',
          background: '#0d0d1a',
          fontSize: '13px',
          lineHeight: 1.5,
          overflowX: 'auto',
          color: '#d4d4d4',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
