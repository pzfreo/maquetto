import type { StateCreator } from 'zustand';
import type { EditorSlice, AppStore } from '@maquetto/api-types';

const STARTER_CODE = `from build123d import *

with BuildPart() as part:
    Box(50, 40, 30)
    Fillet(*part.edges(), radius=3)
`;

export const createEditorSlice: StateCreator<AppStore, [], [], EditorSlice> = (set) => ({
  code: STARTER_CODE,
  isDirty: false,
  setCode: (code) => set({ code, isDirty: true }),
  setDirty: (isDirty) => set({ isDirty }),
});
