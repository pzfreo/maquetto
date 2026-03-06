import { useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { useAppStore } from '../store';
import { createTransport } from '../ai/provider-registry';
import { assembleContextText } from '../ai/context-assembler';

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
    // When transport is set, use it for direct browser-to-provider streaming.
    // When not set, override the default API endpoint to prevent 405 errors
    // (Vercel AI SDK defaults to POSTing to /api/chat which doesn't exist).
    ...(transport ? { transport } : { api: 'data:,' }),
  });

  const sendWithContext = (text: string) => {
    if (!transport) return;

    const context = assembleContextText({
      code,
      parts,
      selectedPartIds,
      cameraDescription,
      screenshotDataUrl: null,
    });

    // Prepend context to user message
    const messageWithContext = context
      ? `${text}\n\n---\n${context}`
      : text;

    chat.sendMessage({ text: messageWithContext });
  };

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
