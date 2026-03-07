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
