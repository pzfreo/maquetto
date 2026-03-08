import { useCallback } from 'react';
import { useAppStore } from '../store';
import { listProjects, saveProject, deleteProject } from '../lib/project-service';
import { supabaseConfigured } from '../lib/supabase';

/**
 * Hook for cloud project save/load operations.
 * All operations are no-ops if Supabase is not configured or user is not signed in.
 */
export function useProjects() {
  const authUser = useAppStore((s) => s.authUser);
  const code = useAppStore((s) => s.code);
  const currentProject = useAppStore((s) => s.currentProject);

  const loadProjectList = useCallback(async () => {
    if (!supabaseConfigured || !authUser) return;
    const store = useAppStore.getState();
    store.setProjectLoading(true);
    try {
      const projects = await listProjects(authUser.id);
      store.setProjectList(projects);
    } catch (err) {
      console.error('[Projects] Failed to load:', err);
    } finally {
      store.setProjectLoading(false);
    }
  }, [authUser]);

  const save = useCallback(async () => {
    if (!supabaseConfigured || !authUser) return;
    const store = useAppStore.getState();
    store.setProjectSaving(true);
    try {
      const title = store.currentProject?.title ?? 'Untitled';
      const saved = await saveProject({
        id: store.currentProject?.id,
        userId: authUser.id,
        title,
        code: store.code,
      });
      store.setCurrentProject(saved);
      store.setDirty(false);
      console.log(`[Projects] Saved: ${saved.id} "${saved.title}"`);
    } catch (err) {
      console.error('[Projects] Failed to save:', err);
    } finally {
      store.setProjectSaving(false);
    }
  }, [authUser]);

  const openProject = useCallback((project: { id: string; title: string; code: string; userId: string; createdAt: string; updatedAt: string }) => {
    const store = useAppStore.getState();
    store.setCurrentProject(project);
    store.setCode(project.code);
    store.setDirty(false);
    store.clearVersionHistory();
    store.clearCompilation();
    store.clearChat?.();
    console.log(`[Projects] Opened: ${project.id} "${project.title}"`);
  }, []);

  const removeProject = useCallback(async (id: string) => {
    if (!supabaseConfigured) return;
    const store = useAppStore.getState();
    try {
      await deleteProject(id);
      store.setProjectList(store.projectList.filter((p) => p.id !== id));
      if (store.currentProject?.id === id) {
        store.setCurrentProject(null);
      }
    } catch (err) {
      console.error('[Projects] Failed to delete:', err);
    }
  }, []);

  const newProject = useCallback(() => {
    const store = useAppStore.getState();
    store.setCurrentProject(null);
    store.resetCode();
    store.clearVersionHistory();
    store.clearCompilation();
    store.clearChat?.();
  }, []);

  return {
    canSave: supabaseConfigured && !!authUser,
    currentProject,
    code,
    save,
    loadProjectList,
    openProject,
    removeProject,
    newProject,
  };
}
