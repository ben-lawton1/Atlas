import { useCallback, useEffect, useRef, useState } from 'react';
import { allPages, type Library } from '../api';
import { LIBRARY_CHANGED_EVENT, originOf, parseChalkMessage, toChalk, type AtlasMessage } from '../messages';
import { navigate, notesHref } from '../router';
import { toggleTerminal } from './terminal/terminalStore';

export function NotesView({ boardId, chalkUrl, library, onLibraryChanged }: { boardId: string; chalkUrl: string; library: Library | null; onLibraryChanged: () => void }) {
  const origin = originOf(chalkUrl);
  const frame = useRef<HTMLIFrameElement>(null);
  const initial = useRef(boardId); // the iframe src is fixed for this mount; later pages go through postMessage
  const latest = useRef(boardId);
  const ready = useRef(false);
  const reported = useRef(boardId); // the board Chalk is known to show (or was asked to show)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const post = useCallback(
    (msg: AtlasMessage) => {
      if (origin) frame.current?.contentWindow?.postMessage(toChalk(msg), origin);
    },
    [origin],
  );

  useEffect(() => {
    latest.current = boardId;
    if (boardId !== reported.current && ready.current) {
      reported.current = boardId;
      post({ type: 'chalk:open-board', id: boardId });
    }
  }, [boardId, post]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow) return;
      const msg = parseChalkMessage(e.origin, e.data, origin);
      if (!msg) return;
      if (msg.type === 'chalk:ready') {
        ready.current = true;
        if (latest.current !== reported.current) {
          reported.current = latest.current;
          post({ type: 'chalk:open-board', id: latest.current });
        }
      } else if (msg.type === 'chalk:library-changed') {
        onLibraryChanged();
      } else if (msg.type === 'chalk:toggle-terminal') {
        toggleTerminal();
      } else if (msg.type === 'chalk:sidebar') {
        setSidebarOpen(msg.open);
      } else if (msg.type === 'chalk:board') {
        reported.current = msg.id;
        latest.current = msg.id;
        navigate(notesHref(msg.id), { replace: true });
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [origin, post, onLibraryChanged]);

  // Atlas changed the library (D24): tell the embedded Chalk to reload its tree.
  useEffect(() => {
    const onLocal = () => post({ type: 'chalk:library-changed' });
    window.addEventListener(LIBRARY_CHANGED_EVENT, onLocal);
    return () => window.removeEventListener(LIBRARY_CHANGED_EVENT, onLocal);
  }, [post]);

  if (!origin) return <p className="notice" role="alert">Chalk's address isn't a valid URL: {chalkUrl}</p>;

  const src = `${chalkUrl.replace(/\/+$/, '')}/?board=${encodeURIComponent(initial.current)}&embed=1`;
  const page = library ? allPages(library).find((p) => p.id === boardId) : undefined;

  return (
    <div className="notes-view">
      <header className="pane-head">
        <div className="crumbs" data-testid="notes-title">
          {page ? `${page.notebook} / ${page.section} / ${page.name}` : 'Notes'}
        </div>
        <button
          type="button"
          className="btn"
          aria-pressed={sidebarOpen}
          data-testid="notebooks-button"
          onClick={() => post({ type: 'chalk:toggle-sidebar' })}
        >
          Notebooks
        </button>
      </header>
      <iframe ref={frame} className="chalk-frame" title="Chalk" src={src} data-testid="notes-frame" />
    </div>
  );
}
