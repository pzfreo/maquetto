import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useAppStore } from '../../store';
import { assembleContextText } from '../../ai/context-assembler';
import { CAD_SYSTEM_PROMPT } from '../../ai/system-prompt';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Chat panel component.
 *
 * Currently uses a simple local state approach. When AI providers
 * are integrated (Phase 7), this will be backed by Vercel AI SDK's
 * useChat hook via the transport abstraction.
 */
export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const aiProvider = useAppStore((s) => s.aiProvider);
  const code = useAppStore((s) => s.code);
  const parts = useAppStore((s) => s.parts);
  const selectedPartIds = useAppStore((s) => s.selectedPartIds);
  const cameraDescription = useAppStore((s) => s.cameraDescription);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);

    // If no provider configured, show a helpful message
    if (aiProvider.type === 'none') {
      const helpMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'No AI provider configured. Click the ⚙ button in the toolbar to set up Google Gemini or Anthropic Claude.',
      };
      setMessages((prev) => [...prev, helpMessage]);
      return;
    }

    // Build context
    const _context = assembleContextText({
      code,
      parts,
      selectedPartIds,
      cameraDescription,
      screenshotDataUrl: null,
    });

    // System prompt (for future integration)
    const _systemPrompt = CAD_SYSTEM_PROMPT;

    setIsStreaming(true);

    // TODO: Replace with Vercel AI SDK useChat transport call
    // For now, show a placeholder response
    const placeholderMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `AI provider "${aiProvider.type}" is configured but the transport is not yet connected.\n\nYour message: "${text}"\n\nThe AI integration will be completed in Phase 7 when authentication flows are implemented.`,
    };

    // Simulate a brief delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    setMessages((prev) => [...prev, placeholderMessage]);
    setIsStreaming(false);
  };

  const handleStop = () => {
    setIsStreaming(false);
  };

  const noProvider = aiProvider.type === 'none';

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
        {noProvider && (
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
            Ask the AI to help with your Build123d design.
            <br />
            <span style={{ fontSize: '11px', color: '#444' }}>
              It can see your code, viewport, and selected parts.
            </span>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        isStreaming={isStreaming}
        onStop={handleStop}
      />
    </div>
  );
}
