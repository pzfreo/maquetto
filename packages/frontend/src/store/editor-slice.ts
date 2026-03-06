import type { StateCreator } from 'zustand';
import type { EditorSlice, AppStore } from '@maquetto/api-types';

const STARTER_CODE = `from build123d import *

result = Box(50, 40, 30)
`;

export const createEditorSlice: StateCreator<AppStore, [], [], EditorSlice> = (set) => ({
  code: STARTER_CODE,
  isDirty: false,
  setCode: (code) => set({ code, isDirty: true }),
  setDirty: (isDirty) => set({ isDirty }),
});
