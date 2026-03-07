// Barrel re-exports — single source of truth for all shared types

export type {
  BoundingBox,
  CadEngine,
  CompileError,
  CompileErrorType,
  CompileResult,
  EngineError,
  EnginePhase,
  EngineStatus,
  PartMetadata,
  QualityLevel,
} from './engine';

export type { WorkerRequest, WorkerResponse } from './worker-protocol';

export type {
  AIProviderConfig,
  AIProviderType,
  CADContext,
  CodeBlock,
} from './ai';

export type {
  AppStore,
  AuthSlice,
  AuthUser,
  CodeVersion,
  CompilationSlice,
  CompilationStatus,
  EditorSlice,
  EngineSlice,
  SettingsSlice,
  VersionHistorySlice,
  VersionSource,
  ViewportSlice,
} from './store';

export { getPartColor, PART_COLORS } from './colors';
