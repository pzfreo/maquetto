import { describe, it, expect, vi } from 'vitest';

// Mock transport factories before importing the registry
vi.mock('../transports/google-transport', () => ({
  createGoogleTransport: vi.fn(() => ({ type: 'google-transport' })),
}));

vi.mock('../transports/anthropic-transport', () => ({
  createAnthropicTransport: vi.fn(() => ({ type: 'anthropic-transport' })),
}));

import { createTransport } from '../provider-registry';
import { createGoogleTransport } from '../transports/google-transport';
import { createAnthropicTransport } from '../transports/anthropic-transport';

const dummyCompile = vi.fn();

describe('createTransport', () => {
  it('returns null for no provider', () => {
    expect(createTransport({ type: 'none' }, dummyCompile)).toBeNull();
  });

  it('returns null for missing credential', () => {
    expect(createTransport({ type: 'google' }, dummyCompile)).toBeNull();
  });

  it('creates Google BYOK transport', () => {
    const result = createTransport({ type: 'google', credential: 'key' }, dummyCompile);
    expect(result).not.toBeNull();
    expect(createGoogleTransport).toHaveBeenCalledWith(
      'key', expect.any(String), dummyCompile, undefined, false,
    );
  });

  it('creates Google OAuth transport', () => {
    const result = createTransport({ type: 'google-oauth', credential: 'token' }, dummyCompile);
    expect(result).not.toBeNull();
    expect(createGoogleTransport).toHaveBeenCalledWith(
      'token', expect.any(String), dummyCompile, undefined, true,
    );
  });

  it('creates Anthropic transport', () => {
    const result = createTransport({ type: 'anthropic', credential: 'sk-key' }, dummyCompile);
    expect(result).not.toBeNull();
    expect(createAnthropicTransport).toHaveBeenCalledWith(
      'sk-key', expect.any(String), dummyCompile, undefined,
    );
  });

  it('passes model ID through', () => {
    createTransport({ type: 'anthropic', credential: 'sk-key', modelId: 'claude-opus-4-20250514' }, dummyCompile);
    expect(createAnthropicTransport).toHaveBeenCalledWith(
      'sk-key', expect.any(String), dummyCompile, 'claude-opus-4-20250514',
    );
  });

  it('uses custom system prompt when provided', () => {
    createTransport({ type: 'anthropic', credential: 'sk-key' }, dummyCompile, 'Custom prompt');
    expect(createAnthropicTransport).toHaveBeenCalledWith(
      'sk-key', 'Custom prompt', dummyCompile, undefined,
    );
  });
});
