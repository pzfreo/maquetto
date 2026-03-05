import { describe, it, expect } from 'vitest';
import { parseCodeBlocks } from '../parse-code-blocks';

describe('parseCodeBlocks', () => {
  it('extracts a single Python code block', () => {
    const text = 'Here is the code:\n```python\nBox(10, 10, 10)\n```\nThat should work.';
    const blocks = parseCodeBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.language).toBe('python');
    expect(blocks[0]?.code).toBe('Box(10, 10, 10)\n');
  });

  it('extracts multiple code blocks', () => {
    const text = '```python\nfirst()\n```\nSome text\n```python\nsecond()\n```';
    const blocks = parseCodeBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.code).toBe('first()\n');
    expect(blocks[1]?.code).toBe('second()\n');
  });

  it('handles blocks without language tag', () => {
    const text = '```\nno_lang()\n```';
    const blocks = parseCodeBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.language).toBe('');
    expect(blocks[0]?.code).toBe('no_lang()\n');
  });

  it('returns empty array when no blocks found', () => {
    const text = 'Just some text without any code blocks.';
    const blocks = parseCodeBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it('captures start and end indices', () => {
    const text = 'Before\n```python\ncode()\n```\nAfter';
    const blocks = parseCodeBlocks(text);

    expect(blocks[0]?.startIndex).toBe(7);
    expect(blocks[0]?.endIndex).toBeGreaterThan(blocks[0]!.startIndex);
  });

  it('handles multiline code blocks', () => {
    const text = '```python\nfrom build123d import *\n\nwith BuildPart() as part:\n    Box(50, 40, 30)\n    Fillet(*part.edges(), radius=3)\n```';
    const blocks = parseCodeBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.code).toContain('from build123d import *');
    expect(blocks[0]?.code).toContain('Fillet');
  });
});
