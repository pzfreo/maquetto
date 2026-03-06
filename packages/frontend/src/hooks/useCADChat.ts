import { useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { useAppStore } from '../store';
import { createTransport } from '../ai/provider-registry';
import { assembleContextText } from '../ai/context-assembler';

/**
 * A transport that never sends anything. Used when no AI provider is configured
 * to prevent useChat from POSTing to the default /api/chat endpoint.
 */
const noopTransport = {
  async sendMessages() {
    return new ReadableStream({ start(c: ReadableStreamDefaultController) { c.close(); } });
  },
  async reconnectToStream() {
    return null;
  },
};

/**
 * Wraps useChat with CAD context injection and provider switching.
 * Returns the same interface as useChat, plus a sendWithContext method.
 */
export function useCADChat() {
  const aiProvider = useAppStore((s) => s.aiProvider);
  const code = useAppStore((s) => s.code);
  const parts = useAppStore((s) => s.parts);
  const selectedPartIds = useAppStore((s) => s.selectedPartIds);
  const cameraDescription = useAppStore((s) => s.cameraDescription);

  const transport = useMemo(
    () => createTransport(aiProvider),
    [aiProvider],
  );

  const chat = useChat({
    id: 'cad-chat',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: (transport ?? noopTransport) as any,
  });

  const sendWithContext = useCallback((text: string) => {
    if (!transport) {
      console.warn('[Chat] Send blocked — no provider configured');
      return;
    }

    const context = assembleContextText({
      code,
      parts,
      selectedPartIds,
      cameraDescription,
      screenshotDataUrl: null,
    });

    console.log(`[Chat] Sending message (${text.length} chars, ${parts.length} parts, ${selectedPartIds.length} selected)`);

    const messageWithContext = context
      ? `${text}\n\n---\n${context}`
      : text;

    chat.sendMessage({ text: messageWithContext });
  }, [transport, code, parts, selectedPartIds, cameraDescription, chat]);

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    sendMessage: sendWithContext,
    stop: chat.stop,
    setMessages: chat.setMessages,
    isConfigured: transport !== null,
  };
}
