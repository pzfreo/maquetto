import type { StateCreator } from 'zustand';
import type { ViewportSlice, AppStore } from '@maquetto/api-types';

export const createViewportSlice: StateCreator<AppStore, [], [], ViewportSlice> = (set, get) => ({
  selectedPartIds: [],
  hiddenPartIds: [],
  cameraDescription: 'default view',
  labelsVisible: true,
  captureScreenshot: null,

  setSelectedPartIds: (selectedPartIds) => set({ selectedPartIds }),

  togglePartSelection: (id) => {
    const current = get().selectedPartIds;
    const next = current.includes(id)
      ? current.filter((pid) => pid !== id)
      : [...current, id];
    set({ selectedPartIds: next });
  },

  togglePartVisibility: (id) => {
    const current = get().hiddenPartIds;
    const next = current.includes(id)
      ? current.filter((pid) => pid !== id)
      : [...current, id];
    set({ hiddenPartIds: next });
  },

  showAllParts: () => set({ hiddenPartIds: [] }),

  setCameraDescription: (cameraDescription) => set({ cameraDescription }),

  setCaptureScreenshot: (captureScreenshot) => set({ captureScreenshot }),

  setLabelsVisible: (labelsVisible) => set({ labelsVisible }),
});
