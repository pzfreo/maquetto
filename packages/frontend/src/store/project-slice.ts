import type { StateCreator } from 'zustand';
import type { ProjectSlice, AppStore } from '@maquetto/api-types';

const TITLE_STORAGE_KEY = 'maquetto:project-title';

function loadTitle(): string | null {
  try {
    return localStorage.getItem(TITLE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistTitle(title: string | null): void {
  try {
    if (title) {
      localStorage.setItem(TITLE_STORAGE_KEY, title);
    } else {
      localStorage.removeItem(TITLE_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

export const createProjectSlice: StateCreator<AppStore, [], [], ProjectSlice> = (set) => {
  const savedTitle = loadTitle();
  return {
    currentProject: savedTitle
      ? { id: '', userId: '', title: savedTitle, code: '', createdAt: '', updatedAt: '' }
      : null,
    projectList: [],
    projectLoading: false,
    projectSaving: false,
    setCurrentProject: (project) => {
      persistTitle(project?.title ?? null);
      set({ currentProject: project });
    },
    setProjectList: (projects) => set({ projectList: projects }),
    setProjectLoading: (loading) => set({ projectLoading: loading }),
    setProjectSaving: (saving) => set({ projectSaving: saving }),
    updateProjectTitle: (title) => {
      persistTitle(title);
      set((state) => ({
        currentProject: state.currentProject
          ? { ...state.currentProject, title }
          : {
              id: '',
              userId: '',
              title,
              code: state.code,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
      }));
    },
  };
};
