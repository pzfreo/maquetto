import { useState, useRef, useEffect, useCallback } from 'react';
import { AI_MODELS, DEFAULT_MODEL } from '@maquetto/api-types';
import type { AIProviderType, CadEngine, ExportFormat } from '@maquetto/api-types';
import { useAppStore } from '../../store';
import { EngineStatusBadge } from './EngineStatusBadge';
import { ProviderSettingsModal } from '../Settings/ProviderSettingsModal';
import { signInWithGoogle } from '../../lib/auth-actions';
import { useProjects } from '../../hooks/useProjects';
import { downloadBlob, downloadText } from '../../lib/download';
import { supabaseConfigured } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ToolbarProps {
  onCompile?: () => void;
  onStop?: () => void;
  onRetryEngine?: () => void;
  engine?: CadEngine | null;
  onOpenProjects?: () => void;
}

export function Toolbar({ onCompile, onStop, onRetryEngine, engine, onOpenProjects }: ToolbarProps) {
  const enginePhase = useAppStore((s) => s.engineStatus.phase);
  const compilationStatus = useAppStore((s) => s.compilationStatus);
  const aiProvider = useAppStore((s) => s.aiProvider);
  const authUser = useAppStore((s) => s.authUser);
  const code = useAppStore((s) => s.code);
  const isDirty = useAppStore((s) => s.isDirty);
  const currentProject = useAppStore((s) => s.currentProject);
  const projectSaving = useAppStore((s) => s.projectSaving);
  const updateProjectTitle = useAppStore((s) => s.updateProjectTitle);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const { save, newProject, canSave } = useProjects();

  const isReady = enginePhase === 'ready';
  const isCompiling = compilationStatus === 'compiling';
  const projectTitle = currentProject?.title ?? 'Untitled';

  // AI provider + model display
  const providerLabel = (() => {
    if (aiProvider.type === 'none') return null;
    const providerType = aiProvider.type as Exclude<AIProviderType, 'none'>;
    const modelId = aiProvider.modelId || DEFAULT_MODEL[providerType];
    const model = AI_MODELS[providerType].find((m) => m.id === modelId);
    return model?.label ?? modelId;
  })();

  // Close menus on outside click
  useEffect(() => {
    if (!fileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [fileMenuOpen]);

  // Focus title input when editing
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  /**
   * If the project is still "Untitled", prompt the user to name it first,
   * then execute the action. Otherwise execute immediately.
   * Uses window.prompt for reliable cross-platform behavior (esp. mobile).
   */
  const requireTitle = useCallback((action: () => void) => {
    if (projectTitle === 'Untitled') {
      const name = window.prompt('Enter a name for your project:');
      if (!name?.trim()) return; // cancelled or empty
      updateProjectTitle(name.trim());
      // Defer so the store update settles before the action runs
      setTimeout(action, 0);
      return;
    }
    action();
  }, [projectTitle, updateProjectTitle]);

  const handleNew = () => {
    setFileMenuOpen(false);
    newProject();
  };

  const handleSave = useCallback(() => {
    setFileMenuOpen(false);
    requireTitle(() => void save());
  }, [save, requireTitle]);

  const handleExport = useCallback((format: ExportFormat) => {
    setFileMenuOpen(false);
    if (!engine || !isReady) return;
    requireTitle(async () => {
      setExporting(format);
      try {
        const result = await engine.exportModel(code, format);
        if (result.error) {
          console.error(`[Toolbar] Export error: ${result.error}`);
          alert(`Export failed: ${result.error}`);
          return;
        }
        const mimeType = format === 'stl'
          ? 'application/vnd.ms-stt'
          : 'application/step';
        const title = useAppStore.getState().currentProject?.title ?? 'model';
        const slug = title.toLowerCase().replace(/\s+/g, '_');
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
        const filename = `${slug}_${timestamp}.${format}`;
        downloadBlob(result.data, filename, mimeType);
      } catch (err) {
        console.error('[Toolbar] Export failed:', err);
        alert(`Export failed: ${err}`);
      } finally {
        setExporting(null);
      }
    });
  }, [engine, isReady, code, requireTitle]);

  const handleExportPython = useCallback(() => {
    setFileMenuOpen(false);
    requireTitle(() => {
      const title = useAppStore.getState().currentProject?.title ?? 'model';
      const slug = title.toLowerCase().replace(/\s+/g, '_');
      const filename = `${slug}.py`;
      downloadText(code, filename, 'text/x-python');
    });
  }, [code, requireTitle]);

  const handleImportPython = useCallback(() => {
    setFileMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      useAppStore.getState().setCode(text);
      if (!currentProject) {
        const name = file.name.replace(/\.py$/i, '').replace(/_/g, ' ');
        useAppStore.getState().updateProjectTitle(name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [currentProject]);

  const handleTitleSubmit = useCallback(() => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== projectTitle) {
      updateProjectTitle(trimmed);
    }
  }, [titleDraft, projectTitle, updateProjectTitle]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch { /* logged in signInWithGoogle */ }
  };

  const menuItemStyle = {
    display: 'block' as const,
    width: '100%',
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  };

  const disabledMenuItemStyle = {
    ...menuItemStyle,
    color: '#666',
    cursor: 'not-allowed' as const,
  };

  const menuSep = {
    height: '1px',
    background: '#333',
    margin: '4px 0',
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '4px',
    background: '#1e1e2e',
    border: '1px solid #444',
    borderRadius: '6px',
    padding: '4px 0',
    minWidth: '200px',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  };

  const hoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.disabled) {
      e.currentTarget.style.background = '#2a2a4e';
    }
  };
  const hoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
  };

  const menuLabelStyle = {
    display: 'block' as const,
    width: '100%',
    padding: '6px 16px',
    color: '#666',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  return (
    <div
      className="toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '6px' : '12px',
        padding: isMobile ? '0 8px' : '0 16px',
        height: isMobile ? '40px' : '44px',
        background: '#16162a',
        borderBottom: '1px solid #2a2a3e',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 600,
          fontSize: isMobile ? '14px' : '15px',
          color: '#e0e0e0',
          marginRight: isMobile ? '0' : '4px',
          flexShrink: 0,
        }}
      >
        <img src="/logo.svg" alt="" width={22} height={22} />
        {!isMobile && 'Maquetto'}
      </span>

      {/* Editable project title */}
      {editingTitle ? (
        <input
          ref={titleInputRef}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={handleTitleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTitleSubmit();
            if (e.key === 'Escape') setEditingTitle(false);
          }}
          style={{
            background: '#2a2a4e',
            border: '1px solid #4a9eff',
            borderRadius: '4px',
            color: '#e0e0e0',
            fontSize: '13px',
            padding: '2px 8px',
            outline: 'none',
            maxWidth: isMobile ? '100px' : '200px',
            minWidth: 0,
          }}
        />
      ) : (
        <button
          onClick={() => {
            setTitleDraft(projectTitle);
            setEditingTitle(true);
          }}
          title="Click to rename"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#999',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            maxWidth: isMobile ? '100px' : '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {projectTitle}
          {isDirty ? ' *' : ''}
        </button>
      )}

      {/* Hamburger menu */}
      <div ref={fileMenuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setFileMenuOpen(!fileMenuOpen)}
          aria-label="Menu"
          style={{
            padding: '4px 6px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            color: '#ccc',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="3" width="14" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="8" width="14" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="13" width="14" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        {fileMenuOpen && (
          <div style={{ ...dropdownStyle, left: 0, right: 'auto' }}>
            <button onClick={handleNew} style={menuItemStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              New
            </button>

            {supabaseConfigured && (
              <>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  style={canSave ? menuItemStyle : disabledMenuItemStyle}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                >
                  {projectSaving ? 'Saving...' : 'Save to Cloud'}
                </button>
                <button
                  onClick={() => { setFileMenuOpen(false); onOpenProjects?.(); }}
                  disabled={!authUser}
                  style={authUser ? menuItemStyle : disabledMenuItemStyle}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                >
                  My Projects...
                </button>
              </>
            )}

            <div style={menuSep} />

            <button onClick={handleImportPython} style={menuItemStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              Import Python...
            </button>
            <button onClick={handleExportPython} style={menuItemStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              Export Python
            </button>

            <div style={menuSep} />

            <button
              onClick={() => handleExport('stl')}
              disabled={!isReady || !!exporting}
              style={isReady && !exporting ? menuItemStyle : disabledMenuItemStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              {exporting === 'stl' ? 'Exporting STL...' : 'Export STL'}
            </button>
            <button
              onClick={() => handleExport('step')}
              disabled={!isReady || !!exporting}
              style={isReady && !exporting ? menuItemStyle : disabledMenuItemStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              {exporting === 'step' ? 'Exporting STEP...' : 'Export STEP'}
            </button>

            {/* On mobile: settings, AI, account all go in the menu */}
            {isMobile && (
              <>
                <div style={menuSep} />
                <span style={menuLabelStyle}>Account & Settings</span>

                {providerLabel && (
                  <button
                    onClick={() => { setFileMenuOpen(false); setSettingsOpen(true); }}
                    style={menuItemStyle}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                  >
                    AI: {providerLabel}
                  </button>
                )}

                <button
                  onClick={() => { setFileMenuOpen(false); setSettingsOpen(true); }}
                  style={menuItemStyle}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                >
                  Settings...
                </button>

                {authUser ? (
                  <button
                    onClick={() => { setFileMenuOpen(false); setSettingsOpen(true); }}
                    style={menuItemStyle}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                  >
                    {authUser.email ?? authUser.name}
                  </button>
                ) : (
                  <button
                    onClick={() => { setFileMenuOpen(false); void handleGoogleSignIn(); }}
                    style={menuItemStyle}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                  >
                    Sign in
                  </button>
                )}

                <div style={menuSep} />
                <span style={{ ...menuLabelStyle, color: '#555', fontSize: '10px', fontFamily: 'monospace' }}>
                  Build {__BUILD_NUMBER__} ({__COMMIT_HASH__})
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".py,.txt"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />

      {isCompiling ? (
        <button
          onClick={onStop}
          title="Stop running code"
          style={{
            padding: '4px 14px',
            borderRadius: '4px',
            border: 'none',
            background: '#f44336',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          ■ Stop
        </button>
      ) : (
        <button
          onClick={onCompile}
          disabled={!isReady}
          title={!isReady ? 'Engine is loading...' : 'Run code (Ctrl+Enter)'}
          style={{
            padding: '4px 14px',
            borderRadius: '4px',
            border: 'none',
            background: isReady ? '#4caf50' : '#333',
            color: isReady ? '#fff' : '#888',
            cursor: isReady ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          ▶ Run
        </button>
      )}

      <EngineStatusBadge onRetry={onRetryEngine} />

      {/* Desktop-only: spacer + AI provider, user, settings, build number */}
      {!isMobile && (
        <>
          <div style={{ flex: 1 }} />

          {providerLabel ? (
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                padding: '3px 10px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: aiProvider.type === 'anthropic' ? '#d97706' : '#4285f4',
                background: 'transparent',
                color: aiProvider.type === 'anthropic' ? '#d97706' : '#4285f4',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {providerLabel}
            </button>
          ) : (
            <span style={{ fontSize: '11px', color: '#666' }}>No AI</span>
          )}

          {authUser ? (
            <button
              onClick={() => setSettingsOpen(true)}
              title={authUser.email ?? 'Account'}
              style={{
                padding: '3px 10px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: 'transparent',
                color: '#ccc',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                maxWidth: '180px',
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: '#4a9eff', color: '#fff', fontSize: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, flexShrink: 0,
              }}>
                {(authUser.name ?? authUser.email ?? '?')[0]!.toUpperCase()}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {authUser.email ?? authUser.name}
              </span>
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              style={{
                padding: '3px 10px',
                borderRadius: '4px',
                border: 'none',
                background: '#4285f4',
                color: '#fff',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Sign in
            </button>
          )}

          <button
            title="Settings"
            onClick={() => setSettingsOpen(true)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #444',
              background: 'transparent',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ⚙
          </button>

          <span
            title={`Build ${__BUILD_NUMBER__} (${__COMMIT_HASH__})`}
            style={{
              fontSize: '10px',
              color: '#555',
              fontFamily: 'monospace',
              userSelect: 'none',
            }}
          >
            b{__BUILD_NUMBER__}
          </span>
        </>
      )}

      <ProviderSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
