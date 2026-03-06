import { Toolbar } from '../Toolbar/Toolbar';
import { EditorPanel } from '../Editor/EditorPanel';
import { ViewportPanel } from '../Viewport/ViewportPanel';
import { ChatPanel } from '../Chat/ChatPanel';
import './Layout.css';

interface LayoutProps {
  onCompile?: () => void;
  onRetryEngine?: () => void;
}

export function Layout({ onCompile, onRetryEngine }: LayoutProps) {
  return (
    <div className="layout">
      <Toolbar onCompile={onCompile} onRetryEngine={onRetryEngine} />
      <div className="layout-panels">
        <div className="layout-panel layout-editor">
          <EditorPanel onCompile={onCompile} />
        </div>
        <div className="layout-panel layout-viewport">
          <ViewportPanel />
        </div>
        <div className="layout-panel layout-chat">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
