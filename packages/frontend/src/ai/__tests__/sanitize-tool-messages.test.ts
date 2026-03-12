import { describe, it, expect } from 'vitest';
import {
  sanitizeToolMessagePairs,
  hasToolCalls,
} from '../transports/data-url-safe-transport';

// Helpers to build message objects
function userMsg(text: string) {
  return { role: 'user' as const, content: text };
}

function assistantText(text: string) {
  return {
    role: 'assistant' as const,
    content: [{ type: 'text' as const, text }],
  };
}

function assistantToolCall(toolCallId: string, toolName: string) {
  return {
    role: 'assistant' as const,
    content: [
      { type: 'tool-call' as const, toolCallId, toolName, args: {} },
    ],
  };
}

function assistantMixed(text: string, toolCallId: string, toolName: string) {
  return {
    role: 'assistant' as const,
    content: [
      { type: 'text' as const, text },
      { type: 'tool-call' as const, toolCallId, toolName, args: {} },
    ],
  };
}

function toolResponse(toolCallId: string, result: string) {
  return {
    role: 'tool' as const,
    content: [{ type: 'tool-result' as const, toolCallId, result }],
  };
}

describe('hasToolCalls', () => {
  it('returns true for assistant message with tool-call parts', () => {
    expect(hasToolCalls(assistantToolCall('tc1', 'test_code'))).toBe(true);
  });

  it('returns true for assistant message with mixed content', () => {
    expect(hasToolCalls(assistantMixed('hi', 'tc1', 'test_code'))).toBe(true);
  });

  it('returns false for assistant message with only text', () => {
    expect(hasToolCalls(assistantText('hello'))).toBe(false);
  });

  it('returns false for user messages', () => {
    expect(hasToolCalls(userMsg('hello'))).toBe(false);
  });

  it('returns false for tool messages', () => {
    expect(hasToolCalls(toolResponse('tc1', 'ok'))).toBe(false);
  });

  it('returns false when content is a string, not an array', () => {
    expect(hasToolCalls({ role: 'assistant', content: 'just text' })).toBe(false);
  });
});

describe('sanitizeToolMessagePairs', () => {
  it('does nothing to an empty array', () => {
    const messages: unknown[] = [];
    sanitizeToolMessagePairs(messages);
    expect(messages).toEqual([]);
  });

  it('leaves clean history unchanged', () => {
    const messages = [
      userMsg('make a box'),
      assistantToolCall('tc1', 'test_code'),
      toolResponse('tc1', 'ok'),
      assistantText('Done!'),
    ];
    const original = JSON.parse(JSON.stringify(messages));
    sanitizeToolMessagePairs(messages);
    expect(messages).toEqual(original);
  });

  it('leaves multiple valid tool call/response pairs unchanged', () => {
    const messages = [
      userMsg('make a box'),
      assistantToolCall('tc1', 'test_code'),
      toolResponse('tc1', 'ok'),
      assistantToolCall('tc2', 'test_code'),
      toolResponse('tc2', 'ok'),
      assistantText('All done!'),
    ];
    const original = JSON.parse(JSON.stringify(messages));
    sanitizeToolMessagePairs(messages);
    expect(messages).toEqual(original);
  });

  it('removes orphaned tool response at the start of the array', () => {
    const messages = [
      toolResponse('tc1', 'ok'),
      userMsg('hello'),
      assistantText('hi'),
    ];
    sanitizeToolMessagePairs(messages);
    expect(messages).toEqual([
      userMsg('hello'),
      assistantText('hi'),
    ]);
  });

  it('removes orphaned tool response in the middle of the array', () => {
    const messages = [
      userMsg('hello'),
      assistantText('hi'),
      toolResponse('tc1', 'stale result'),
      userMsg('make a box'),
      assistantText('sure'),
    ];
    sanitizeToolMessagePairs(messages);
    expect(messages).toEqual([
      userMsg('hello'),
      assistantText('hi'),
      userMsg('make a box'),
      assistantText('sure'),
    ]);
  });

  it('strips tool-call parts from assistant with no following tool response, keeping text', () => {
    const messages = [
      userMsg('make a box'),
      assistantMixed('Let me try that', 'tc1', 'test_code'),
    ];
    sanitizeToolMessagePairs(messages);
    expect(messages).toHaveLength(2);
    expect(messages[1]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'Let me try that' }],
    });
  });

  it('removes assistant message entirely when it has only tool-calls and no following tool response', () => {
    const messages = [
      userMsg('make a box'),
      assistantToolCall('tc1', 'test_code'),
    ];
    sanitizeToolMessagePairs(messages);
    expect(messages).toEqual([
      userMsg('make a box'),
    ]);
  });

  it('handles mixed: some valid pairs, some orphaned', () => {
    const messages = [
      toolResponse('tc0', 'orphaned'),           // orphaned tool at start
      userMsg('hello'),
      assistantToolCall('tc1', 'test_code'),      // valid pair
      toolResponse('tc1', 'ok'),
      assistantToolCall('tc2', 'test_code'),      // orphaned assistant (no tool response follows)
      userMsg('next'),
      assistantMixed('thinking', 'tc3', 'test'),  // orphaned mixed (no tool response follows)
    ];
    sanitizeToolMessagePairs(messages);
    expect(messages).toEqual([
      userMsg('hello'),
      assistantToolCall('tc1', 'test_code'),
      toolResponse('tc1', 'ok'),
      // tc2 assistant had only tool-calls → removed entirely
      userMsg('next'),
      // tc3 mixed → tool-call stripped, text kept
      { role: 'assistant', content: [{ type: 'text', text: 'thinking' }] },
    ]);
  });

  it('handles history after truncation (tool response at start)', () => {
    // Simulates what happens when message history is truncated and a tool
    // response ends up as the first message
    const messages = [
      toolResponse('tc5', 'result from previous context'),
      toolResponse('tc6', 'another orphan'),
      userMsg('continue'),
      assistantToolCall('tc7', 'test_code'),
      toolResponse('tc7', 'success'),
      assistantText('Here is the result'),
    ];
    sanitizeToolMessagePairs(messages);
    expect(messages).toEqual([
      userMsg('continue'),
      assistantToolCall('tc7', 'test_code'),
      toolResponse('tc7', 'success'),
      assistantText('Here is the result'),
    ]);
  });

  it('removes tool response that follows a non-tool-call assistant message', () => {
    const messages = [
      userMsg('hi'),
      assistantText('hello there'),
      toolResponse('tc1', 'stale'),
    ];
    sanitizeToolMessagePairs(messages);
    expect(messages).toEqual([
      userMsg('hi'),
      assistantText('hello there'),
    ]);
  });

  it('merges consecutive assistant messages to prevent Gemini function_call ordering errors', () => {
    // This case happens when a multi-step tool loop produces:
    // assistant(text) → assistant(tool-call) → tool
    // Gemini rejects functionCall after a model turn (must be after user or function turn).
    const messages = [
      userMsg('make a box'),
      assistantToolCall('tc1', 'test_code'),
      toolResponse('tc1', 'error'),
      assistantText('Let me try a different approach'),
      assistantToolCall('tc2', 'test_code'),
      toolResponse('tc2', 'success'),
      assistantText('Done!'),
    ];
    sanitizeToolMessagePairs(messages);
    // Messages 3+4 (consecutive assistants) merged, "Done!" stays separate (follows tool)
    expect(messages.length).toBe(6);
    expect(messages[0]).toEqual(userMsg('make a box'));
    expect(messages[1]).toEqual(assistantToolCall('tc1', 'test_code'));
    expect(messages[2]).toEqual(toolResponse('tc1', 'error'));
    expect(messages[3]!.role).toBe('assistant');
    expect(messages[3]!.content).toHaveLength(2); // text + tool-call
    expect(messages[3]!.content[0].type).toBe('text');
    expect(messages[3]!.content[1].type).toBe('tool-call');
    expect(messages[4]).toEqual(toolResponse('tc2', 'success'));
    expect(messages[5]).toEqual(assistantText('Done!'));
  });

  it('merges multiple consecutive assistant messages', () => {
    const messages = [
      userMsg('make a box'),
      assistantText('Let me try'),
      assistantToolCall('tc1', 'test_code'),
      toolResponse('tc1', 'success'),
      assistantText('Done!'),
    ];
    sanitizeToolMessagePairs(messages);
    // Messages 1+2 (consecutive assistants) should be merged
    expect(messages.length).toBe(4);
    expect(messages[0]).toEqual(userMsg('make a box'));
    expect(messages[1]!.role).toBe('assistant');
    expect(messages[1]!.content).toHaveLength(2);
    expect(messages[1]!.content[0].type).toBe('text');
    expect(messages[1]!.content[0].text).toBe('Let me try');
    expect(messages[1]!.content[1].type).toBe('tool-call');
    expect(messages[2]).toEqual(toolResponse('tc1', 'success'));
    expect(messages[3]).toEqual(assistantText('Done!'));
  });
});
