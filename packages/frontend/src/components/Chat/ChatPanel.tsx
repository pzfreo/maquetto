import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useCADChat } from '../../hooks/useCADChat';

/**
 * Extract text content from a UIMessage's parts array.
 */
function getMessageText(parts: ReadonlyArray<{ type: string; text?: string }>): string {
  return parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
}

/**
 * Chat panel component.
 * Uses Vercel AI SDK's useChat via DirectChatTransport for streaming.
 */
export function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    isConfigured,
  } = useCADChat();

  const isStreaming = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    sendMessage(text);
  };

  const handleStop = () => {
    stop();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          color: '#888',
          background: '#16162a',
          borderBottom: '1px solid #2a2a3e',
          flexShrink: 0,
        }}
      >
        AI Chat
        {!isConfigured && (
          <span style={{ color: '#f4a836', marginLeft: '8px' }}>
            — No provider configured
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#555',
              fontSize: '13px',
              marginTop: '40px',
            }}
          >
            {isConfigured
              ? 'Ask the AI to help with your Build123d design.'
              : 'Click ⚙ in the toolbar to set up an AI provider.'}
            <br />
            <span style={{ fontSize: '11px', color: '#444' }}>
              {isConfigured
                ? 'It can see your code, viewport, and selected parts.'
                : 'Google Gemini or Anthropic Claude'}
            </span>
          </div>
        )}
        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              color: '#f44336',
              fontSize: '12px',
              marginBottom: '4px',
            }}
          >
            {error.message}
          </div>
        )}
        {messages
          .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
          .map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role as 'user' | 'assistant'}
              content={getMessageText(msg.parts)}
            />
          ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming || !isConfigured}
        isStreaming={isStreaming}
        onStop={handleStop}
      />
    </div>
  );
}
