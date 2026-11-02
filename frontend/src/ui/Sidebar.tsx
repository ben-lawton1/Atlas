import { useEffect, useState, type ReactNode } from 'react';
import type { AtlasNode, Library } from '../api';
import { atlasHref, linkClick, notesHref, type Route } from '../router';
import type { LibraryState } from '../state';

function Branch(props: {
  label: string;
  depth: number;
  forceOpen: boolean;
  defaultOpen?: boolean;
  testid?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(props.defaultOpen === true || props.forceOpen);
  useEffect(() => {
    if (props.forceOpen) setOpen(true);
  }, [props.forceOpen]);
  return (
    <div role="group">
      <button
        type="button"
        className="tree-row tree-branch"
        style={{ paddingLeft: 8 + props.depth * 14 }}
        aria-expanded={open}
        data-testid={props.testid}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="tree-label">{props.label}</span>
      </button>
      {open && props.children}
    </div>
  );
}

function AtlasNodeView({ node, depth, current }: { node: AtlasNode; depth: number; current: string | null }) {
  if (node.type === 'dir') {
    const forceOpen = current !== null && current.startsWith(node.path + '/');
    return (
      <Branch label={node.name} depth={depth} forceOpen={forceOpen} testid="atlas-dir">
        {node.children.length === 0 && (
          <div className="tree-empty" style={{ paddingLeft: 24 + depth * 14 }}>empty</div>
        )}
        {node.children.map((c) => (
          <AtlasNodeView key={c.path} node={c} depth={depth + 1} current={current} />
        ))}
      </Branch>
    );
  }
  const href = atlasHref(node.path);
  return (
    <a
      href={href}
      className={'tree-row tree-leaf' + (node.path === current ? ' current' : '') + (node.kind === 'unsupported' ? ' dim' : '')}
      style={{ paddingLeft: 24 + depth * 14 }}
      data-testid="atlas-file"
      data-path={node.path}
      aria-current={node.path === current ? 'page' : undefined}
      onClick={(e) => linkClick(e, href)}
    >
      <span className="tree-label">{node.name}</span>
    </a>
  );
}

function NotesTree({ lib, boardId }: { lib: Library; boardId: string | null }) {
  if (lib.notebooks.length === 0) return <div className="tree-empty">No notebooks yet.</div>;
  return (
    <>
      {lib.notebooks.map((nb) => (
        <Branch
          key={nb.name}
          label={nb.name}
          depth={0}
          defaultOpen
          forceOpen={nb.sections.some((s) => s.pages.some((p) => p.id === boardId))}
        >
          {nb.sections.map((s) => (
            <Branch
              key={s.name}
              label={s.name}
              depth={1}
              defaultOpen
              forceOpen={s.pages.some((p) => p.id === boardId)}
            >
              {s.pages.map((p) => {
                const href = notesHref(p.id);
                return (
                  <a
                    key={p.id}
                    href={href}
                    className={'tree-row tree-leaf' + (p.id === boardId ? ' current' : '')}
                    style={{ paddingLeft: 24 + 2 * 14 }}
                    data-testid="note-page"
                    data-id={p.id}
                    aria-current={p.id === boardId ? 'page' : undefined}
                    onClick={(e) => linkClick(e, href)}
                  >
                    <span className="tree-label">{p.name}</span>
                  </a>
                );
              })}
            </Branch>
          ))}
        </Branch>
      ))}
    </>
  );
}

export function Sidebar(props: {
  route: Route;
  library: LibraryState;
  chalkUrl: string | null;
  tree: { sections: AtlasNode[] } | null;
  treeError: string | null;
  onRetryLibrary: () => void;
  open: boolean;
}) {
  const [notesOpen, setNotesOpen] = useState(true);
  const [atlasOpen, setAtlasOpen] = useState(true);
  const boardId = props.route.name === 'notes' ? props.route.boardId : null;
  const current = props.route.name === 'atlas' ? props.route.path : null;
  const { library } = props;

  return (
    <nav className="sidebar" data-open={props.open} aria-label="Navigation" data-testid="sidebar">
      <section className="group">
        <button
          type="button"
          className="group-head"
          aria-expanded={notesOpen}
          data-testid="group-notes"
          onClick={() => setNotesOpen((o) => !o)}
        >
          <span className="caret" aria-hidden="true">{notesOpen ? '▾' : '▸'}</span> Notes
        </button>
        {notesOpen && (
          <div className="group-body">
            {library.status === 'loading' && <div className="tree-empty">Loading…</div>}
            {library.status === 'error' && (
              <div className="tree-msg" data-testid="notes-error">
                Chalk isn't running at {props.chalkUrl ?? 'its configured address'}.
                <button type="button" className="link-btn" onClick={props.onRetryLibrary}>Retry</button>
              </div>
            )}
            {library.status === 'ok' && <NotesTree lib={library.data} boardId={boardId} />}
          </div>
        )}
      </section>
      <section className="group">
        <button
          type="button"
          className="group-head"
          aria-expanded={atlasOpen}
          data-testid="group-atlas"
          onClick={() => setAtlasOpen((o) => !o)}
        >
          <span className="caret" aria-hidden="true">{atlasOpen ? '▾' : '▸'}</span> Atlas
        </button>
        {atlasOpen && (
          <div className="group-body">
            {props.treeError && <div className="tree-msg">Couldn't load the brain: {props.treeError}</div>}
            {!props.tree && !props.treeError && <div className="tree-empty">Loading…</div>}
            {props.tree?.sections.map((s) => (
              <AtlasNodeView key={s.path} node={s} depth={0} current={current} />
            ))}
          </div>
        )}
      </section>
    </nav>
  );
}
