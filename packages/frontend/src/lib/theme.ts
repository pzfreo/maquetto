/**
 * Shared theme constants for consistent styling across the app.
 * Centralises hardcoded color values that were previously scattered
 * across 10+ component files.
 */

export const colors = {
  // Backgrounds
  bgPrimary: '#16162a',
  bgSecondary: '#1e1e2e',
  bgTertiary: '#2a2a4e',
  bgInput: '#0d0d1a',

  // Borders
  borderPrimary: '#2a2a3e',
  borderSecondary: '#333',
  borderFocus: '#4a9eff',

  // Text
  textPrimary: '#e0e0e0',
  textSecondary: '#ccc',
  textMuted: '#888',
  textDimmed: '#666',
  textDisabled: '#555',

  // Accent
  accent: '#4a9eff',
  accentHover: '#2a2a4e',

  // Provider-specific
  google: '#4285f4',
  anthropic: '#d97706',

  // Status
  success: '#4caf50',
  error: '#f44336',
  errorBg: 'rgba(244, 67, 54, 0.1)',
  successBg: 'rgba(76, 175, 80, 0.1)',

  // Overlays
  modalOverlay: 'rgba(0, 0, 0, 0.6)',
  subtleOverlay: 'rgba(255, 255, 255, 0.05)',
} as const;
