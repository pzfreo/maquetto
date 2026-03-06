import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useCADChat } from '../../hooks/useCADChat';
import { useAppStore } from '../../store';
import { parseCodeBlocks } from '../../ai/parse-code-blocks';
import { extractSummary } from '../../ai/extract-summary';

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
  const pendingChatMessage = useAppStore((s) => s.pendingChatMessage);
  const setPendingChatMessage = useAppStore((s) => s.setPendingChatMessage);
  const setCode = useAppStore((s) => s.setCode);
  const saveVersion = useAppStore((s) => s.saveVersion);
  const prevStatusRef = useRef(status);

  // Send pending messages from other panels (e.g. "Ask AI to fix" button)
  useEffect(() => {
    if (pendingChatMessage && isConfigured && !isStreaming) {
      sendMessage(pendingChatMessage);
      setPendingChatMessage(null);
    }
  }, [pendingChatMessage, isConfigured, isStreaming, sendMessage, setPendingChatMessage]);

  // Auto-apply: when AI finishes responding, extract code and apply to editor
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted';
    prevStatusRef.current = status;

    if (wasStreaming && status === 'ready') {
      // Find the last assistant message
      const assistantMessages = messages.filter((m) => m.role === 'assistant');
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      if (!lastAssistant) return;

      const fullText = getMessageText(lastAssistant.parts);
      const codeBlocks = parseCodeBlocks(fullText);

      // Find the last Python code block
      const pythonBlocks = codeBlocks.filter(
        (b) => b.language === 'python' || b.language === 'py' || b.language === '',
      );
      const lastBlock = pythonBlocks[pythonBlocks.length - 1];
      if (!lastBlock) return;

      const newCode = lastBlock.code.trim();
      if (!newCode) return;

      // Find the user prompt that triggered this response
      const userMessages = messages.filter((m) => m.role === 'user');
      const lastUserMsg = userMessages[userMessages.length - 1];
      const prompt = lastUserMsg ? getMessageText(lastUserMsg.parts) : null;
      // Strip context suffix appended by sendWithContext
      const cleanPrompt = prompt?.split('\n\n---\n')[0] ?? null;

      // Save current code as a version before replacing
      const currentCode = useAppStore.getState().code;
      const summary = extractSummary(fullText);
      saveVersion(currentCode, 'ai', summary, cleanPrompt);

      // Apply the new code
      console.log(`[Chat] Auto-applying code (${newCode.length} chars)`);
      setCode(newCode);
    }
  }, [status, messages, setCode, saveVersion]);

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
