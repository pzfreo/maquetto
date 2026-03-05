import type { CompileResult, EngineError, EngineStatus, QualityLevel } from './engine';

// --- Main thread → Worker ---

export type WorkerRequest =
  | { readonly type: 'init'; readonly requestId: string }
  | {
      readonly type: 'compile';
      readonly requestId: string;
      readonly code: string;
      readonly quality: QualityLevel;
    };

// --- Worker → Main thread ---

export type WorkerResponse =
  | { readonly type: 'status'; readonly status: EngineStatus }
  | {
      readonly type: 'compile-result';
      readonly requestId: string;
      readonly result: CompileResult;
    }
  | {
      readonly type: 'compile-error';
      readonly requestId: string;
      readonly error: EngineError;
    };
