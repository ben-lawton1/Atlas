import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type AtlasNode, type Config } from '../api';
import { LIBRARY_CHANGED_EVENT } from '../messages';
import { createNotesActions } from '../notesActions';
import { linkClick, navigate, useRoute } from '../router';
import { useLibrary } from '../state';
import { FilePreview } from './FilePreview';
import { Home } from './Home';
import { NotesView } from './NotesView';
import { Sidebar } from './Sidebar';
import { TerminalButton, TerminalPanel } from './terminal/TerminalPanel';
import { Toast } from './Toast';

const NARROW = '(max-width: 760px)';

export function App() {
  const route = useRoute();
  const { library, reload } = useLibrary();
  const [config, setConfig] = useState<Config | null>(null);
  const [tree, setTree] = useState<{ sections: AtlasNode[] } | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(() => !window.matchMedia(NARROW).matches);

  useEffect(() => {
    api.config().then(setConfig, () => setConfig(null));
    api.tree().then(setTree, (e: Error) => setTreeError(e.message));
  }, []);

  // On a phone-sized screen the panel is an overlay: close it after navigating.
  useEffect(() => {
    if (window.matchMedia(NARROW).matches) setNavOpen(false);
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
      <header className="topbar">
        <button
          type="button"
          className="btn icon"
          aria-label="Toggle navigation"
          aria-expanded={navOpen}
          data-testid="nav-toggle"
          onClick={() => setNavOpen((o) => !o)}
        >
          ☰
        </button>
        <a className="brand" href="/" onClick={(e) => linkClick(e, '/')}>Atlas</a>
        <a className="btn" href="/" data-testid="home-button" onClick={(e) => linkClick(e, '/')}>Home</a>
        <span className="spacer" />
        {config && <span className="muted brain-label" title="Brain folder">{config.brainLabel}</span>}
        <TerminalButton />
      </header>
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
        <main className="main">
          {route.name === 'home' && <Home library={library} chalkUrl={chalkUrl} />}
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
      <Toast />
    </div>
  );
}
