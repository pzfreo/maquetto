import type { PartMetadata } from './engine';

export type AIProviderType = 'google' | 'anthropic' | 'none';

export interface AIProviderConfig {
  readonly type: AIProviderType;
  /** Google: OAuth access token. Anthropic: API key. 'none': undefined. */
  readonly credential?: string;
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
