import { ToolLoopAgent } from 'ai';
import { createTestCodeTool, type CompileFn } from '../tools/test-code-tool';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LanguageModel = any;

/** Max tool loop iterations before we hard-stop. */
const MAX_STEPS = 6;

/** After this many consecutive failures, stop forcing tool calls so the AI
 *  can explain what's wrong instead of retrying hopelessly. */
const MAX_FORCED_RETRIES = 3;

/**
 * Shared ToolLoopAgent factory. Eliminates duplication between Google and
 * Anthropic transports — all tool loop behaviour lives here.
 *
 * Returns `{ agent, onBeforeStream }` so the transport can wire up the
 * DataUrlSafeChatTransport.
 */
export function createToolLoopAgent(
  model: LanguageModel,
  systemPrompt: string,
  compileFn: CompileFn,
  label: string,
) {
  const tools = { test_code: createTestCodeTool(compileFn) };

  // --- Stream-scoped mutable state ---
  // `generation` prevents stale onStepFinish callbacks from a dying stream
  // from corrupting state for a new stream. Each sendMessages call bumps it.
  let generation = 0;
  let lastTestResult: 'none' | 'failed' | 'succeeded' = 'none';
  let consecutiveFailures = 0;

  const agent = new ToolLoopAgent({
    model,
    instructions: systemPrompt,
    tools,

    stopWhen: ({ steps }) => {
      if (steps.length >= MAX_STEPS) {
        console.log(`[${label}] Stopping loop: max steps (${MAX_STEPS}) reached`);
        return true;
      }
      // After a successful test_code, allow exactly 1 more step for the
      // AI's text response. Check the steps array directly — no mutable
      // counters, no double-counting risk.
      for (let i = 0; i < steps.length - 1; i++) {
        const hasSuccess = steps[i]!.toolResults.some(
          (r: { toolName: string; output: unknown }) => {
            const out = r.output as Record<string, unknown> | null;
            return r.toolName === 'test_code' && out?.success === true;
          },
        );
        if (hasSuccess) {
          console.log(`[${label}] Stopping loop: success at step ${i + 1}, step ${steps.length} completed`);
          return true;
        }
      }
      return false;
    },

    prepareStep() {
      if (lastTestResult === 'succeeded') {
        return { toolChoice: 'none' as const };
      }
      // After repeated failures, let the model decide — it may need to
      // explain an unfixable issue rather than retry endlessly.
      if (lastTestResult === 'failed' && consecutiveFailures < MAX_FORCED_RETRIES) {
        return { toolChoice: 'required' as const };
      }
      return { toolChoice: 'auto' as const };
    },

    onStepFinish({ stepNumber, finishReason, toolCalls, toolResults }) {
      console.log(`[${label}] Step ${stepNumber} finished: reason=${finishReason}, toolCalls=${toolCalls.length}, toolResults=${toolResults.length}`);
      // Capture the generation at callback creation time — if a new stream
      // started since, ignore this callback's state mutation.
      const myGen = generation;
      for (const r of toolResults) {
        console.log(`[${label}]   tool=${r.toolName} output=`, r.output);
        if (r.toolName === 'test_code' && myGen === generation) {
          const output = r.output as Record<string, unknown>;
          if (output.success === true) {
            lastTestResult = 'succeeded';
            consecutiveFailures = 0;
          } else {
            lastTestResult = 'failed';
            consecutiveFailures++;
          }
        }
      }
    },
  });

  function onBeforeStream() {
    generation++;
    lastTestResult = 'none';
    consecutiveFailures = 0;
  }

  return { agent, tools, onBeforeStream };
}
