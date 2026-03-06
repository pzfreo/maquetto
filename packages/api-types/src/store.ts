import type {
  CompileError,
  CompileResult,
  EngineStatus,
  PartMetadata,
  QualityLevel,
} from './engine';
import type { AIProviderConfig } from './ai';

// --- Engine Slice ---

export interface EngineSlice {
  readonly engineStatus: EngineStatus;
  setEngineStatus: (status: EngineStatus) => void;
}

// --- Editor Slice ---

export interface EditorSlice {
  readonly code: string;
  readonly isDirty: boolean;
  setCode: (code: string) => void;
  setDirty: (dirty: boolean) => void;
}

// --- Compilation Slice ---

export type CompilationStatus = 'idle' | 'compiling' | 'success' | 'error';

export interface CompilationSlice {
  readonly compilationStatus: CompilationStatus;
  readonly parts: ReadonlyArray<PartMetadata>;
  readonly errors: ReadonlyArray<CompileError>;
  readonly warnings: ReadonlyArray<string>;
  readonly gltfData: ArrayBuffer | null;
  readonly executionTimeMs: number | null;
  /** Message queued for the AI chat (e.g. from "Ask AI to fix" button). */
  readonly pendingChatMessage: string | null;
  setCompileResult: (result: CompileResult) => void;
  setCompilationStatus: (status: CompilationStatus) => void;
  clearCompilation: () => void;
  setPendingChatMessage: (message: string | null) => void;
}

// --- Viewport Slice ---

export interface ViewportSlice {
  readonly selectedPartIds: ReadonlyArray<string>;
  readonly cameraDescription: string;
  setSelectedPartIds: (ids: ReadonlyArray<string>) => void;
  togglePartSelection: (id: string) => void;
  setCameraDescription: (desc: string) => void;
}

// --- Settings Slice ---

export interface SettingsSlice {
  readonly aiProvider: AIProviderConfig;
  readonly qualityLevel: QualityLevel;
  setAIProvider: (config: AIProviderConfig) => void;
  setQualityLevel: (level: QualityLevel) => void;
}

// --- Version History Slice ---

export type VersionSource = 'ai' | 'user';

export interface CodeVersion {
  readonly id: string;
  readonly code: string;
  readonly timestamp: number;
  readonly source: VersionSource;
  /** Short description: first sentence of AI text, or "Manual edit" */
  readonly summary: string;
  /** The user's prompt that triggered this AI response (only for source='ai') */
  readonly prompt: string | null;
}

export interface VersionHistorySlice {
  readonly versions: ReadonlyArray<CodeVersion>;
  readonly selectedVersionId: string | null;
  readonly isDiffExpanded: boolean;
  saveVersion: (code: string, source: VersionSource, summary: string, prompt: string | null) => void;
  selectVersion: (id: string | null) => void;
  revertToVersion: (id: string) => void;
  setDiffExpanded: (expanded: boolean) => void;
}

// --- Combined Store ---

export type AppStore = EngineSlice &
  EditorSlice &
  CompilationSlice &
  ViewportSlice &
  SettingsSlice &
  VersionHistorySlice;
