import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, type AtlasNode, type Config } from '../api';
import { LIBRARY_CHANGED_EVENT } from '../messages';
import { createNotesActions } from '../notesActions';
import { navigate, useRoute, type Route } from '../router';
import { useLibrary } from '../state';
import { CommandBox } from './CommandBox';
import { FilePreview } from './FilePreview';
import { Home } from './Home';
import { Icon } from './icons';
import { NotesView } from './NotesView';
import { Rail } from './Rail';
import { Sidebar } from './Sidebar';
import { TerminalButton, TerminalPanel } from './terminal/TerminalPanel';
import { Toast } from './Toast';
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

const VIEW_TITLES: Record<Route['name'], string> = { home: 'Home', calendar: 'Calendar', portfolio: 'Portfolio', notes: 'Notes', atlas: 'Brain' };

function todayLabel(): string {
  const d = new Date();
  const wd = d.toLocaleDateString('en-US', { weekday: 'short' });
  const rest = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${wd} · ${rest}`;
}

export function App() {
  const route = useRoute();
  const { library, reload } = useLibrary();
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
  }, [route.name, route.name === 'atlas' ? route.path : route.name === 'notes' ? route.boardId : null]);

  const chalkUrl = config?.chalkPublicUrl ?? null;

  // Notes management (D21, D24). The actions read the live route through a ref so they never act on a stale one.
  const boardRef = useRef<string | null>(null);
  boardRef.current = route.name === 'notes' ? route.boardId : null;
  const actions = useMemo(
    () =>
      createNotesActions({
        api,
        refresh: reload,
        announce: () => window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT)),
        navigate: (href) => navigate(href),
        currentBoardId: () => boardRef.current,
      }),
    [reload],
  );

  return (
    <div className="app">
      <Rail route={route} onShowSidebar={() => setNavOpen(true)} />
      <div className="body">
        <Sidebar
          route={route}
          library={library}
          chalkUrl={chalkUrl}
          tree={tree}
          treeError={treeError}
          onRetryLibrary={() => void reload()}
          open={navOpen}
          actions={actions}
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
              <span className="view-date" data-testid="home-date">{todayLabel()}</span>
            </div>
            <CommandBox library={library.status === 'ok' ? library.data : null} sections={tree?.sections ?? null} />
            {config && <span className="muted brain-label" title="Brain folder">{config.brainLabel}</span>}
            <TerminalButton />
          </header>
          <main className="main">
            {route.name === 'home' && <Home library={library} chalkUrl={chalkUrl} />}
            {route.name === 'calendar' && <CalendarView />}
            {route.name === 'portfolio' && <PortfolioView />}
            {route.name === 'atlas' &&
              (route.path ? (
                <FilePreview key={route.path} path={route.path} />
              ) : (
                <div className="pane-scroll"><p className="notice">Pick a file from the Atlas tree.</p></div>
              ))}
            {route.name === 'notes' &&
              (!route.boardId ? (
                <div className="pane-scroll"><p className="notice">Pick a page from the Notes tree.</p></div>
              ) : chalkUrl ? (
                <NotesView
                  boardId={route.boardId}
                  chalkUrl={chalkUrl}
                  library={library.status === 'ok' ? library.data : null}
                  onLibraryChanged={() => void reload()}
                />
              ) : (
                <div className="pane-scroll"><p className="muted">Loading…</p></div>
              ))}
            <TerminalPanel />
          </main>
        </div>
      </div>
      <Toast />
    </div>
  );
}
