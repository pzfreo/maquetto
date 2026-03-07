import { describe, it, expect } from 'vitest';
import { assembleContextText } from '../context-assembler';
import type { CADContext, PartMetadata } from '@maquetto/api-types';

const makePart = (overrides: Partial<PartMetadata> = {}): PartMetadata => ({
  id: 'A',
  name: null,
  color: [0.5, 0.5, 0.5],
  boundingBox: { min: [0, 0, 0], max: [10, 20, 30] },
  faceCount: 6,
  volume: 6000,
  ...overrides,
});

const emptyContext: CADContext = {
  code: '',
  parts: [],
  selectedPartIds: [],
  cameraDescription: '',
  screenshotDataUrl: null,
};

describe('assembleContextText', () => {
  it('returns empty string for empty context', () => {
    expect(assembleContextText(emptyContext)).toBe('');
  });

  it('includes code section when code is present', () => {
    const result = assembleContextText({
      ...emptyContext,
      code: 'Box(10, 10, 10)',
    });
    expect(result).toContain('## Current Code');
    expect(result).toContain('```python');
    expect(result).toContain('Box(10, 10, 10)');
  });

  it('skips code section when code is whitespace-only', () => {
    const result = assembleContextText({
      ...emptyContext,
      code: '   \n  ',
    });
    expect(result).not.toContain('## Current Code');
  });

  it('includes part metadata with bounding box dimensions', () => {
    const result = assembleContextText({
      ...emptyContext,
      parts: [makePart()],
    });
    expect(result).toContain('## Parts in Viewport');
    expect(result).toContain('10.0 × 20.0 × 30.0mm');
    expect(result).toContain('6 faces');
    expect(result).toContain('volume: 6000.0');
  });

  it('includes part name when present', () => {
    const result = assembleContextText({
      ...emptyContext,
      parts: [makePart({ id: 'B', name: 'Lid' })],
    });
    expect(result).toContain('B (Lid)');
  });

  it('omits volume when null', () => {
    const result = assembleContextText({
      ...emptyContext,
      parts: [makePart({ volume: null })],
    });
    expect(result).not.toContain('volume');
  });

  it('lists multiple parts', () => {
    const result = assembleContextText({
      ...emptyContext,
      parts: [
        makePart({ id: 'A', name: 'Base' }),
        makePart({ id: 'B', name: 'Top' }),
      ],
    });
    expect(result).toContain('A (Base)');
    expect(result).toContain('B (Top)');
  });

  it('includes selected parts', () => {
    const result = assembleContextText({
      ...emptyContext,
      selectedPartIds: ['A', 'C'],
    });
    expect(result).toContain('## Selected Parts');
    expect(result).toContain('A, C');
  });

  it('includes camera description', () => {
    const result = assembleContextText({
      ...emptyContext,
      cameraDescription: 'Front view, 45° elevation',
    });
    expect(result).toContain('## Camera');
    expect(result).toContain('Front view, 45° elevation');
  });

  it('assembles all sections with double newline separators', () => {
    const result = assembleContextText({
      code: 'Box(1,1,1)',
      parts: [makePart()],
      selectedPartIds: ['A'],
      cameraDescription: 'Top view',
      screenshotDataUrl: null,
    });
    const sections = result.split('\n\n');
    expect(sections.length).toBeGreaterThanOrEqual(4);
    expect(result).toContain('## Current Code');
    expect(result).toContain('## Parts in Viewport');
    expect(result).toContain('## Selected Parts');
    expect(result).toContain('## Camera');
  });
});
