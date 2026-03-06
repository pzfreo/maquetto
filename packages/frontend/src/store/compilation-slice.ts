import type { StateCreator } from 'zustand';
import type { CompilationSlice, AppStore } from '@maquetto/api-types';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

export const createCompilationSlice: StateCreator<AppStore, [], [], CompilationSlice> = (set) => ({
  compilationStatus: 'idle',
  parts: [],
  errors: [],
  warnings: [],
  gltfData: null,
  executionTimeMs: null,
  pendingChatMessage: null,

  setCompileResult: (result) => {
    const gltfData = result.gltfBase64 ? base64ToArrayBuffer(result.gltfBase64) : null;
    console.log(`[Store] Compile result: ${result.parts.length} parts, ${result.errors.length} errors, glTF=${gltfData ? gltfData.byteLength + ' bytes' : 'null'}`);
    set({
      compilationStatus: result.errors.length > 0 ? 'error' : 'success',
      parts: result.parts,
      errors: result.errors,
      warnings: result.warnings,
      gltfData,
      executionTimeMs: result.executionTimeMs,
    });
  },

  setCompilationStatus: (compilationStatus) => set({ compilationStatus }),

  clearCompilation: () =>
    set({
      compilationStatus: 'idle',
      parts: [],
      errors: [],
      warnings: [],
      gltfData: null,
      executionTimeMs: null,
    }),

  setPendingChatMessage: (pendingChatMessage) => set({ pendingChatMessage }),
});
