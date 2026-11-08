import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type AtlasNode, type Config } from '../api';
import { useRoute, type Route } from '../router';
import { CommandBox } from './CommandBox';
import { FilePreview } from './FilePreview';
import { Home } from './Home';
import { Icon } from './icons';
import { Rail } from './Rail';
import { Sidebar } from './Sidebar';
import { TerminalButton, TerminalPanel } from './terminal/TerminalPanel';
import { CalendarView } from './dashboards/CalendarView';
import { PortfolioView } from './dashboards/PortfolioView';

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

const VIEW_TITLES: Record<Route['name'], string> = { home: 'Home', calendar: 'Calendar', portfolio: 'Portfolio', atlas: 'Brain' };


export function App() {
  const route = useRoute();
  const [config, setConfig] = useState<Config | null>(null);
  const [tree, setTree] = useState<{ sections: AtlasNode[] } | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [navOpen, setNavOpenState] = useState(readSidebarOpen);
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

  // On a phone-sized screen the panel is an overlay: close it after navigating.
  useEffect(() => {
    if (isNarrow()) setNavOpenState(false);
  }, [route.name, route.name === 'atlas' ? route.path : null]);

  return (
    <div className="app">
      <Rail route={route} onShowSidebar={() => setNavOpen(true)} />
      <div className="body">
        <Sidebar
          route={route}
          tree={tree}
          treeError={treeError}
          open={navOpen}
        />
        {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
        <div className="column">
          <header className="topbar">
            <button
              type="button"
              className="btn icon"
              aria-label="Toggle sidebar"
              aria-expanded={navOpen}
              title="Sidebar — Ctrl+\"
              data-testid="nav-toggle"
              onClick={() => setNavOpen(!navOpen)}
            >
              <Icon name="sidebar" size={18} />
            </button>
            <div className="topbar-title">
              <h1 className="view-title" data-testid="view-title">{VIEW_TITLES[route.name]}</h1>
            </div>
            <CommandBox sections={tree?.sections ?? null} />
            {config && <span className="brain-label" title="Brain folder">{config.brainLabel}</span>}
            <TerminalButton />
          </header>
          <main className="main">
            {route.name === 'home' && <Home />}
            {route.name === 'calendar' && <CalendarView />}
            {route.name === 'portfolio' && <PortfolioView />}
            {route.name === 'atlas' &&
              (route.path ? (
                <FilePreview key={route.path} path={route.path} />
              ) : (
                <div className="pane-scroll"><p className="notice">Choose a file in the sidebar.</p></div>
              ))}
            <TerminalPanel />
          </main>
        </div>
      </div>
    </div>
  );
}
