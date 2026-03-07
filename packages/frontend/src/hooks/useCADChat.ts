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
    return engineRef.current.compile(codeToTest, 'draft');
  }, []);

  // Include engine truthiness so the transport is recreated once the engine
  // loads (otherwise compileFn is passed as null and test_code tool is missing).
  const engineReady = !!engine;
  const transport = useMemo(
    () => createTransport(aiProvider, engineReady ? compileFn : null, customSystemPrompt),
    [aiProvider, compileFn, engineReady, customSystemPrompt],
  );

  const chat = useChat({
    id: 'cad-chat',
    // DataUrlSafeChatTransport matches useChat's transport shape but uses
    // structural typing (AgentLike) that doesn't satisfy the SDK's exact
    // generic constraints. Cast required until Vercel exports a simpler type.
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

    // Capture viewport screenshot and attach as a File.
    // The AI SDK's FileUIPart doesn't support data: URLs, so we convert
    // the canvas data URL to a File via DataTransfer to get a real FileList.
    let screenshotFiles: FileList | undefined;
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
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
