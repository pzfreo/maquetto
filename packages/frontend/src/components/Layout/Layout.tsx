import { useState, useRef, useCallback, useEffect } from 'react';
import { Toolbar } from '../Toolbar/Toolbar';
import { EditorPanel } from '../Editor/EditorPanel';
import { ViewportPanel } from '../Viewport/ViewportPanel';
import { ChatPanel } from '../Chat/ChatPanel';
import { ProjectListModal } from '../Projects/ProjectListModal';
import { useAppStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { CadEngine } from '@maquetto/api-types';
import './Layout.css';

interface LayoutProps {
  onCompile?: () => void;
  onStop?: () => void;
  onRetryEngine?: () => void;
  engine?: CadEngine | null;
}

const TABS = ['Code', '3D', 'Chat'] as const;
type TabId = (typeof TABS)[number];

export function Layout({ onCompile, onStop, onRetryEngine, engine }: LayoutProps) {
  const isDiffExpanded = useAppStore((s) => s.isDiffExpanded);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabId>('3D');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);

  // Scroll to the active tab's pane
  const scrollToTab = useCallback((tab: TabId) => {
    const idx = TABS.indexOf(tab);
    const el = scrollRef.current;
    if (!el) return;
    isUserScrolling.current = false;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  }, []);

  // Update active tab from scroll position (after swipe)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const tab = TABS[idx];
    if (tab) setActiveTab(tab);
  }, []);

  // When tab is tapped
  const handleTabClick = useCallback((tab: TabId) => {
    setActiveTab(tab);
    scrollToTab(tab);
  }, [scrollToTab]);

  // On mount (mobile), scroll to the default tab without animation
  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    const idx = TABS.indexOf(activeTab);
    el.scrollLeft = idx * el.clientWidth;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  if (isMobile) {
    return (
      <div className="layout layout-mobile">
        <Toolbar
          onCompile={onCompile}
          onStop={onStop}
          onRetryEngine={onRetryEngine}
          engine={engine ?? null}
          onOpenProjects={() => setProjectsOpen(true)}
        />
        <div
          ref={scrollRef}
          className="mobile-swipe-container"
          onScroll={handleScroll}
        >
          <div className="mobile-pane">
            <EditorPanel onCompile={onCompile} />
          </div>
          <div className="mobile-pane mobile-pane-viewport">
            <ViewportPanel />
          </div>
          <div className="mobile-pane">
            <ChatPanel onCompile={onCompile} engine={engine ?? null} />
          </div>
        </div>
        <nav className="mobile-tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`mobile-tab ${activeTab === tab ? 'mobile-tab-active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        <ProjectListModal isOpen={projectsOpen} onClose={() => setProjectsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="layout">
      <Toolbar
        onCompile={onCompile}
        onStop={onStop}
        onRetryEngine={onRetryEngine}
        engine={engine ?? null}
        onOpenProjects={() => setProjectsOpen(true)}
      />
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
      <ProjectListModal isOpen={projectsOpen} onClose={() => setProjectsOpen(false)} />
    </div>
  );
}
