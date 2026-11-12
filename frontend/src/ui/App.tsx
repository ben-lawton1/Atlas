import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { api, type AtlasNode, type Config } from '../api';
import { useRoute } from '../router';
import { GlassPanel } from '@/components/ui/glass';
import { FilePreview } from './FilePreview';
import { Home } from './Home';
import { Nav } from './Nav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { TerminalPanel } from './terminal/TerminalPanel';
import { CalendarView } from './dashboards/CalendarView';
import { PortfolioView } from './dashboards/PortfolioView';
import { SettingsView } from './frames/SettingsView';
import { TabFrame, hasFrame } from './frames/TabFrame';

const NARROW = '(max-width: 760px)';
const SIDEBAR_OPEN_KEY = 'atlas:sidebar-open';

const isNarrow = () => window.matchMedia(NARROW).matches;

function readSidebarOpen(): boolean {
  if (isNarrow()) return false;
  try {
    return window.localStorage.getItem(SIDEBAR_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeSidebarOpen(open: boolean): void {
  if (isNarrow()) return; // phone width: always starts closed, never persisted
  try {
    window.localStorage.setItem(SIDEBAR_OPEN_KEY, String(open));
  } catch {
    /* storage unavailable */
  }
}

export function App() {
  const route = useRoute();
  const [config, setConfig] = useState<Config | null>(null);
  const [tree, setTree] = useState<{ sections: AtlasNode[] } | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [navOpen, setNavOpenState] = useState(readSidebarOpen);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navOpenRef = useRef(navOpen);
  navOpenRef.current = navOpen;
  const setNavOpen = useCallback((open: boolean) => {
    setNavOpenState(open);
    writeSidebarOpen(open);
  }, []);

  useEffect(() => {
    api.config().then(setConfig, () => setConfig(null));
    api.tree().then(setTree, (e: Error) => setTreeError(e.message));
  }, []);

  // Ctrl+\ toggles the sidebar from anywhere (the terminal lets this key through).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && !e.metaKey && e.code === 'Backslash' && !e.repeat) {
        e.preventDefault();
        setNavOpen(!navOpenRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setNavOpen]);

  // Escape closes the phone drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // On a phone-sized screen the sidebar and nav are overlays: close them after navigating.
  useEffect(() => {
    if (isNarrow()) setNavOpenState(false);
    setDrawerOpen(false);
  }, [route.name, route.name === 'atlas' ? route.path : null]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="atlas-backdrop" aria-hidden="true" />
      <div className="app">
        <Nav route={route} open={drawerOpen} onNavigate={() => setDrawerOpen(false)} onShowSidebar={() => setNavOpen(true)} />
        {drawerOpen && <div className="nav-scrim" onClick={() => setDrawerOpen(false)} />}
        <div className="flex h-full min-w-0 flex-1 flex-col gap-5">
          <TopBar
            config={config}
            sections={tree?.sections ?? null}
            sidebarOpen={navOpen}
            onToggleSidebar={() => setNavOpen(!navOpen)}
            onOpenDrawer={() => setDrawerOpen(true)}
          />
          <GlassPanel as="main" variant="main" className="main flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative flex min-h-0 flex-1">
              <Sidebar route={route} tree={tree} treeError={treeError} open={navOpen} />
              {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
              <div className="pane-scroll">
                <motion.div
                  key={route.name}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex min-w-0 flex-col"
                >
                  {route.name === 'home' && <Home />}
                  {route.name === 'calendar' && <CalendarView />}
                  {route.name === 'portfolio' && <PortfolioView />}
                  {route.name === 'settings' && <SettingsView />}
                  {hasFrame(route.name) && <TabFrame name={route.name} />}
                  {route.name === 'atlas' && (
                    <>
                      <h1 className="view-h1 mb-4" data-testid="view-title">Brain</h1>
                      {route.path ? <FilePreview key={route.path} path={route.path} /> : <p className="notice">Choose a file in the sidebar.</p>}
                    </>
                  )}
                </motion.div>
              </div>
            </div>
            <TerminalPanel />
          </GlassPanel>
        </div>
      </div>
    </MotionConfig>
  );
}
