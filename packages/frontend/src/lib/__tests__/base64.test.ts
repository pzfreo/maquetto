import { describe, it, expect } from 'vitest';
import { base64ToArrayBuffer, base64ToUint8Array } from '../base64';

describe('base64ToArrayBuffer', () => {
  it('decodes a simple base64 string', () => {
    const input = btoa('hello');
    const result = base64ToArrayBuffer(input);
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe(5);
    expect(new TextDecoder().decode(result)).toBe('hello');
  });

  it('handles empty string', () => {
    const result = base64ToArrayBuffer(btoa(''));
    expect(result.byteLength).toBe(0);
  });

  it('handles binary data', () => {
    const bytes = new Uint8Array([0, 127, 255, 128, 1]);
    const base64 = btoa(String.fromCharCode(...bytes));
    const result = new Uint8Array(base64ToArrayBuffer(base64));
    expect(result).toEqual(bytes);
  });
});

describe('base64ToUint8Array', () => {
  it('returns a Uint8Array', () => {
    const result = base64ToUint8Array(btoa('test'));
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(4);
  });

  it('produces same bytes as base64ToArrayBuffer', () => {
    const input = btoa('same data');
    const fromBuffer = new Uint8Array(base64ToArrayBuffer(input));
    const fromDirect = base64ToUint8Array(input);
    expect(fromDirect).toEqual(fromBuffer);
  });
});
