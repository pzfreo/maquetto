import { Toolbar } from '../Toolbar/Toolbar';
import { EditorPanel } from '../Editor/EditorPanel';
import { ViewportPanel } from '../Viewport/ViewportPanel';
import { ChatPanel } from '../Chat/ChatPanel';
import { useAppStore } from '../../store';
import type { CadEngine } from '@maquetto/api-types';
import './Layout.css';

interface LayoutProps {
  onCompile?: () => void;
  onStop?: () => void;
  onRetryEngine?: () => void;
  engine?: CadEngine | null;
}

export function Layout({ onCompile, onStop, onRetryEngine, engine }: LayoutProps) {
  const isDiffExpanded = useAppStore((s) => s.isDiffExpanded);

  return (
    <div className="layout">
      <Toolbar onCompile={onCompile} onStop={onStop} onRetryEngine={onRetryEngine} />
      <div className={`layout-panels ${isDiffExpanded ? 'layout-panels-expanded' : ''}`}>
        <div className="layout-panel layout-editor">
          <EditorPanel onCompile={onCompile} />
        </div>
        {!isDiffExpanded && (
          <>
            <div className="layout-panel layout-viewport">
              <ViewportPanel />
            </div>
            <div className="layout-panel layout-chat">
              <ChatPanel onCompile={onCompile} engine={engine ?? null} />
            </div>
          </>
        )}
      </div>
      <footer className="layout-footer">
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a>
        <span className="layout-footer-sep">·</span>
        <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms</a>
      </footer>
    </div>
  );
}
