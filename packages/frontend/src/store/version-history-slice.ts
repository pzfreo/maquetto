import type { StateCreator } from 'zustand';
import type { VersionHistorySlice, AppStore, CodeVersion } from '@maquetto/api-types';

const STORAGE_KEY = 'maquetto:version-history';
const MAX_VERSIONS = 30;

function loadVersions(): CodeVersion[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CodeVersion[];
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_VERSIONS);
      }
    }
  } catch (e) {
    console.warn('[VersionHistory] Failed to load from localStorage:', e);
  }
  return [];
}

function persistVersions(versions: ReadonlyArray<CodeVersion>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  } catch (e) {
    console.warn('[VersionHistory] Failed to persist to localStorage:', e);
  }
}

export const createVersionHistorySlice: StateCreator<AppStore, [], [], VersionHistorySlice> = (set, get) => ({
  versions: loadVersions(),
  selectedVersionId: null,
  isDiffExpanded: false,

  saveVersion: (code, source, summary, prompt) => {
    const version: CodeVersion = {
      id: crypto.randomUUID(),
      code,
      timestamp: Date.now(),
      source,
      summary,
      prompt,
    };
    const current = get().versions;
    const updated = [version, ...current].slice(0, MAX_VERSIONS);
    persistVersions(updated);
    console.log(`[VersionHistory] Saved version: "${summary}" (${source}), total: ${updated.length}`);
    set({ versions: updated });
  },

  selectVersion: (id) => set({ selectedVersionId: id }),

  revertToVersion: (id) => {
    const version = get().versions.find((v) => v.id === id);
    if (version) {
      console.log(`[VersionHistory] Reverting to: "${version.summary}"`);
      set({ selectedVersionId: null, isDiffExpanded: false, code: version.code, isDirty: true });
    }
  },

  setDiffExpanded: (isDiffExpanded) => set({ isDiffExpanded }),
});
