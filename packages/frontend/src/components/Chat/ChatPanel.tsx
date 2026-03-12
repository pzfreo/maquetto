import { useRef, useEffect, useMemo, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useCADChat } from '../../hooks/useCADChat';
import { useAppStore } from '../../store';
import { parseCodeBlocks } from '../../ai/parse-code-blocks';
import { extractSummary } from '../../ai/extract-summary';
import type { CadEngine } from '@maquetto/api-types';

/**
 * Strip tool-call markup that some models emit as plain text
 * instead of using structured tool calling.
 */
const TOOL_CALL_RE = /<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/g;
const TOOL_RESPONSE_RE = /<\|tool_call_response_start\|>[\s\S]*?<\|tool_call_response_end\|>/g;

function stripToolMarkup(text: string): string {
  return text
    .replace(TOOL_CALL_RE, '')
    .replace(TOOL_RESPONSE_RE, '')
    .replace(/\n{3,}/g, '\n\n') // collapse excess newlines left behind
    .trim();
}

/**
 * Extract text content from a UIMessage's parts array.
 * Filters out file/image parts, base64 image data, and tool-call markup.
 */
function getMessageText(parts: ReadonlyArray<{ type: string; text?: string }>): string {
  const raw = parts
    .filter((p): p is { type: 'text'; text: string } =>
      p.type === 'text' && typeof p.text === 'string'
      && !p.text.startsWith('data:image/')
    )
    .map((p) => p.text)
    .join('');
  return stripToolMarkup(raw);
}

/** Check if a UIMessage's parts contain any file/image attachments */
function hasImageAttachment(parts: ReadonlyArray<{ type: string; text?: string }>): boolean {
  return parts.some((p) =>
    p.type === 'file' || p.type === 'image'
    || (p.type === 'text' && typeof p.text === 'string' && p.text.startsWith('data:image/'))
  );
}

/**
 * Extract code from the last successful test_code tool call in the message parts.
 * Preferred over text code blocks because this code is verified to compile.
 */
function getCodeFromToolCalls(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: ReadonlyArray<Record<string, any>>,
): string | null {
  // Walk backwards to find the last successful test_code call
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]!;
    if (
      (p.type === 'tool-invocation' || p.type?.startsWith?.('tool-'))
      && p.toolName === 'test_code'
      && p.state === 'output-available'
      && p.output?.success === true
      && typeof p.args?.code === 'string'
    ) {
      return p.args.code;
    }
  }
  return null;
}

interface ToolInvocationInfo {
  count: number;
  latestState: string;
  hasError: boolean;
}

/**
 * Check if the last assistant message ended with unresolved tool errors
 * (i.e. the tool loop was exhausted without a successful compilation).
 */
function hasUnresolvedToolErrors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: ReadonlyArray<Record<string, any>>,
): boolean {
  const toolParts = parts.filter(
    (p) => typeof p.type === 'string' && (p.type.startsWith('tool-') || p.type === 'dynamic-tool'),
  );
  if (toolParts.length === 0) return false;

  // Check if any tool call succeeded — if so, no need to retry
  const hasSuccess = toolParts.some(
    (p) => p.state === 'output-available' && p.output?.success === true,
  );
  if (hasSuccess) return false;

  // The last tool call failed
  const last = toolParts[toolParts.length - 1]!;
  return last.state === 'output-available' && last.output?.success === false;
}

/**
 * Extract tool invocation info from the latest assistant message parts.
 */
function getToolActivity(
  // UIMessage.parts is typed as Array<Record<string, unknown>> by the SDK
  // but the actual runtime shape has string .type and optional .result fields
  // that aren't in the public type. Cast required to inspect tool state.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: ReadonlyArray<Record<string, any>>,
): ToolInvocationInfo | null {
  const toolParts = parts.filter(
    (p) => typeof p.type === 'string' && (p.type.startsWith('tool-') || p.type === 'dynamic-tool'),
  );
  if (toolParts.length === 0) return null;

  const latest = toolParts[toolParts.length - 1]!;
  return {
    count: toolParts.length,
    latestState: latest.state ?? 'unknown',
    hasError: latest.state === 'output-available' && latest.output?.success === false,
  };
}

interface ChatPanelProps {
  onCompile?: () => void;
  engine: CadEngine | null;
}

/**
 * Chat panel component.
 * Uses Vercel AI SDK's useChat via DirectChatTransport for streaming.
 */
export function ChatPanel({ onCompile, engine }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    setMessages,
    isConfigured,
  } = useCADChat(engine);

  const isStreaming = status === 'streaming' || status === 'submitted';
  const engineStatus = useAppStore((s) => s.engineStatus);
  const engineReady = engineStatus.phase === 'ready';
  const pendingChatMessage = useAppStore((s) => s.pendingChatMessage);

  // Register clearChat so other components (e.g. Toolbar "New") can reset the chat
  const clearChat = useCallback(() => setMessages([]), [setMessages]);
  useEffect(() => {
    useAppStore.getState().setClearChat(clearChat);
    return () => useAppStore.getState().setClearChat(null);
  }, [clearChat]);
  const setPendingChatMessage = useAppStore((s) => s.setPendingChatMessage);
  const setCode = useAppStore((s) => s.setCode);
  const saveVersion = useAppStore((s) => s.saveVersion);
  const prevStatusRef = useRef(status);
  // Programmatic auto-retry: after auto-apply, if compile fails, send errors
  // back to the AI automatically (up to MAX_AUTO_RETRIES times).
  const autoRetryCountRef = useRef(0);
  const waitingForCompileRef = useRef(false);
  const MAX_AUTO_RETRIES = 3;

  // Detect tool activity in the current streaming message.
  // Only show if the last message is an assistant message (not a stale
  // result from before the user's latest prompt).
  const toolActivity = useMemo(() => {
    if (!isStreaming) return null;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getToolActivity(lastMessage.parts as ReadonlyArray<Record<string, any>>);
  }, [isStreaming, messages]);

  // Show a retry button when the AI exhausted its tool loop without success.
  const showRetry = useMemo(() => {
    if (isStreaming) return false;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return hasUnresolvedToolErrors(lastMessage.parts as ReadonlyArray<Record<string, any>>);
  }, [isStreaming, messages]);

  const handleRetry = useCallback(() => {
    sendMessage('The code still has errors. Please continue trying to fix it. After you succeed, explain what you changed.');
  }, [sendMessage]);

  // Send pending messages from other panels (e.g. "Ask AI to fix" button)
  useEffect(() => {
    if (pendingChatMessage && isConfigured && !isStreaming) {
      sendMessage(pendingChatMessage);
      setPendingChatMessage(null);
    }
  }, [pendingChatMessage, isConfigured, isStreaming, sendMessage, setPendingChatMessage]);

  // Auto-apply fallback: when AI finishes responding, if test_code wasn't used
  // (e.g. AI included code only in text), extract it and apply to editor.
  // When test_code IS used, it already updates the editor and saves a version.
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted';
    prevStatusRef.current = status;

    if (wasStreaming && status === 'ready') {
      const assistantMessages = messages.filter((m) => m.role === 'assistant');
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      if (!lastAssistant) return;

      // If test_code was used, the code is already applied — skip
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolCode = getCodeFromToolCalls(lastAssistant.parts as ReadonlyArray<Record<string, any>>);
      if (toolCode) return;

      // Fallback: extract from text code blocks
      const fullText = getMessageText(lastAssistant.parts);
      const codeBlocks = parseCodeBlocks(fullText);
      const pythonBlocks = codeBlocks.filter(
        (b) => b.language === 'python' || b.language === 'py' || b.language === '',
      );
      const lastBlock = pythonBlocks[pythonBlocks.length - 1];
      const newCode = lastBlock?.code.trim();
      if (!newCode) return;

      const userMessages = messages.filter((m) => m.role === 'user');
      const lastUserMsg = userMessages[userMessages.length - 1];
      const prompt = lastUserMsg ? getMessageText(lastUserMsg.parts) : null;
      const cleanPrompt = prompt?.split('\n\n---\n')[0] ?? null;

      const currentCode = useAppStore.getState().code;
      const summary = extractSummary(fullText);
      saveVersion(currentCode, 'ai', summary, cleanPrompt);

      console.log(`[Chat] Auto-applying code from text (${newCode.length} chars)`);
      setCode(newCode);
      useAppStore.getState().setDirty(false);
      waitingForCompileRef.current = true;
      onCompile?.();
    }
  }, [status, messages, setCode, saveVersion, onCompile]);

  // Reset retry count when the user sends a new message
  const messageCount = messages.length;
  const prevMessageCountRef = useRef(messageCount);
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messageCount;
    // If a new user message appeared, reset retry counter
    if (messageCount > prevCount) {
      const latest = messages[messages.length - 1];
      if (latest?.role === 'user') {
        autoRetryCountRef.current = 0;
      }
    }
  }, [messageCount, messages]);

  // Watch for compile errors after auto-apply and send them back to the AI
  const compilationStatus = useAppStore((s) => s.compilationStatus);
  const compileErrors = useAppStore((s) => s.errors);
  useEffect(() => {
    if (!waitingForCompileRef.current) return;
    if (compilationStatus !== 'error' && compilationStatus !== 'success') return;

    waitingForCompileRef.current = false;

    if (compilationStatus === 'error' && compileErrors.length > 0) {
      if (autoRetryCountRef.current >= MAX_AUTO_RETRIES) {
        console.log(`[Chat] Auto-retry limit reached (${MAX_AUTO_RETRIES}), not retrying`);
        return;
      }
      autoRetryCountRef.current++;
      const errorLines = compileErrors.map((e) => {
        const loc = e.line !== null ? ` (line ${e.line})` : '';
        return `[${e.type}]${loc}: ${e.message}`;
      });
      const retryMsg = `The code you provided has compilation errors. Please fix them and try again:\n\n${errorLines.join('\n\n')}`;
      console.log(`[Chat] Auto-retrying (attempt ${autoRetryCountRef.current}/${MAX_AUTO_RETRIES}): ${compileErrors.length} errors`);
      sendMessage(retryMsg);
    } else {
      // Success — reset retry counter
      autoRetryCountRef.current = 0;
    }
  }, [compilationStatus, compileErrors, sendMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string, options?: { includeScreenshot?: boolean }) => {
    sendMessage(text, options);
  };

  const handleStop = () => {
    stop();
    // Also cancel any in-progress compilation triggered by the AI's test_code tool.
    // The abort signal tells the tool not to push results, but the worker may still
    // be running — terminate it so the user isn't stuck waiting.
    engine?.cancelCompile();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
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
          minHeight: 0,
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
              hasScreenshot={msg.role === 'user' && hasImageAttachment(msg.parts)}
            />
          ))}

        {/* Streaming activity indicator */}
        {isStreaming && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#1a1a35',
              border: '1px solid #2a2a4e',
              fontSize: '12px',
              color: '#8b8bbb',
              margin: '4px 0',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: toolActivity?.hasError ? '#f4a836' : '#4a9eff',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <span>
              {!toolActivity
                ? 'AI is thinking…'
                : toolActivity.hasError
                  ? `Code has errors — AI is fixing (attempt ${toolActivity.count})…`
                  : toolActivity.latestState === 'output-available'
                    ? `Code compiled successfully — AI is writing response…`
                    : `Testing code${toolActivity.count > 1 ? ` (attempt ${toolActivity.count})` : ''}…`}
            </span>
          </div>
        )}

        {/* Retry button when AI exhausted tool loop without success */}
        {showRetry && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
            <button
              onClick={handleRetry}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                background: '#f4a836',
                color: '#1a1a2e',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Keep trying to fix
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming || !isConfigured || !engineReady}
        isStreaming={isStreaming}
        onStop={handleStop}
        placeholder={!isConfigured ? 'Set up AI provider in settings…' : !engineReady ? 'Waiting for CAD engine to load…' : undefined}
      />
    </div>
  );
}
