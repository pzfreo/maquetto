import type { CompileResult, EngineError, EngineStatus, ExportFormat, QualityLevel } from './engine';

// --- Main thread → Worker ---

export type WorkerRequest =
  | { readonly type: 'init'; readonly requestId: string }
  | {
      readonly type: 'compile';
      readonly requestId: string;
      readonly code: string;
      readonly quality: QualityLevel;
    }
  | {
      readonly type: 'export';
      readonly requestId: string;
      readonly code: string;
      readonly format: ExportFormat;
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
    }
  | {
      readonly type: 'export-result';
      readonly requestId: string;
      readonly data: ArrayBuffer;
      readonly filename: string;
    }
  | {
      readonly type: 'export-error';
      readonly requestId: string;
      readonly error: EngineError;
    };
