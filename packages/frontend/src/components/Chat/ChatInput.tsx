import { useState, useRef, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string, options?: { includeScreenshot?: boolean }) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

export function ChatInput({ onSend, disabled, isStreaming, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resetInput = () => {
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    resetInput();
  };

  const handleSendWithScreenshot = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed, { includeScreenshot: true });
    resetInput();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '10px 12px',
        borderTop: '1px solid #2a2a3e',
        background: '#16162a',
        alignItems: 'flex-end',
        flexShrink: 0,
      }}
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          handleInput();
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask about your design…"
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          padding: '8px 10px',
          borderRadius: '6px',
          border: '1px solid #333',
          background: '#1e1e2e',
          color: '#e0e0e0',
          fontSize: '13px',
          fontFamily: 'inherit',
          lineHeight: 1.4,
          outline: 'none',
          minHeight: '36px',
          maxHeight: '120px',
        }}
      />
      {isStreaming ? (
        <button
          onClick={onStop}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: 'none',
            background: '#f44336',
            color: '#fff',
            fontSize: '13px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Stop
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: input.trim() && !disabled ? '#4a9eff' : '#333',
              color: input.trim() && !disabled ? '#fff' : '#888',
              fontSize: '13px',
              cursor: input.trim() && !disabled ? 'pointer' : 'not-allowed',
            }}
          >
            Send
          </button>
          <button
            onClick={handleSendWithScreenshot}
            disabled={disabled || !input.trim()}
            title="Send message with a screenshot of the current viewport"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: 'none',
              background: input.trim() && !disabled ? '#2a4a6e' : '#2a2a3e',
              color: input.trim() && !disabled ? '#8bc4ff' : '#555',
              fontSize: '10px',
              cursor: input.trim() && !disabled ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            + Screenshot
          </button>
        </div>
      )}
    </div>
  );
}
