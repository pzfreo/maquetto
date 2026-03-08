import type { PartMetadata } from './engine';

export type AIProviderType = 'google' | 'google-oauth' | 'anthropic' | 'none';

export interface AIModelOption {
  readonly id: string;
  readonly label: string;
}

const GEMINI_MODELS: readonly AIModelOption[] = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash' },
] as const;

/** Available models per provider */
export const AI_MODELS: Record<Exclude<AIProviderType, 'none'>, readonly AIModelOption[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { id: 'claude-haiku-3-5-20241022', label: 'Claude Haiku 3.5' },
  ],
  google: GEMINI_MODELS,
  'google-oauth': GEMINI_MODELS,
} as const;

/** Default model ID per provider */
export const DEFAULT_MODEL: Record<Exclude<AIProviderType, 'none'>, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  google: 'gemini-2.0-flash',
  'google-oauth': 'gemini-2.0-flash',
} as const;

export interface AIProviderConfig {
  readonly type: AIProviderType;
  /** Google/google-oauth: API key or OAuth token. Anthropic: API key. 'none': undefined. */
  readonly credential?: string;
  /** Model ID to use. Falls back to provider default if not set. */
  readonly modelId?: string;
}

/** CAD-specific context injected into each AI message */
export interface CADContext {
  readonly code: string;
  readonly parts: ReadonlyArray<PartMetadata>;
  readonly selectedPartIds: ReadonlyArray<string>;
  readonly cameraDescription: string;
  readonly screenshotDataUrl: string | null;
}

/** A code block extracted from an AI response */
export interface CodeBlock {
  readonly language: string;
  readonly code: string;
  readonly startIndex: number;
  readonly endIndex: number;
}
