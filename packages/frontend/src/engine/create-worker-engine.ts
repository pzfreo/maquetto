import type {
  CadEngine,
  CompileResult,
  EngineStatus,
  QualityLevel,
  WorkerResponse,
} from '@maquetto/api-types';

interface PendingRequest {
  resolve: (result: CompileResult) => void;
}

/**
 * Factory function that creates a CadEngine backed by a Web Worker.
 * The UI layer should call this once and use the returned interface.
 * All Worker/postMessage details are encapsulated here.
 */
export function createWorkerEngine(): CadEngine {
  console.log('[Engine] Creating Web Worker...');
  const worker = new Worker(new URL('./cad-worker.ts', import.meta.url), {
    type: 'module',
  });

  const listeners = new Set<(status: EngineStatus) => void>();
  const pending = new Map<string, PendingRequest>();

  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;

    switch (msg.type) {
      case 'status':
        console.log(`[Engine] Status: ${msg.status.phase} (${msg.status.progress}%)`);
        if (msg.status.error) {
          console.error(`[Engine] Error: ${msg.status.error.code} — ${msg.status.error.message}`);
        }
        for (const cb of listeners) {
          cb(msg.status);
        }
        break;

      case 'compile-result':
        console.log(`[Engine] Compile result received: ${msg.result.parts.length} parts, ${msg.result.errors.length} errors`);
        pending.get(msg.requestId)?.resolve(msg.result);
        pending.delete(msg.requestId);
        break;

      case 'compile-error':
        console.error(`[Engine] Compile error: ${msg.error.message}`);
        pending.get(msg.requestId)?.resolve({
          gltfBase64: '',
          parts: [],
          errors: [
            {
              type: 'runtime',
              message: msg.error.message,
              line: null,
              column: null,
            },
          ],
          warnings: [],
          executionTimeMs: 0,
        });
        pending.delete(msg.requestId);
        break;
    }
  };

  worker.onerror = (e) => {
    console.error('[Engine] Worker error:', e.message);
  };

  // Start initialization
  console.log('[Engine] Sending init message to worker...');
  worker.postMessage({
    type: 'init',
    requestId: crypto.randomUUID(),
  });

  return {
    subscribe(callback: (status: EngineStatus) => void): () => void {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    compile(code: string, quality: QualityLevel): Promise<CompileResult> {
      const requestId = crypto.randomUUID();
      console.log(`[Engine] Requesting compile (quality=${quality}, ${code.length} chars)`);
      return new Promise<CompileResult>((resolve) => {
        pending.set(requestId, { resolve });
        worker.postMessage({ type: 'compile', requestId, code, quality });
      });
    },

    retry(): void {
      console.log('[Engine] Retrying initialization...');
      worker.postMessage({
        type: 'init',
        requestId: crypto.randomUUID(),
      });
    },

    dispose(): void {
      console.log('[Engine] Disposing worker');
      worker.terminate();
      listeners.clear();
      pending.clear();
    },
  };
}
