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
  const worker = new Worker(new URL('./cad-worker.ts', import.meta.url), {
    type: 'module',
  });

  const listeners = new Set<(status: EngineStatus) => void>();
  const pending = new Map<string, PendingRequest>();

  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;

    switch (msg.type) {
      case 'status':
        for (const cb of listeners) {
          cb(msg.status);
        }
        break;

      case 'compile-result':
        pending.get(msg.requestId)?.resolve(msg.result);
        pending.delete(msg.requestId);
        break;

      case 'compile-error':
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

  // Start initialization
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
      return new Promise<CompileResult>((resolve) => {
        pending.set(requestId, { resolve });
        worker.postMessage({ type: 'compile', requestId, code, quality });
      });
    },

    retry(): void {
      // Re-send init to restart the loading sequence
      worker.postMessage({
        type: 'init',
        requestId: crypto.randomUUID(),
      });
    },

    dispose(): void {
      worker.terminate();
      listeners.clear();
      pending.clear();
    },
  };
}
