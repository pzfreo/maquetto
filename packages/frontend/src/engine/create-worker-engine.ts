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

function createWorker(): Worker {
  return new Worker(new URL('./cad-worker.ts', import.meta.url), {
    type: 'module',
  });
}

function wireWorker(
  worker: Worker,
  listeners: Set<(status: EngineStatus) => void>,
  pending: Map<string, PendingRequest>,
  onCrash: (message: string) => void,
): void {
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
    console.error('[Engine] Worker crashed:', e.message);
    onCrash(e.message ?? 'Worker crashed unexpectedly');
  };
}

/**
 * Factory function that creates a CadEngine backed by a Web Worker.
 * The UI layer should call this once and use the returned interface.
 * All Worker/postMessage details are encapsulated here.
 *
 * On fatal crash (WASM memory error, etc.), the worker is terminated
 * and retry() creates a fresh one.
 */
export function createWorkerEngine(): CadEngine {
  console.log('[Engine] Creating Web Worker...');

  const listeners = new Set<(status: EngineStatus) => void>();
  const pending = new Map<string, PendingRequest>();
  let worker = createWorker();
  let disposed = false;

  function notifyListeners(status: EngineStatus): void {
    for (const cb of listeners) {
      cb(status);
    }
  }

  function failPendingRequests(message: string): void {
    for (const [id, req] of pending) {
      req.resolve({
        gltfBase64: '',
        parts: [],
        errors: [{ type: 'runtime', message, line: null, column: null }],
        warnings: [],
        executionTimeMs: 0,
      });
      pending.delete(id);
    }
  }

  function handleCrash(message: string): void {
    console.error('[Engine] Fatal crash — worker will be replaced on retry');
    // Fail any pending compile requests
    failPendingRequests(`Engine crashed: ${message}`);
    // Terminate the dead worker
    worker.terminate();
    // Notify UI so error badge + Retry button appear
    notifyListeners({
      phase: 'error',
      progress: 0,
      error: {
        code: 'WORKER_CRASHED',
        message: `WASM runtime error: ${message}. Click Retry to restart the engine.`,
      },
    });
  }

  wireWorker(worker, listeners, pending, handleCrash);

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
      if (disposed) return;
      console.log('[Engine] Restarting with fresh worker...');
      // Kill old worker (may already be terminated from crash)
      worker.terminate();
      // Create a brand new worker with fresh WASM memory
      worker = createWorker();
      wireWorker(worker, listeners, pending, handleCrash);
      // Re-initialize
      worker.postMessage({
        type: 'init',
        requestId: crypto.randomUUID(),
      });
    },

    dispose(): void {
      disposed = true;
      console.log('[Engine] Disposing worker');
      worker.terminate();
      listeners.clear();
      pending.clear();
    },
  };
}
