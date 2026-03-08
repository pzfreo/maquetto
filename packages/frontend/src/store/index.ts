import { create } from 'zustand';
import type { AppStore } from '@maquetto/api-types';
import { createAuthSlice } from './auth-slice';
import { createEngineSlice } from './engine-slice';
import { createEditorSlice } from './editor-slice';
import { createCompilationSlice } from './compilation-slice';
import { createViewportSlice } from './viewport-slice';
import { createSettingsSlice } from './settings-slice';
import { createVersionHistorySlice } from './version-history-slice';
import { createProjectSlice } from './project-slice';

export const useAppStore = create<AppStore>()((...args) => ({
  ...createAuthSlice(...args),
  ...createEngineSlice(...args),
  ...createEditorSlice(...args),
  ...createCompilationSlice(...args),
  ...createViewportSlice(...args),
  ...createSettingsSlice(...args),
  ...createVersionHistorySlice(...args),
  ...createProjectSlice(...args),
}));
