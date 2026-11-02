import { useEffect, useState } from 'react';
import { api, type AtlasNode, type Config } from '../api';
import { linkClick, useRoute } from '../router';
import { useLibrary } from '../state';
import { FilePreview } from './FilePreview';
import { Home } from './Home';
import { NotesView } from './NotesView';
import { Sidebar } from './Sidebar';

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
      </header>
      <div className="body">
        <Sidebar
          route={route}
          library={library}
          chalkUrl={chalkUrl}
          tree={tree}
          treeError={treeError}
          onRetryLibrary={reload}
          open={navOpen}
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
              />
            ) : (
              <div className="pane-scroll"><p className="muted">Loading…</p></div>
            ))}
        </main>
      </div>
    </div>
  );
}
