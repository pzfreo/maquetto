import type { StateCreator } from 'zustand';
import type { EditorSlice, AppStore } from '@maquetto/api-types';

const STORAGE_KEY = 'maquetto:editor-code';

const STARTER_CODE = `from build123d import *

result = Box(50, 40, 30)
`;

function loadCode(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored;
  } catch (e) {
    console.warn('[Editor] Failed to load code from localStorage:', e);
  }
  return STARTER_CODE;
}

export const createEditorSlice: StateCreator<AppStore, [], [], EditorSlice> = (set) => ({
  code: loadCode(),
  isDirty: false,
  setCode: (code) => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {
      console.warn('[Editor] Failed to persist code to localStorage:', e);
    }
    set({ code, isDirty: true });
  },
  setDirty: (isDirty) => set({ isDirty }),
  resetCode: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[Editor] Failed to clear code from localStorage:', e);
    }
    set({ code: STARTER_CODE, isDirty: false });
  },
});
