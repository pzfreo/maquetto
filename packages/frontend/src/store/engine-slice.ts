import type { StateCreator } from 'zustand';
import type { EngineSlice, AppStore } from '@maquette/api-types';

export const createEngineSlice: StateCreator<AppStore, [], [], EngineSlice> = (set) => ({
  engineStatus: { phase: 'idle', progress: 0 },
  setEngineStatus: (status) => set({ engineStatus: status }),
});
