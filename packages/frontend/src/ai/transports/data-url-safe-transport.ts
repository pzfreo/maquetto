import {
  convertToModelMessages,
  validateUIMessages,
} from 'ai';
import { base64ToUint8Array } from '../../lib/base64';

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
 * Check if a model message contains tool-call parts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasToolCalls(msg: any): boolean {
  if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return false;
  return msg.content.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.type === 'tool-call',
  );
}

/**
 * Ensure every assistant message with tool-calls is immediately followed
 * by a tool message, and every tool message is immediately preceded by
 * an assistant message with tool-calls. Gemini rejects requests where
 * functionCall / functionResponse turns are not adjacent.
 *
 * For assistant messages with mixed content (text + tool-calls), we strip
 * the tool-call parts rather than removing the whole message, preserving
 * the text content for context.
 *
 * Mutates the array in place.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeToolMessagePairs(messages: any[]): void {
  const toRemove = new Set<number>();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;

    if (msg.role === 'tool') {
      // Tool response must be preceded by an assistant with tool-calls
      const prev = i > 0 ? messages[i - 1] : null;
      if (!prev || !hasToolCalls(prev) || toRemove.has(i - 1)) {
        toRemove.add(i);
      }
    }

    if (hasToolCalls(msg)) {
      // Assistant with tool-calls must be followed by a tool response
      const next = i + 1 < messages.length ? messages[i + 1] : null;
      if (!next || next.role !== 'tool') {
        // Strip tool-call parts instead of removing the entire message
        if (Array.isArray(msg.content)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          msg.content = msg.content.filter((p: any) => p.type !== 'tool-call');
          if (msg.content.length === 0) {
            toRemove.add(i);
          }
        }
      }
    }
  }

  if (toRemove.size > 0) {
    const indices = [...toRemove].sort((a, b) => b - a);
    for (const idx of indices) {
      messages.splice(idx, 1);
    }
    console.log(`[Transport] Removed ${toRemove.size} orphaned tool messages for Gemini compatibility`);
  }

  // Merge consecutive assistant messages. Gemini requires that a functionCall
  // turn comes after a user or functionResponse turn — NOT after another model
  // turn. Multi-step tool loops can produce: assistant(text) → assistant(tool-call),
  // which Gemini rejects. Merging them into one turn fixes this.
  let i = 0;
  while (i < messages.length - 1) {
    if (messages[i]!.role === 'assistant' && messages[i + 1]!.role === 'assistant') {
      const current = messages[i]!;
      const next = messages[i + 1]!;
      // Merge content arrays
      const currentContent = Array.isArray(current.content) ? current.content : [{ type: 'text', text: current.content }];
      const nextContent = Array.isArray(next.content) ? next.content : [{ type: 'text', text: next.content }];
      current.content = [...currentContent, ...nextContent];
      messages.splice(i + 1, 1);
      // Don't increment — check if the next message is also assistant
    } else {
      i++;
    }
  }
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
    const MAX_MESSAGES = 40;
    if (modelMessages.length > MAX_MESSAGES) {
      let cutIdx = modelMessages.length - MAX_MESSAGES;
      // Walk forward past any orphaned tool responses at the cut point.
      while (cutIdx < modelMessages.length && modelMessages[cutIdx]!.role === 'tool') {
        cutIdx++;
      }
      modelMessages.splice(0, cutIdx);
    }

    // Sanitize tool call/response ordering for Gemini compatibility.
    // Gemini requires: assistant(functionCall) immediately followed by tool(functionResponse).
    // Walk the array and remove any orphaned tool calls or tool responses.
    sanitizeToolMessagePairs(modelMessages);

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
            part.data = base64ToUint8Array(match[2]!);
            if (!part.mediaType) {
              part.mediaType = match[1] ?? 'application/octet-stream';
            }
          }
        }
      }
    }

    console.log(`[Transport] Streaming to agent with ${modelMessages.length} messages`);
    try {
      const result = await this.agent.stream({
        prompt: modelMessages,
        abortSignal,
      });
      console.log('[Transport] Agent stream started, converting to UI stream');
      return result.toUIMessageStream();
    } catch (err) {
      console.error('[Transport] Agent stream failed:', err);
      throw err;
    }
  }

  async reconnectToStream() {
    return null;
  }
}
