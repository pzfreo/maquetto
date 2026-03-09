import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCredential } from '../validate-credential';

describe('validateCredential', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns invalid for no provider', async () => {
    const result = await validateCredential({ type: 'none' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No provider configured');
  });

  it('returns invalid for missing credential', async () => {
    const result = await validateCredential({ type: 'google' });
    expect(result.valid).toBe(false);
  });

  it('validates Google BYOK with API key in URL', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    const result = await validateCredential({ type: 'google', credential: 'AIzaTest123' });
    expect(result.valid).toBe(true);

    const call = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(call[0]).toContain('key=AIzaTest123');
  });

  it('validates Google OAuth with Bearer token', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    const result = await validateCredential({ type: 'google-oauth', credential: 'ya29.token' });
    expect(result.valid).toBe(true);

    const call = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer ya29.token');
  });

  it('returns invalid for Google 401', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('', { status: 401 }));

    const result = await validateCredential({ type: 'google', credential: 'bad-key' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });

  it('returns invalid for Google OAuth 403', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('', { status: 403 }));

    const result = await validateCredential({ type: 'google-oauth', credential: 'expired' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired or revoked');
  });

  it('validates Anthropic with API key header', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    const result = await validateCredential({ type: 'anthropic', credential: 'sk-ant-test' });
    expect(result.valid).toBe(true);

    const call = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
  });

  it('returns invalid for Anthropic 401', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('', { status: 401 }));

    const result = await validateCredential({ type: 'anthropic', credential: 'bad-key' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });

  it('handles unexpected status codes', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('', { status: 500 }));

    const result = await validateCredential({ type: 'anthropic', credential: 'sk-test' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('API returned 500');
  });

  it('handles network errors', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network failure'));

    const result = await validateCredential({ type: 'google', credential: 'key' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Network failure');
  });
});
