// --- Engine Status ---

export type EnginePhase =
  | 'idle'
  | 'loading-pyodide'
  | 'loading-ocp'
  | 'loading-build123d'
  | 'initializing'
  | 'ready'
  | 'error';

export interface EngineStatus {
  readonly phase: EnginePhase;
  /** 0–100, best effort */
  readonly progress: number;
  readonly error?: EngineError;
}

// --- Quality ---

export type QualityLevel = 'draft' | 'normal' | 'high';

// --- Part Metadata ---

export interface BoundingBox {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export interface PartMetadata {
  /** "A", "B", "C" ... "Z", "AA", "AB" — letter label assigned in order of discovery */
  readonly id: string;
  /** Human-readable name from Python variable name, or null if generic (e.g. "result", "obj") */
  readonly name: string | null;
  /** RGB, each 0–1 */
  readonly color: readonly [number, number, number];
  readonly boundingBox: BoundingBox;
  readonly faceCount: number;
  /** null if not a solid */
  readonly volume: number | null;
}

// --- Errors ---

export type CompileErrorType = 'syntax' | 'runtime' | 'geometry';

export interface CompileError {
  readonly type: CompileErrorType;
  readonly message: string;
  readonly line: number | null;
  readonly column: number | null;
  /** Full Python traceback for runtime errors. */
  readonly traceback?: string;
}

export interface EngineError {
  readonly code: string;
  readonly message: string;
}

// --- Compile Result ---

export interface CompileResult {
  /** Base64-encoded .glb binary */
  readonly gltfBase64: string;
  readonly parts: ReadonlyArray<PartMetadata>;
  readonly errors: ReadonlyArray<CompileError>;
  readonly warnings: ReadonlyArray<string>;
  readonly executionTimeMs: number;
}

// --- CadEngine Interface ---

export interface CadEngine {
  /** Subscribe to engine status updates. Returns an unsubscribe function. */
  subscribe(callback: (status: EngineStatus) => void): () => void;

  /** Compile Build123d code and return geometry + metadata. Errors are data, never thrown. */
  compile(code: string, quality: QualityLevel): Promise<CompileResult>;

  /** Retry initialization after an error. */
  retry(): void;

  /** Release all resources. */
  dispose(): void;
}
