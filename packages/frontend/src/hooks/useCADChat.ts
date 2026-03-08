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
  const customSystemPrompt = useAppStore((s) => s.customSystemPrompt);
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
    return engineRef.current.compile(codeToTest, 'normal');
  }, []);

  // Always pass compileFn — it uses engineRef internally so it's always
  // up to date. No need to recreate the transport when the engine loads.
  const transport = useMemo(
    () => createTransport(aiProvider, compileFn, customSystemPrompt),
    [aiProvider, compileFn, customSystemPrompt],
  );

  const chat = useChat({
    id: 'cad-chat',
    // DataUrlSafeChatTransport matches useChat's transport shape but uses
    // structural typing (AgentLike) that doesn't satisfy the SDK's exact
    // generic constraints. Cast required until Vercel exports a simpler type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: (transport ?? noopTransport) as any,
    onError(error) {
      console.error('[Chat] useChat error:', error);
    },
  });

  const sendWithContext = useCallback((text: string, options?: { includeScreenshot?: boolean }) => {
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

    console.log(`[Chat] Sending message (${text.length} chars, ${parts.length} parts, ${selectedPartIds.length} selected, screenshot=${!!options?.includeScreenshot})`);

    const messageWithContext = context
      ? `${text}\n\n---\n${context}`
      : text;

    // Capture viewport screenshot via store-registered function and attach as a File.
    let screenshotFiles: FileList | undefined;
    if (options?.includeScreenshot) {
      try {
        const capture = useAppStore.getState().captureScreenshot;
        const dataUrl = capture?.();
        if (dataUrl) {
          const base64 = dataUrl.split(',')[1];
          if (base64) {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const file = new File([bytes], 'viewport.png', { type: 'image/png' });
            const dt = new DataTransfer();
            dt.items.add(file);
            screenshotFiles = dt.files;
            console.log('[Chat] Attaching viewport screenshot');
          }
        }
      } catch {
        // Canvas capture can fail due to tainted canvas or security restrictions
      }
    }

    chat.sendMessage({
      text: messageWithContext,
      ...(screenshotFiles && { files: screenshotFiles }),
    });
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
