import {
  convertToModelMessages,
  validateUIMessages,
} from 'ai';

// Structural type for the agent — avoids coupling to ToolLoopAgent's
// deeply nested generics (ToolLoopAgent<CALL_OPTIONS, TOOLS, OUTPUT>).
// The Vercel AI SDK doesn't export a simple "Agent" interface we can use,
// so we match the shape we need: tools (for message validation) and
// stream() (for generating responses). The `any` types here are forced
// by the SDK's internal types not being publicly importable.
interface AgentLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any;
  stream(options: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prompt: any;
    abortSignal?: AbortSignal;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<{ toUIMessageStream(): any }>;
}

/**
 * A drop-in replacement for DirectChatTransport that handles data: URL
 * file attachments.
 *
 * The Vercel AI SDK's downloadAssets() rejects data: URLs with
 * AI_DownloadError ("URL scheme must be http or https").  This transport
 * converts data-URL file parts to inline Uint8Arrays in the model
 * messages BEFORE the agent's streaming pipeline runs, so the download
 * step never sees a URL to fetch.
 */
export class DataUrlSafeChatTransport {
  private agent: AgentLike;

  constructor({ agent }: { agent: AgentLike }) {
    this.agent = agent;
  }

  async sendMessages({
    messages,
    abortSignal,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: any[];
    abortSignal?: AbortSignal;
  }) {
    const validatedMessages = await validateUIMessages({
      messages,
      tools: this.agent.tools,
    });

    const modelMessages = await convertToModelMessages(validatedMessages, {
      tools: this.agent.tools,
    });

    // Limit message history to avoid exceeding context window.
    // Keep the last MAX_MESSAGES messages. This is a simple truncation —
    // the system prompt provides all needed context via the latest message.
    const MAX_MESSAGES = 40;
    if (modelMessages.length > MAX_MESSAGES) {
      modelMessages.splice(0, modelMessages.length - MAX_MESSAGES);
    }

    // Strip duplicated context from older user messages. Each user message
    // has a `\n\n---\n` suffix with full code + part metadata. Keeping all
    // of them duplicates context across the history and blows up token count.
    // Only the last user message needs the full context.
    const CONTEXT_SEP = '\n\n---\n';
    let lastUserIdx = -1;
    for (let i = modelMessages.length - 1; i >= 0; i--) {
      if (modelMessages[i]!.role === 'user') { lastUserIdx = i; break; }
    }
    for (let i = 0; i < modelMessages.length; i++) {
      const msg = modelMessages[i]!;
      if (msg.role !== 'user' || i === lastUserIdx) continue;
      if (typeof msg.content === 'string') {
        const sepIdx = msg.content.indexOf(CONTEXT_SEP);
        if (sepIdx !== -1) msg.content = msg.content.substring(0, sepIdx);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text' && typeof part.text === 'string') {
            const sepIdx = part.text.indexOf(CONTEXT_SEP);
            if (sepIdx !== -1) part.text = part.text.substring(0, sepIdx);
          }
        }
      }
    }

    // Convert data-URL strings to Uint8Arrays so the SDK's download
    // pipeline skips them (it only downloads URL instances).
    for (const msg of modelMessages) {
      if (msg.role !== 'user' || typeof msg.content === 'string') continue;
      for (const part of msg.content) {
        if (part.type === 'file' && typeof part.data === 'string') {
          const match = part.data.match(
            /^data:([^;]+);base64,(.+)$/,
          );
          if (match) {
            const base64 = match[2]!;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            part.data = bytes;
            if (!part.mediaType) {
              part.mediaType = match[1] ?? 'application/octet-stream';
            }
          }
        }
      }
    }

    const result = await this.agent.stream({
      prompt: modelMessages,
      abortSignal,
    });
    return result.toUIMessageStream();
  }

  async reconnectToStream() {
    return null;
  }
}
