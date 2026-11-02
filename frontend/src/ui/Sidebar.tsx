// Left panel: Chalk's notebook tree (create, rename, delete) and the read-only brain tree, in Chalk's sidebar style (D23).
// Ported from Chalk's Sidebar.tsx; Atlas never imports Chalk code (D3).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { allPages, type AtlasNode, type Library } from '../api';
import type { NewPlace, NotesActions } from '../notesActions';
import { atlasHref, linkClick, notesHref, type Route } from '../router';
import type { LibraryState } from '../state';
import { notify } from '../toast';
import {
  allNoteBranchKeys, ancestorDirKeys, cleanName, DELETE_CONFIRM_MS, dirKey, MAX_NAME_LENGTH, messageOf, nbKey, pageKey,
  readSidebarPrefs, rekey, rekeyNotebook, revealPageKeys, secKey, visibleNoteKeys, writeSidebarPrefs,
} from '../tree';
import { Icon } from './icons';

function RenameInput(props: { initial: string; onCommit: (value: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(props.initial);
  const finished = useRef(false);
  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);
  const commit = (): void => {
    if (finished.current) return;
    finished.current = true;
    props.onCommit(value);
  };
  const cancel = (): void => {
    if (finished.current) return;
    finished.current = true;
    props.onCancel();
  };
  return (
    <input
      ref={ref}
      type="text"
      className="sb-rename"
      data-testid="rename-input"
      aria-label="Name"
      maxLength={MAX_NAME_LENGTH}
      spellCheck={false}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      }}
      onBlur={commit}
    />
  );
}

type Kind = 'notebook' | 'section' | 'page' | 'dir' | 'file';

interface RowProps {
  rowKey: string;
  kind: Kind;
  level: number;
  label: string;
  /** testid of the row element */
  testId?: string;
  /** testid of the main (focusable) element */
  mainTestId?: string;
  mainData?: Record<string, string>;
  indent?: number;
  current?: boolean;
  dim?: boolean;
  expanded?: boolean;
  href?: string;
  tabbable: boolean;
  /** Notes rows can be added to, renamed and deleted; brain rows cannot. */
  editable: boolean;
  renaming?: boolean;
  menuOpen?: boolean;
  addLabel?: string;
  onActivate: (e: ReactMouseEvent) => void;
  onFocusRow: () => void;
  onAdd?: () => void;
  onMore?: (button: HTMLButtonElement) => void;
  onStartRename?: () => void;
  onCommitRename?: (value: string) => void;
  onCancelRename?: () => void;
  children?: ReactNode;
}

function Row(p: RowProps) {
  const expandable = p.kind === 'notebook' || p.kind === 'section' || p.kind === 'dir';
  const caret = expandable ? (
    <span className="sb-caret" data-open={p.expanded ? 'true' : 'false'} aria-hidden="true">
      <Icon name="chevron" size={14} />
    </span>
  ) : p.kind === 'file' ? (
    <span className="sb-caret" aria-hidden="true" />
  ) : null;
  const lead =
    p.kind === 'notebook' ? (
      <span className="sb-lead" aria-hidden="true"><Icon name="notebook" size={16} /></span>
    ) : p.kind === 'section' ? (
      <span className="sb-bar" aria-hidden="true" />
    ) : p.kind === 'dir' ? (
      <span className="sb-lead" aria-hidden="true"><Icon name="folder" size={16} /></span>
    ) : p.kind === 'file' ? (
      <span className="sb-lead sb-lead-dim" aria-hidden="true"><Icon name="file" size={16} /></span>
    ) : null;
  const mainProps = {
    className: 'sb-main',
    'data-rowmain': '',
    'data-key': p.rowKey,
    'data-testid': p.mainTestId,
    tabIndex: p.tabbable ? 0 : -1,
    title: p.label,
    'aria-current': p.current ? ('page' as const) : undefined,
    style: p.indent !== undefined ? { paddingLeft: p.indent } : undefined,
    onFocus: p.onFocusRow,
    onClick: p.onActivate,
    onDoubleClick: p.editable ? p.onStartRename : undefined,
    ...(p.mainData ?? {}),
  };
  const inner = (
    <>
      {caret}
      {lead}
      <span className="sb-name">{p.label}</span>
    </>
  );
  return (
    <li
      role="treeitem"
      aria-level={p.level}
      aria-expanded={expandable ? !!p.expanded : undefined}
      aria-selected={p.kind === 'page' || p.kind === 'file' ? !!p.current : undefined}
    >
      <div
        className={`sb-row sb-${p.kind}${p.dim ? ' sb-dim' : ''}`}
        data-testid={p.testId}
        data-key={p.rowKey}
        data-current={p.current ? 'true' : undefined}
        data-expanded={expandable ? String(!!p.expanded) : undefined}
        data-menu-open={p.menuOpen ? 'true' : undefined}
      >
        {p.renaming ? (
          <div className="sb-main sb-editing">
            {caret}
            {lead}
            <RenameInput initial={p.label} onCommit={p.onCommitRename!} onCancel={p.onCancelRename!} />
          </div>
        ) : p.href ? (
          <a href={p.href} {...mainProps}>{inner}</a>
        ) : (
          <button type="button" {...mainProps}>{inner}</button>
        )}
        {p.editable && !p.renaming && (
          <span className="sb-actions">
            {p.onAdd && (
              <button
                type="button"
                className="sb-act"
                data-testid={`row-add-${p.rowKey}`}
                aria-label={p.addLabel}
                title={p.addLabel}
                onClick={(e) => {
                  e.stopPropagation();
                  p.onAdd?.();
                }}
              >
                <Icon name="plus" size={15} />
              </button>
            )}
            <button
              type="button"
              className="sb-act"
              data-testid={`row-menu-${p.rowKey}`}
              aria-haspopup="menu"
              aria-expanded={!!p.menuOpen}
              aria-label={`More actions for ${p.label}`}
              title="More"
              onClick={(e) => {
                e.stopPropagation();
                p.onMore?.(e.currentTarget);
              }}
            >
              <Icon name="more" size={15} />
            </button>
          </span>
        )}
      </div>
      {p.children}
    </li>
  );
}

interface MenuState {
  key: string;
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
}

function BrainNode(props: {
  node: AtlasNode;
  depth: number;
  current: string | null;
  expanded: Set<string>;
  tabKey: string | null;
  toggle: (key: string) => void;
  setFocusKey: (key: string) => void;
}) {
  const { node, depth, current } = props;
  const indent = 6 + depth * 14;
  if (node.type === 'dir') {
    const key = dirKey(node.path);
    const open = props.expanded.has(key);
    return (
      <Row
        rowKey={key}
        kind="dir"
        level={depth + 1}
        label={node.name}
        mainTestId="atlas-dir"
        indent={indent}
        expanded={open}
        tabbable={props.tabKey === key}
        editable={false}
        onActivate={() => props.toggle(key)}
        onFocusRow={() => props.setFocusKey(key)}
      >
        {open && (
          <ul role="group" className="sb-group">
            {node.children.length === 0 && <li className="sb-empty" style={{ paddingLeft: indent + 36 }}>empty</li>}
            {node.children.map((c) => (
              <BrainNode key={c.path} {...props} node={c} depth={depth + 1} />
            ))}
          </ul>
        )}
      </Row>
    );
  }
  const href = atlasHref(node.path);
  const key = `file:${node.path}`;
  return (
    <Row
      rowKey={key}
      kind="file"
      level={depth + 1}
      label={node.name}
      mainTestId="atlas-file"
      mainData={{ 'data-path': node.path }}
      indent={indent}
      href={href}
      current={node.path === current}
      dim={node.kind === 'unsupported'}
      tabbable={props.tabKey === key}
      editable={false}
      onActivate={(e) => linkClick(e, href)}
      onFocusRow={() => props.setFocusKey(key)}
    />
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
  actions: NotesActions;
}) {
  const { library, actions } = props;
  const boardId = props.route.name === 'notes' ? props.route.boardId : null;
  const currentFile = props.route.name === 'atlas' ? props.route.path : null;

  const [prefs] = useState(readSidebarPrefs);
  const [notesOpen, setNotesOpen] = useState(prefs.notesOpen);
  const [atlasOpen, setAtlasOpen] = useState(prefs.atlasOpen);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(prefs.expanded ?? []));
  const seeded = useRef(prefs.expanded !== null); // first ever visit: open every notebook and section once
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const confirmRef = useRef<string | null>(null); // mirrors confirmKey so handlers captured earlier see the live value
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const setConfirm = (k: string | null): void => {
    confirmRef.current = k;
    setConfirmKey(k);
  };

  const lib: Library | null = library.status === 'ok' ? library.data : null;

  useEffect(() => {
    writeSidebarPrefs({ expanded: seeded.current ? Array.from(expanded) : null, notesOpen, atlasOpen });
  }, [expanded, notesOpen, atlasOpen]);

  useEffect(() => {
    if (!lib || seeded.current) return;
    seeded.current = true;
    setExpanded((prev) => new Set([...prev, ...allNoteBranchKeys(lib)]));
  }, [lib]);

  const reveal = useCallback((...keys: string[]): void => {
    setExpanded((prev) => {
      if (keys.every((k) => prev.has(k))) return prev;
      return new Set([...prev, ...keys]);
    });
  }, []);

  // Switching to a page reveals it (ancestors expand; the user can still collapse them afterwards).
  const openPage = useMemo(() => (lib && boardId ? allPages(lib).find((p) => p.id === boardId) ?? null : null), [lib, boardId]);
  const openNb = openPage?.notebook;
  const openSec = openPage?.section;
  const openId = openPage?.id;
  useEffect(() => {
    if (openNb !== undefined && openSec !== undefined) reveal(...revealPageKeys(openNb, openSec));
  }, [openId, openNb, openSec, reveal]);
  useEffect(() => {
    if (currentFile) reveal(...ancestorDirKeys(currentFile));
  }, [currentFile, reveal]);

  // Menu: outside click and Escape close it; the delete confirmation never outlives the menu.
  useEffect(() => {
    if (!menu) return undefined;
    const onPointerDown = (e: PointerEvent): void => {
      const t = e.target;
      if (t instanceof Element && (t.closest('.sb-menu') || t.closest('.sb-act'))) return;
      setMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setMenu(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [menu]);
  useEffect(() => {
    if (!menu) {
      setConfirm(null);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    }
  }, [menu]);
  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  const toggle = useCallback((key: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const fail = (what: string) => (err: unknown): void => notify(`${what}: ${messageOf(err)}`, 'error');

  function openMenuFor(rowKey: string, button: HTMLButtonElement, onRename: () => void, onDelete: () => void): void {
    if (menu?.key === rowKey) {
      setMenu(null);
      return;
    }
    const r = button.getBoundingClientRect();
    setMenu({ key: rowKey, x: r.right, y: r.bottom + 4, onRename, onDelete });
  }

  function confirmThen(rowKey: string, run: () => Promise<void>, what: string): void {
    if (confirmRef.current !== rowKey) {
      setConfirm(rowKey);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => {
        if (confirmRef.current === rowKey) setConfirm(null);
      }, DELETE_CONFIRM_MS);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirm(null);
    setMenu(null);
    run().catch(fail(what));
  }

  function applyPlace(place: NewPlace, renameKey: (p: NewPlace) => string): void {
    reveal(...revealPageKeys(place.notebook, place.section));
    setRenaming(renameKey(place));
  }

  // ---- rename commits -----------------------------------------------------
  function commitNotebook(nb: string, value: string): void {
    setRenaming(null);
    const name = cleanName(value, nb);
    if (!name) return;
    actions
      .renameNotebook(nb, name)
      .then((final) => setExpanded((prev) => rekeyNotebook(prev, nb, final)))
      .catch(fail('Could not rename notebook'));
  }
  function commitSection(nb: string, sec: string, value: string): void {
    setRenaming(null);
    const name = cleanName(value, sec);
    if (!name) return;
    actions
      .renameSection(nb, sec, name)
      .then((final) => setExpanded((prev) => rekey(prev, secKey(nb, sec), secKey(nb, final))))
      .catch(fail('Could not rename section'));
  }
  function commitPage(id: string, current: string, value: string): void {
    setRenaming(null);
    const name = cleanName(value, current);
    if (!name) return;
    actions.renamePage(id, name).catch(fail('Could not rename page'));
  }

  // ---- keyboard navigation (one roving tab stop across both trees) ---------
  function onTreeKeyDown(e: ReactKeyboardEvent<HTMLElement>): void {
    const target = e.target;
    if (!(target instanceof HTMLElement) || !target.hasAttribute('data-rowmain')) return;
    const key = target.dataset.key ?? '';
    const rows = Array.from(navRef.current?.querySelectorAll<HTMLElement>('[data-rowmain]') ?? []);
    const i = rows.indexOf(target);
    const go = (n: number): void => {
      e.preventDefault();
      rows[Math.max(0, Math.min(rows.length - 1, n))]?.focus();
    };
    const branch = !key.startsWith('page:') && !key.startsWith('file:');
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(rows.length - 1);
    else if (e.key === 'ArrowRight' && branch && !expanded.has(key)) {
      e.preventDefault();
      toggle(key);
    } else if (e.key === 'ArrowLeft' && branch && expanded.has(key)) {
      e.preventDefault();
      toggle(key);
    } else if (e.key === 'F2' && (key.startsWith('nb:') || key.startsWith('sec:') || key.startsWith('page:'))) {
      e.preventDefault();
      setRenaming(key);
    }
  }

  const visibleKeys = useMemo(() => {
    const keys = lib ? visibleNoteKeys(lib, expanded) : [];
    const walk = (nodes: AtlasNode[]): void => {
      for (const n of nodes) {
        if (n.type === 'dir') {
          keys.push(dirKey(n.path));
          if (expanded.has(dirKey(n.path))) walk(n.children);
        } else keys.push(`file:${n.path}`);
      }
    };
    if (props.tree) walk(props.tree.sections);
    return keys;
  }, [lib, expanded, props.tree]);
  const preferred = focusKey ?? (boardId ? pageKey(boardId) : currentFile ? `file:${currentFile}` : null);
  const tabKey = preferred && visibleKeys.includes(preferred) ? preferred : visibleKeys[0] ?? null;

  function renderNotes(tree: Library) {
    return tree.notebooks.map((nb) => {
      const nk = nbKey(nb.name);
      const nbOpen = expanded.has(nk);
      return (
        <Row
          key={nk}
          rowKey={nk}
          testId={`notebook-${nb.name}`}
          kind="notebook"
          level={1}
          label={nb.name}
          expanded={nbOpen}
          tabbable={tabKey === nk}
          editable
          renaming={renaming === nk}
          menuOpen={menu?.key === nk}
          addLabel="New section"
          onActivate={() => toggle(nk)}
          onFocusRow={() => setFocusKey(nk)}
          onAdd={() => actions.addSection(nb.name).then((pl) => applyPlace(pl, (x) => secKey(x.notebook, x.section))).catch(fail('Could not add section'))}
          onMore={(b) => openMenuFor(nk, b, () => setRenaming(nk), () => confirmThen(nk, () => actions.deleteNotebook(nb.name), 'Could not delete notebook'))}
          onStartRename={() => setRenaming(nk)}
          onCommitRename={(v) => commitNotebook(nb.name, v)}
          onCancelRename={() => setRenaming(null)}
        >
          {nbOpen && (
            <ul role="group" className="sb-group">
              {nb.sections.map((sec) => {
                const sk = secKey(nb.name, sec.name);
                const secOpen = expanded.has(sk);
                return (
                  <Row
                    key={sk}
                    rowKey={sk}
                    testId={`section-${nb.name}/${sec.name}`}
                    kind="section"
                    level={2}
                    label={sec.name}
                    expanded={secOpen}
                    tabbable={tabKey === sk}
                    editable
                    renaming={renaming === sk}
                    menuOpen={menu?.key === sk}
                    addLabel="New page"
                    onActivate={() => toggle(sk)}
                    onFocusRow={() => setFocusKey(sk)}
                    onAdd={() => actions.addPage(nb.name, sec.name).then((pl) => applyPlace(pl, (x) => pageKey(x.id))).catch(fail('Could not add page'))}
                    onMore={(b) => openMenuFor(sk, b, () => setRenaming(sk), () => confirmThen(sk, () => actions.deleteSection(nb.name, sec.name), 'Could not delete section'))}
                    onStartRename={() => setRenaming(sk)}
                    onCommitRename={(v) => commitSection(nb.name, sec.name, v)}
                    onCancelRename={() => setRenaming(null)}
                  >
                    {secOpen && (
                      <ul role="group" className="sb-group">
                        {sec.pages.map((page) => {
                          const pk = pageKey(page.id);
                          const href = notesHref(page.id);
                          return (
                            <Row
                              key={pk}
                              rowKey={pk}
                              testId={`page-${page.id}`}
                              mainTestId="note-page"
                              mainData={{ 'data-id': page.id }}
                              kind="page"
                              level={3}
                              label={page.name}
                              href={href}
                              current={page.id === boardId}
                              tabbable={tabKey === pk}
                              editable
                              renaming={renaming === pk}
                              menuOpen={menu?.key === pk}
                              onActivate={(e) => linkClick(e, href)}
                              onFocusRow={() => setFocusKey(pk)}
                              onMore={(b) => openMenuFor(pk, b, () => setRenaming(pk), () => confirmThen(pk, () => actions.deletePage(page.id), 'Could not delete page'))}
                              onStartRename={() => setRenaming(pk)}
                              onCommitRename={(v) => commitPage(page.id, page.name, v)}
                              onCancelRename={() => setRenaming(null)}
                            />
                          );
                        })}
                      </ul>
                    )}
                  </Row>
                );
              })}
            </ul>
          )}
        </Row>
      );
    });
  }

  return (
    <nav className="sidebar" data-open={props.open} aria-label="Navigation" data-testid="sidebar" ref={navRef} onKeyDown={onTreeKeyDown}>
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
            {library.status === 'loading' && <div className="sb-note">Loading…</div>}
            {library.status === 'error' && (
              <div className="sb-note" data-testid="notes-error">
                <div>Chalk isn't running at {props.chalkUrl ?? 'its configured address'}.</div>
                <button type="button" className="text-btn" onClick={props.onRetryLibrary}>Retry</button>
              </div>
            )}
            {lib && lib.notebooks.length === 0 && <div className="sb-note">No notebooks yet. Create one below.</div>}
            {lib && lib.notebooks.length > 0 && (
              <ul role="tree" aria-label="Notebooks, sections and pages" className="sb-tree">{renderNotes(lib)}</ul>
            )}
            {lib && (
              <div className="sb-footer">
                <button
                  type="button"
                  className="sb-new"
                  data-testid="sidebar-new-notebook"
                  onClick={() => {
                    actions.addNotebook().then((pl) => applyPlace(pl, (x) => nbKey(x.notebook))).catch(fail('Could not create notebook'));
                  }}
                >
                  <Icon name="plus" size={16} />
                  New notebook
                </button>
              </div>
            )}
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
            {props.treeError && <div className="sb-note">Couldn't load the brain: {props.treeError}</div>}
            {!props.tree && !props.treeError && <div className="sb-note">Loading…</div>}
            {props.tree && (
              <ul role="tree" aria-label="Atlas files" className="sb-tree">
                {props.tree.sections.map((s) => (
                  <BrainNode
                    key={s.path}
                    node={s}
                    depth={0}
                    current={currentFile}
                    expanded={expanded}
                    tabKey={tabKey}
                    toggle={toggle}
                    setFocusKey={setFocusKey}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
      {menu && (
        <div className="sb-menu" role="menu" style={{ left: Math.max(8, menu.x - 148), top: menu.y }}>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            data-testid={`row-rename-${menu.key}`}
            onClick={() => {
              const act = menu.onRename;
              setMenu(null);
              act();
            }}
          >
            <Icon name="pencil" size={15} />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className={`menu-item danger${confirmKey === menu.key ? ' confirm' : ''}`}
            data-testid={`row-delete-${menu.key}`}
            onClick={() => menu.onDelete()}
          >
            <Icon name="trash" size={15} />
            {confirmKey === menu.key ? 'Confirm' : 'Delete'}
          </button>
        </div>
      )}
    </nav>
  );
}
