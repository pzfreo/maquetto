import { describe, it, expect } from 'vitest';
import { extractSummary } from '../extract-summary';

describe('extractSummary', () => {
  it('returns first sentence', () => {
    expect(extractSummary('I added a fillet. Here is the code.')).toBe('I added a fillet.');
  });

  it('handles exclamation marks', () => {
    expect(extractSummary('Done! The box is now rounded.')).toBe('Done!');
  });

  it('handles question marks', () => {
    expect(extractSummary('How about this? Let me know.')).toBe('How about this?');
  });

  it('truncates at 80 characters', () => {
    const long = 'A'.repeat(100) + '.';
    const result = extractSummary(long);
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result).toContain('...');
  });

  it('strips code blocks', () => {
    const text = 'Added a box.\n```python\nBox(10,10,10)\n```\nDone.';
    expect(extractSummary(text)).toBe('Added a box.');
  });

  it('returns default for empty text', () => {
    expect(extractSummary('')).toBe('AI update');
  });

  it('returns default for code-only text', () => {
    expect(extractSummary('```python\ncode\n```')).toBe('AI update');
  });

  it('uses full text if no sentence boundary', () => {
    expect(extractSummary('Added fillets to all edges')).toBe('Added fillets to all edges');
  });
});
