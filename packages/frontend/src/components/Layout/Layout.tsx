import { Toolbar } from '../Toolbar/Toolbar';
import { EditorPanel } from '../Editor/EditorPanel';
import { ViewportPanel } from '../Viewport/ViewportPanel';
import { ChatPanel } from '../Chat/ChatPanel';
import { useAppStore } from '../../store';
import './Layout.css';

interface LayoutProps {
  onCompile?: () => void;
  onRetryEngine?: () => void;
}

export function Layout({ onCompile, onRetryEngine }: LayoutProps) {
  const isDiffExpanded = useAppStore((s) => s.isDiffExpanded);

  return (
    <div className="layout">
      <Toolbar onCompile={onCompile} onRetryEngine={onRetryEngine} />
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
              <ChatPanel />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
