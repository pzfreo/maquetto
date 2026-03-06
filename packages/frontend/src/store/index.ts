import { create } from 'zustand';
import type { AppStore } from '@maquetto/api-types';
import { createEngineSlice } from './engine-slice';
import { createEditorSlice } from './editor-slice';
import { createCompilationSlice } from './compilation-slice';
import { createViewportSlice } from './viewport-slice';
import { createSettingsSlice } from './settings-slice';

export const useAppStore = create<AppStore>()((...args) => ({
  ...createEngineSlice(...args),
  ...createEditorSlice(...args),
  ...createCompilationSlice(...args),
  ...createViewportSlice(...args),
  ...createSettingsSlice(...args),
}));
