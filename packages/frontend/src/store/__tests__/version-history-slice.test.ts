import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../index';

describe('VersionHistorySlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      versions: [],
      selectedVersionId: null,
      isDiffExpanded: false,
      code: 'initial code',
      isDirty: false,
    });
    localStorage.removeItem('maquetto:version-history');
  });

  it('starts with empty versions', () => {
    expect(useAppStore.getState().versions).toHaveLength(0);
  });

  it('saves a version', () => {
    useAppStore.getState().saveVersion('code v1', 'ai', 'First AI change', 'make a box');
    const versions = useAppStore.getState().versions;
    expect(versions).toHaveLength(1);
    expect(versions[0]!.code).toBe('code v1');
    expect(versions[0]!.source).toBe('ai');
    expect(versions[0]!.summary).toBe('First AI change');
    expect(versions[0]!.prompt).toBe('make a box');
  });

  it('stores versions newest-first', () => {
    useAppStore.getState().saveVersion('code v1', 'user', 'v1', null);
    useAppStore.getState().saveVersion('code v2', 'ai', 'v2', 'prompt');
    const versions = useAppStore.getState().versions;
    expect(versions).toHaveLength(2);
    expect(versions[0]!.summary).toBe('v2');
    expect(versions[1]!.summary).toBe('v1');
  });

  it('caps at 30 versions', () => {
    for (let i = 0; i < 35; i++) {
      useAppStore.getState().saveVersion(`code ${i}`, 'user', `v${i}`, null);
    }
    expect(useAppStore.getState().versions).toHaveLength(30);
    // Most recent should be first
    expect(useAppStore.getState().versions[0]!.summary).toBe('v34');
  });

  it('selects and deselects a version', () => {
    useAppStore.getState().saveVersion('old code', 'ai', 'test', null);
    const id = useAppStore.getState().versions[0]!.id;

    useAppStore.getState().selectVersion(id);
    expect(useAppStore.getState().selectedVersionId).toBe(id);

    useAppStore.getState().selectVersion(null);
    expect(useAppStore.getState().selectedVersionId).toBeNull();
  });

  it('reverts to a version', () => {
    useAppStore.getState().saveVersion('old code', 'ai', 'test', null);
    const id = useAppStore.getState().versions[0]!.id;

    useAppStore.getState().selectVersion(id);
    useAppStore.getState().setDiffExpanded(true);
    useAppStore.getState().revertToVersion(id);

    expect(useAppStore.getState().code).toBe('old code');
    expect(useAppStore.getState().isDirty).toBe(true);
    expect(useAppStore.getState().selectedVersionId).toBeNull();
    expect(useAppStore.getState().isDiffExpanded).toBe(false);
  });

  it('persists to localStorage', () => {
    useAppStore.getState().saveVersion('persisted', 'user', 'test persist', null);
    const stored = localStorage.getItem('maquetto:version-history');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].code).toBe('persisted');
  });

  it('toggles diff expanded', () => {
    useAppStore.getState().setDiffExpanded(true);
    expect(useAppStore.getState().isDiffExpanded).toBe(true);
    useAppStore.getState().setDiffExpanded(false);
    expect(useAppStore.getState().isDiffExpanded).toBe(false);
  });
});
