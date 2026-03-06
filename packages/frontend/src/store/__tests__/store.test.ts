import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../index';

describe('AppStore', () => {
  beforeEach(() => {
    // Reset store to defaults
    useAppStore.setState({
      engineStatus: { phase: 'idle', progress: 0 },
      code: '',
      isDirty: false,
      compilationStatus: 'idle',
      parts: [],
      errors: [],
      warnings: [],
      gltfData: null,
      executionTimeMs: null,
      selectedPartIds: [],
      cameraDescription: 'default view',
      versions: [],
      selectedVersionId: null,
      isDiffExpanded: false,
    });
  });

  describe('EngineSlice', () => {
    it('starts with idle phase', () => {
      const { engineStatus } = useAppStore.getState();
      expect(engineStatus.phase).toBe('idle');
      expect(engineStatus.progress).toBe(0);
    });

    it('updates engine status', () => {
      useAppStore.getState().setEngineStatus({
        phase: 'loading-pyodide',
        progress: 25,
      });
      expect(useAppStore.getState().engineStatus.phase).toBe('loading-pyodide');
      expect(useAppStore.getState().engineStatus.progress).toBe(25);
    });
  });

  describe('EditorSlice', () => {
    it('sets code and marks dirty', () => {
      useAppStore.getState().setCode('print("hello")');
      expect(useAppStore.getState().code).toBe('print("hello")');
      expect(useAppStore.getState().isDirty).toBe(true);
    });
  });

  describe('CompilationSlice', () => {
    it('processes a successful compile result', () => {
      const result = {
        gltfBase64: btoa('fake-glb'),
        parts: [
          {
            id: '@1',
            color: [0.259, 0.522, 0.957] as const,
            boundingBox: {
              min: [0, 0, 0] as const,
              max: [50, 40, 30] as const,
            },
            faceCount: 6,
            volume: 60000,
          },
        ],
        errors: [],
        warnings: [],
        executionTimeMs: 150,
      };

      useAppStore.getState().setCompileResult(result);

      const state = useAppStore.getState();
      expect(state.compilationStatus).toBe('success');
      expect(state.parts).toHaveLength(1);
      expect(state.parts[0]?.id).toBe('@1');
      expect(state.gltfData).toBeInstanceOf(ArrayBuffer);
      expect(state.executionTimeMs).toBe(150);
    });

    it('sets error status when compile has errors', () => {
      const result = {
        gltfBase64: '',
        parts: [],
        errors: [
          {
            type: 'syntax' as const,
            message: 'invalid syntax',
            line: 1,
            column: 5,
          },
        ],
        warnings: [],
        executionTimeMs: 10,
      };

      useAppStore.getState().setCompileResult(result);
      expect(useAppStore.getState().compilationStatus).toBe('error');
      expect(useAppStore.getState().errors).toHaveLength(1);
    });

    it('clears compilation state', () => {
      useAppStore.getState().setCompilationStatus('compiling');
      useAppStore.getState().clearCompilation();
      expect(useAppStore.getState().compilationStatus).toBe('idle');
      expect(useAppStore.getState().gltfData).toBeNull();
    });
  });

  describe('ViewportSlice', () => {
    it('toggles part selection', () => {
      useAppStore.getState().togglePartSelection('@1');
      expect(useAppStore.getState().selectedPartIds).toEqual(['@1']);

      useAppStore.getState().togglePartSelection('@2');
      expect(useAppStore.getState().selectedPartIds).toEqual(['@1', '@2']);

      useAppStore.getState().togglePartSelection('@1');
      expect(useAppStore.getState().selectedPartIds).toEqual(['@2']);
    });

    it('sets camera description', () => {
      useAppStore.getState().setCameraDescription('front-right, above');
      expect(useAppStore.getState().cameraDescription).toBe('front-right, above');
    });
  });

  describe('SettingsSlice', () => {
    it('has default quality level', () => {
      expect(useAppStore.getState().qualityLevel).toBe('normal');
    });

    it('updates quality level', () => {
      useAppStore.getState().setQualityLevel('high');
      expect(useAppStore.getState().qualityLevel).toBe('high');
    });
  });
});
