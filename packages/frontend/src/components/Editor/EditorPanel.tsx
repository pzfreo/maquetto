import { useRef, useEffect, useCallback, useMemo } from 'react';
import Editor, { DiffEditor, type OnMount } from '@monaco-editor/react';
import type * as monacoTypes from 'monaco-editor';
import { useAppStore } from '../../store';
import { registerBuild123dCompletions } from './build123d-completions';
import { CompilationErrors } from './CompilationErrors';

type Monaco = typeof monacoTypes;
type IStandaloneCodeEditor = monacoTypes.editor.IStandaloneCodeEditor;

interface EditorPanelProps {
  onCompile?: () => void;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function EditorPanel({ onCompile }: EditorPanelProps) {
  const code = useAppStore((s) => s.code);
  const setCode = useAppStore((s) => s.setCode);
  const errors = useAppStore((s) => s.errors);

  // Version history state
  const versions = useAppStore((s) => s.versions);
  const selectedVersionId = useAppStore((s) => s.selectedVersionId);
  const isDiffExpanded = useAppStore((s) => s.isDiffExpanded);
  const selectVersion = useAppStore((s) => s.selectVersion);
  const revertToVersion = useAppStore((s) => s.revertToVersion);
  const setDiffExpanded = useAppStore((s) => s.setDiffExpanded);

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) ?? null,
    [versions, selectedVersionId],
  );

  const editorRef = useRef<IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const completionsRegistered = useRef(false);

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      console.log('[Editor] Monaco editor mounted');

      // Register Build123d completions once
      if (!completionsRegistered.current) {
        registerBuild123dCompletions(monaco);
        completionsRegistered.current = true;
        console.log('[Editor] Build123d completions registered');
      }

      // Ctrl/Cmd+Enter to compile
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          onCompile?.();
        },
      );
    },
    [onCompile],
  );

  // Update error markers when errors change
  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const markers = errors
      .filter((e) => e.line !== null)
      .map((e) => ({
        severity: monaco.MarkerSeverity.Error,
        message: e.message,
        startLineNumber: e.line!,
        startColumn: e.column ?? 1,
        endLineNumber: e.line!,
        endColumn: e.column ?? model.getLineMaxColumn(e.line!),
      }));

    monaco.editor.setModelMarkers(model, 'build123d', markers);
  }, [errors]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with version dropdown */}
      <div
        style={{
          padding: '6px 12px',
          fontSize: '11px',
          color: '#888',
          background: '#16162a',
          borderBottom: '1px solid #2a2a3e',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span>main.py</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {versions.length > 0 && (
            <select
              value={selectedVersionId ?? ''}
              onChange={(e) => selectVersion(e.target.value || null)}
              style={{
                background: '#1e1e2e',
                color: '#ccc',
                border: '1px solid #333',
                borderRadius: '3px',
                fontSize: '11px',
                padding: '2px 4px',
                maxWidth: '200px',
              }}
            >
              <option value="">History ({versions.length})</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.source === 'ai' ? 'AI' : 'Edit'}: {v.summary} ({formatTimestamp(v.timestamp)})
                </option>
              ))}
            </select>
          )}
          {selectedVersion && (
            <>
              <button
                onClick={() => setDiffExpanded(!isDiffExpanded)}
                style={{
                  padding: '2px 6px',
                  fontSize: '11px',
                  background: 'transparent',
                  color: '#4a9eff',
                  border: '1px solid #4a9eff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
                title={isDiffExpanded ? 'Collapse' : 'Expand diff view'}
              >
                {isDiffExpanded ? 'Collapse' : 'Expand'}
              </button>
              <button
                onClick={() => revertToVersion(selectedVersion.id)}
                style={{
                  padding: '2px 6px',
                  fontSize: '11px',
                  background: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                Revert
              </button>
              <button
                onClick={() => selectVersion(null)}
                style={{
                  padding: '2px 6px',
                  fontSize: '11px',
                  background: 'transparent',
                  color: '#888',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor or DiffEditor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {selectedVersion ? (
          <DiffEditor
            original={selectedVersion.code}
            modified={code}
            language="python"
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderSideBySide: isDiffExpanded,
            }}
          />
        ) : (
          <Editor
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value ?? '')}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: 'on',
              renderWhitespace: 'none',
              padding: { top: 8 },
            }}
          />
        )}
      </div>
      <CompilationErrors />
    </div>
  );
}
