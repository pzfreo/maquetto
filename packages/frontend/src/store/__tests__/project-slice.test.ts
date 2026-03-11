import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../index';

describe('ProjectSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentProject: null,
      projectList: [],
      projectLoading: false,
      projectSaving: false,
      code: 'from build123d import *',
    });
  });

  it('starts with no current project', () => {
    expect(useAppStore.getState().currentProject).toBeNull();
  });

  it('updates title on existing project', () => {
    useAppStore.getState().setCurrentProject({
      id: 'test-id',
      userId: 'user-1',
      title: 'Old Title',
      code: 'print("hi")',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    useAppStore.getState().updateProjectTitle('New Title');

    const project = useAppStore.getState().currentProject;
    expect(project?.title).toBe('New Title');
    expect(project?.id).toBe('test-id');
    expect(project?.userId).toBe('user-1');
  });

  it('creates project stub when updating title with no current project', () => {
    expect(useAppStore.getState().currentProject).toBeNull();

    useAppStore.getState().updateProjectTitle('My Widget');

    const project = useAppStore.getState().currentProject;
    expect(project).not.toBeNull();
    expect(project?.title).toBe('My Widget');
    expect(project?.id).toBe(''); // empty until server assigns a real ID on save
    expect(project?.code).toBe('from build123d import *');
  });

  it('preserves other fields when updating title', () => {
    useAppStore.getState().setCurrentProject({
      id: 'test-id',
      userId: 'user-1',
      title: 'Old Title',
      code: 'box = Box(10, 20, 30)',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-06-15T12:00:00Z',
    });

    useAppStore.getState().updateProjectTitle('Renamed');

    const project = useAppStore.getState().currentProject;
    expect(project?.code).toBe('box = Box(10, 20, 30)');
    expect(project?.createdAt).toBe('2025-01-01T00:00:00Z');
  });

  it('sets and clears current project', () => {
    const project = {
      id: 'p1',
      userId: 'u1',
      title: 'Test',
      code: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    useAppStore.getState().setCurrentProject(project);
    expect(useAppStore.getState().currentProject?.id).toBe('p1');

    useAppStore.getState().setCurrentProject(null);
    expect(useAppStore.getState().currentProject).toBeNull();
  });

  it('manages project list', () => {
    const projects = [
      { id: 'p1', userId: 'u1', title: 'A', code: '', createdAt: '', updatedAt: '' },
      { id: 'p2', userId: 'u1', title: 'B', code: '', createdAt: '', updatedAt: '' },
    ];

    useAppStore.getState().setProjectList(projects);
    expect(useAppStore.getState().projectList).toHaveLength(2);
  });

  it('tracks loading and saving state', () => {
    useAppStore.getState().setProjectLoading(true);
    expect(useAppStore.getState().projectLoading).toBe(true);

    useAppStore.getState().setProjectSaving(true);
    expect(useAppStore.getState().projectSaving).toBe(true);

    useAppStore.getState().setProjectLoading(false);
    useAppStore.getState().setProjectSaving(false);
    expect(useAppStore.getState().projectLoading).toBe(false);
    expect(useAppStore.getState().projectSaving).toBe(false);
  });
});
