import { useMemo, useCallback, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { useAppStore } from '../store';
import { createTransport } from '../ai/provider-registry';
import { assembleContextText } from '../ai/context-assembler';
import type { CadEngine } from '@maquetto/api-types';

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
export function useCADChat(engine: CadEngine | null) {
  const aiProvider = useAppStore((s) => s.aiProvider);
  const code = useAppStore((s) => s.code);
  const parts = useAppStore((s) => s.parts);
  const selectedPartIds = useAppStore((s) => s.selectedPartIds);
  const cameraDescription = useAppStore((s) => s.cameraDescription);

  // Stable ref to engine so compileFn doesn't change when engine becomes ready
  const engineRef = useRef(engine);
  engineRef.current = engine;

  const compileFn = useCallback(async (codeToTest: string) => {
    if (!engineRef.current) {
      throw new Error('Engine not ready');
    }
    return engineRef.current.compile(codeToTest, 'draft');
  }, []);

  // Include engine truthiness so the transport is recreated once the engine
  // loads (otherwise compileFn is passed as null and test_code tool is missing).
  const engineReady = !!engine;
  const transport = useMemo(
    () => createTransport(aiProvider, engineReady ? compileFn : null),
    [aiProvider, compileFn, engineReady],
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

    // Capture viewport screenshot from the Three.js canvas
    let screenshotDataUrl: string | null = null;
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        screenshotDataUrl = canvas.toDataURL('image/png');
      }
    } catch {
      // Canvas capture can fail due to tainted canvas or security restrictions
    }

    if (screenshotDataUrl) {
      console.log('[Chat] Attaching viewport screenshot');
      chat.sendMessage({
        text: messageWithContext,
        files: [{
          type: 'file' as const,
          mediaType: 'image/png',
          url: screenshotDataUrl,
        }],
      });
    } else {
      chat.sendMessage({ text: messageWithContext });
    }
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
