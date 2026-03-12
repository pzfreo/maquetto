import type {
  CompileError,
  CompileResult,
  EngineStatus,
  PartMetadata,
  QualityLevel,
} from './engine';
import type { AIProviderConfig } from './ai';

// --- Auth Slice ---

export interface AuthUser {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
  readonly avatarUrl: string | null;
  readonly provider: 'google' | 'github';
}

export interface AuthSlice {
  readonly authUser: AuthUser | null;
  readonly authLoading: boolean;
  /** Google OAuth access token for Gemini API access */
  readonly providerToken: string | null;
  /** Google OAuth refresh token for renewing expired access tokens */
  readonly providerRefreshToken: string | null;
  setAuthUser: (user: AuthUser | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setProviderToken: (token: string | null) => void;
  setProviderRefreshToken: (token: string | null) => void;
  signOut: () => void;
}

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
  resetCode: () => void;
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
  /** Captured Python stdout from user code (print() output). */
  readonly consoleOutput: string | null;
  /** Message queued for the AI chat (e.g. from "Ask AI to fix" button). */
  readonly pendingChatMessage: string | null;
  /** Registered by ChatPanel — clears the AI chat message history. */
  clearChat: (() => void) | null;
  setCompileResult: (result: CompileResult) => void;
  setCompilationStatus: (status: CompilationStatus) => void;
  clearCompilation: () => void;
  setPendingChatMessage: (message: string | null) => void;
  setClearChat: (fn: (() => void) | null) => void;
}

// --- Viewport Slice ---

export interface ViewportSlice {
  readonly selectedPartIds: ReadonlyArray<string>;
  readonly hiddenPartIds: ReadonlyArray<string>;
  readonly cameraDescription: string;
  readonly labelsVisible: boolean;
  /** Registered by the viewport Canvas — captures the current render as a PNG data URL. */
  captureScreenshot: (() => string | null) | null;
  setSelectedPartIds: (ids: ReadonlyArray<string>) => void;
  togglePartSelection: (id: string) => void;
  togglePartVisibility: (id: string) => void;
  showAllParts: () => void;
  setCameraDescription: (desc: string) => void;
  setCaptureScreenshot: (fn: (() => string | null) | null) => void;
  setLabelsVisible: (visible: boolean) => void;
}

// --- Settings Slice ---

export type CredentialStatus = 'unchecked' | 'checking' | 'valid' | 'invalid';

export interface SettingsSlice {
  readonly aiProvider: AIProviderConfig;
  readonly qualityLevel: QualityLevel;
  /** User override for the AI system prompt. null = use default. */
  readonly customSystemPrompt: string | null;
  /** Result of the last credential validation check */
  readonly credentialStatus: CredentialStatus;
  /** Error message from the last failed credential check */
  readonly credentialError: string | null;
  setAIProvider: (config: AIProviderConfig) => void;
  setQualityLevel: (level: QualityLevel) => void;
  setCustomSystemPrompt: (prompt: string | null) => void;
  setCredentialStatus: (status: CredentialStatus, error?: string | null) => void;
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
  updateLatestVersionSummary: (summary: string, prompt: string | null) => void;
  selectVersion: (id: string | null) => void;
  revertToVersion: (id: string) => void;
  setDiffExpanded: (expanded: boolean) => void;
  clearVersionHistory: () => void;
}

// --- Project Slice ---

export interface Project {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly code: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectSlice {
  readonly currentProject: Project | null;
  readonly projectList: ReadonlyArray<Project>;
  readonly projectLoading: boolean;
  readonly projectSaving: boolean;
  setCurrentProject: (project: Project | null) => void;
  setProjectList: (projects: ReadonlyArray<Project>) => void;
  setProjectLoading: (loading: boolean) => void;
  setProjectSaving: (saving: boolean) => void;
  updateProjectTitle: (title: string) => void;
}

// --- Combined Store ---

export type AppStore = AuthSlice &
  EngineSlice &
  EditorSlice &
  CompilationSlice &
  ViewportSlice &
  SettingsSlice &
  VersionHistorySlice &
  ProjectSlice;
