import type { StateCreator } from 'zustand';
import type { SettingsSlice, AppStore, AIProviderConfig, CredentialStatus, QualityLevel } from '@maquetto/api-types';

const STORAGE_KEYS = {
  aiProvider: 'maquetto:ai-provider',
  qualityLevel: 'maquetto:quality-level',
  customSystemPrompt: 'maquetto:custom-system-prompt',
} as const;

function loadAIProvider(): AIProviderConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.aiProvider);
    if (stored) {
      const parsed = JSON.parse(stored) as AIProviderConfig;
      console.log(`[Settings] Loaded AI provider: ${parsed.type}`);
      return parsed;
    }
  } catch (e) {
    console.warn('[Settings] Failed to load AI provider from localStorage:', e);
  }
  console.log('[Settings] No AI provider configured');
  return { type: 'none' };
}

function loadQualityLevel(): QualityLevel {
  const stored = localStorage.getItem(STORAGE_KEYS.qualityLevel);
  if (stored === 'draft' || stored === 'normal' || stored === 'high') return stored;
  return 'normal';
}

function loadCustomSystemPrompt(): string | null {
  return localStorage.getItem(STORAGE_KEYS.customSystemPrompt) || null;
}

export const createSettingsSlice: StateCreator<AppStore, [], [], SettingsSlice> = (set) => ({
  aiProvider: loadAIProvider(),
  qualityLevel: loadQualityLevel(),
  customSystemPrompt: loadCustomSystemPrompt(),
  credentialStatus: 'unchecked' as CredentialStatus,
  credentialError: null,

  setAIProvider: (aiProvider) => {
    console.log(`[Settings] Saving AI provider: ${aiProvider.type}`);
    localStorage.setItem(STORAGE_KEYS.aiProvider, JSON.stringify(aiProvider));
    // Reset credential status when provider changes
    set({ aiProvider, credentialStatus: 'unchecked' as CredentialStatus, credentialError: null });
  },

  setQualityLevel: (qualityLevel) => {
    console.log(`[Settings] Saving quality level: ${qualityLevel}`);
    localStorage.setItem(STORAGE_KEYS.qualityLevel, qualityLevel);
    set({ qualityLevel });
  },

  setCustomSystemPrompt: (customSystemPrompt) => {
    if (customSystemPrompt) {
      localStorage.setItem(STORAGE_KEYS.customSystemPrompt, customSystemPrompt);
    } else {
      localStorage.removeItem(STORAGE_KEYS.customSystemPrompt);
    }
    set({ customSystemPrompt });
  },

  setCredentialStatus: (credentialStatus, credentialError = null) => {
    set({ credentialStatus, credentialError });
  },
});
