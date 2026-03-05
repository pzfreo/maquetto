import type { StateCreator } from 'zustand';
import type { SettingsSlice, AppStore, AIProviderConfig, QualityLevel } from '@maquette/api-types';

const STORAGE_KEYS = {
  aiProvider: 'maquette:ai-provider',
  qualityLevel: 'maquette:quality-level',
} as const;

function loadAIProvider(): AIProviderConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.aiProvider);
    if (stored) return JSON.parse(stored) as AIProviderConfig;
  } catch {
    // ignore
  }
  return { type: 'none' };
}

function loadQualityLevel(): QualityLevel {
  const stored = localStorage.getItem(STORAGE_KEYS.qualityLevel);
  if (stored === 'draft' || stored === 'normal' || stored === 'high') return stored;
  return 'normal';
}

export const createSettingsSlice: StateCreator<AppStore, [], [], SettingsSlice> = (set) => ({
  aiProvider: loadAIProvider(),
  qualityLevel: loadQualityLevel(),

  setAIProvider: (aiProvider) => {
    localStorage.setItem(STORAGE_KEYS.aiProvider, JSON.stringify(aiProvider));
    set({ aiProvider });
  },

  setQualityLevel: (qualityLevel) => {
    localStorage.setItem(STORAGE_KEYS.qualityLevel, qualityLevel);
    set({ qualityLevel });
  },
});
