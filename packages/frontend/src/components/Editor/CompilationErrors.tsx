import { useCallback, useState } from 'react';
import { useAppStore } from '../../store';
import type { CompileError } from '@maquetto/api-types';

function formatErrorsForChat(errors: ReadonlyArray<CompileError>): string {
  const lines = errors.map((err) => {
    const loc = err.line !== null ? ` (line ${err.line})` : '';
    const detail = err.traceback ? `\n\nTraceback:\n${err.traceback}` : '';
    return `[${err.type}]${loc}: ${err.message}${detail}`;
  });
  return `My code has compilation errors. Please fix them:\n\n${lines.join('\n\n')}`;
}

export function CompilationErrors() {
  const errors = useAppStore((s) => s.errors);
  const warnings = useAppStore((s) => s.warnings);
  const compilationStatus = useAppStore((s) => s.compilationStatus);
  const executionTimeMs = useAppStore((s) => s.executionTimeMs);
  const consoleOutput = useAppStore((s) => s.consoleOutput);
  const aiProviderType = useAppStore((s) => s.aiProvider.type);
  const setPendingChatMessage = useAppStore((s) => s.setPendingChatMessage);
  const [showConsole, setShowConsole] = useState(false);

  const handleAskAI = useCallback(() => {
    const message = formatErrorsForChat(errors);
    console.log(`[Editor] Sending ${errors.length} errors to AI chat`);
    setPendingChatMessage(message);
  }, [errors, setPendingChatMessage]);

  if (compilationStatus === 'idle') return null;

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasConsoleOutput = !!consoleOutput;
  const canAskAI = hasErrors && aiProviderType !== 'none';

  return (
    <div
      style={{
        flexShrink: 0,
        maxHeight: '200px',
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
        {hasConsoleOutput && (
          <span
            onClick={() => setShowConsole((v) => !v)}
            style={{
              marginLeft: canAskAI ? '8px' : 'auto',
              color: '#8b8bbb',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {showConsole ? '\u25BC' : '\u25B6'} Output
          </span>
        )}
        {canAskAI && (
          <button
            onClick={handleAskAI}
            style={{
              marginLeft: hasConsoleOutput ? '8px' : 'auto',
              padding: '2px 8px',
              fontSize: '11px',
              background: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Ask AI to fix
          </button>
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

      {/* Console output (expanded inline) */}
      {hasConsoleOutput && showConsole && (
        <div
          style={{
            padding: '3px 12px',
            color: '#b0b0d0',
            whiteSpace: 'pre-wrap',
            borderTop: '1px solid #2a2a3e',
          }}
        >
          {consoleOutput}
        </div>
      )}
    </div>
  );
}
