import { useAppStore } from '../../store';

export function CompilationErrors() {
  const errors = useAppStore((s) => s.errors);
  const warnings = useAppStore((s) => s.warnings);
  const compilationStatus = useAppStore((s) => s.compilationStatus);
  const executionTimeMs = useAppStore((s) => s.executionTimeMs);

  if (compilationStatus === 'idle') return null;

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div
      style={{
        flexShrink: 0,
        maxHeight: '120px',
        overflowY: 'auto',
        borderTop: '1px solid #2a2a3e',
        background: '#16162a',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      {/* Status bar */}
      <div
        style={{
          padding: '4px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom:
            hasErrors || hasWarnings ? '1px solid #2a2a3e' : 'none',
        }}
      >
        {compilationStatus === 'compiling' && (
          <span style={{ color: '#ffa726' }}>Compiling...</span>
        )}
        {compilationStatus === 'success' && (
          <span style={{ color: '#66bb6a' }}>
            OK {executionTimeMs !== null ? `(${executionTimeMs}ms)` : ''}
          </span>
        )}
        {compilationStatus === 'error' && (
          <span style={{ color: '#f44336' }}>
            {errors.length} error{errors.length !== 1 ? 's' : ''}
          </span>
        )}
        {hasWarnings && (
          <span style={{ color: '#ffa726' }}>
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error list */}
      {errors.map((err, i) => (
        <div
          key={i}
          style={{
            padding: '3px 12px',
            color: '#f44336',
            whiteSpace: 'pre-wrap',
          }}
        >
          {err.line !== null ? `Line ${err.line}: ` : ''}
          {err.message}
        </div>
      ))}

      {/* Warning list */}
      {warnings.map((w, i) => (
        <div
          key={`w-${i}`}
          style={{
            padding: '3px 12px',
            color: '#ffa726',
          }}
        >
          {w}
        </div>
      ))}
    </div>
  );
}
