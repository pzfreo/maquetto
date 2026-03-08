import type { StateCreator } from 'zustand';
import type { ProjectSlice, AppStore } from '@maquetto/api-types';

export const createProjectSlice: StateCreator<AppStore, [], [], ProjectSlice> = (set) => ({
  currentProject: null,
  projectList: [],
  projectLoading: false,
  projectSaving: false,
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjectList: (projects) => set({ projectList: projects }),
  setProjectLoading: (loading) => set({ projectLoading: loading }),
  setProjectSaving: (saving) => set({ projectSaving: saving }),
  updateProjectTitle: (title) =>
    set((state) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, title }
        : null,
    })),
});
