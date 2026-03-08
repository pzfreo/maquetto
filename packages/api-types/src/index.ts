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
  ExportFormat,
  ExportResult,
  PartMetadata,
  QualityLevel,
} from './engine';

export type { WorkerRequest, WorkerResponse } from './worker-protocol';

export type {
  AIModelOption,
  AIProviderConfig,
  AIProviderType,
  CADContext,
  CodeBlock,
} from './ai';

export { AI_MODELS, DEFAULT_MODEL } from './ai';

export type {
  AppStore,
  AuthSlice,
  AuthUser,
  CodeVersion,
  CompilationSlice,
  CompilationStatus,
  EditorSlice,
  EngineSlice,
  Project,
  ProjectSlice,
  SettingsSlice,
  VersionHistorySlice,
  VersionSource,
  ViewportSlice,
} from './store';

export { getPartColor, PART_COLORS } from './colors';
