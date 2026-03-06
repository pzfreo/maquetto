import type { StateCreator } from 'zustand';
import type { ViewportSlice, AppStore } from '@maquetto/api-types';

export const createViewportSlice: StateCreator<AppStore, [], [], ViewportSlice> = (set, get) => ({
  selectedPartIds: [],
  cameraDescription: 'default view',

  setSelectedPartIds: (selectedPartIds) => set({ selectedPartIds }),

  togglePartSelection: (id) => {
    const current = get().selectedPartIds;
    const next = current.includes(id)
      ? current.filter((pid) => pid !== id)
      : [...current, id];
    set({ selectedPartIds: next });
  },

  setCameraDescription: (cameraDescription) => set({ cameraDescription }),
});
