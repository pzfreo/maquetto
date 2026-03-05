import { useRef, useEffect, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as monacoTypes from 'monaco-editor';
import { useAppStore } from '../../store';
import { registerBuild123dCompletions } from './build123d-completions';
import { CompilationErrors } from './CompilationErrors';

type Monaco = typeof monacoTypes;
type IStandaloneCodeEditor = monacoTypes.editor.IStandaloneCodeEditor;

interface EditorPanelProps {
  onCompile?: () => void;
}

export function EditorPanel({ onCompile }: EditorPanelProps) {
  const code = useAppStore((s) => s.code);
  const setCode = useAppStore((s) => s.setCode);
  const errors = useAppStore((s) => s.errors);

  const editorRef = useRef<IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const completionsRegistered = useRef(false);

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Register Build123d completions once
      if (!completionsRegistered.current) {
        registerBuild123dCompletions(monaco);
        completionsRegistered.current = true;
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
      <div
        style={{
          padding: '6px 12px',
          fontSize: '11px',
          color: '#888',
          background: '#16162a',
          borderBottom: '1px solid #2a2a3e',
          flexShrink: 0,
        }}
      >
        main.py
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
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
      </div>
      <CompilationErrors />
    </div>
  );
}
