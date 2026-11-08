// Left panel: the read-only brain tree, in the style of Chalk's sidebar (D23).
// Style copied from Chalk's Sidebar.tsx; Atlas never imports Chalk code (D3).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { AtlasNode } from '../api';
import { atlasHref, linkClick, type Route } from '../router';
import { ancestorDirKeys, dirKey, readSidebarPrefs, writeSidebarPrefs } from '../tree';
import { Icon } from './icons';

interface RowProps {
  rowKey: string;
  kind: 'dir' | 'file';
  level: number;
  label: string;
  /** testid of the main (focusable) element */
  mainTestId?: string;
  mainData?: Record<string, string>;
  indent?: number;
  current?: boolean;
  dim?: boolean;
  expanded?: boolean;
  href?: string;
  tabbable: boolean;
  onActivate: (e: ReactMouseEvent) => void;
  onFocusRow: () => void;
  children?: ReactNode;
}

function Row(p: RowProps) {
  const isDir = p.kind === 'dir';
  const caret = isDir ? (
    <span className="sb-caret" data-open={p.expanded ? 'true' : 'false'} aria-hidden="true">
      <Icon name="chevron" size={14} />
    </span>
  ) : (
    <span className="sb-caret" aria-hidden="true" />
  );
  const lead = isDir ? (
    <span className="sb-lead" aria-hidden="true"><Icon name="folder" size={16} /></span>
  ) : (
    <span className="sb-lead sb-lead-dim" aria-hidden="true"><Icon name="file" size={16} /></span>
  );
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
      aria-expanded={isDir ? !!p.expanded : undefined}
      aria-selected={isDir ? undefined : !!p.current}
    >
      <div
        className={`sb-row sb-${p.kind}${p.dim ? ' sb-dim' : ''}`}
        data-key={p.rowKey}
        data-current={p.current ? 'true' : undefined}
        data-expanded={isDir ? String(!!p.expanded) : undefined}
      >
        {p.href ? (
          <a href={p.href} {...mainProps}>{inner}</a>
        ) : (
          <button type="button" {...mainProps}>{inner}</button>
        )}
      </div>
      {p.children}
    </li>
  );
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
      onActivate={(e) => linkClick(e, href)}
      onFocusRow={() => props.setFocusKey(key)}
    />
  );
}

export function Sidebar(props: {
  route: Route;
  tree: { sections: AtlasNode[] } | null;
  treeError: string | null;
  open: boolean;
}) {
  const currentFile = props.route.name === 'atlas' ? props.route.path : null;

  const [prefs] = useState(readSidebarPrefs);
  const [atlasOpen, setAtlasOpen] = useState(prefs.atlasOpen);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(prefs.expanded));
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    writeSidebarPrefs({ expanded: Array.from(expanded), atlasOpen });
  }, [expanded, atlasOpen]);

  const reveal = useCallback((...keys: string[]): void => {
    setExpanded((prev) => {
      if (keys.every((k) => prev.has(k))) return prev;
      return new Set([...prev, ...keys]);
    });
  }, []);

  // Switching to a file reveals it (ancestors expand; the user can still collapse them afterwards).
  useEffect(() => {
    if (currentFile) reveal(...ancestorDirKeys(currentFile));
  }, [currentFile, reveal]);

  const toggle = useCallback((key: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ---- keyboard navigation (one roving tab stop across the tree) -----------
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
    const branch = !key.startsWith('file:');
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
    }
  }

  const visibleKeys = useMemo(() => {
    const keys: string[] = [];
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
  }, [expanded, props.tree]);
  const preferred = focusKey ?? (currentFile ? `file:${currentFile}` : null);
  const tabKey = preferred && visibleKeys.includes(preferred) ? preferred : visibleKeys[0] ?? null;

  return (
    <nav className="sidebar-col" data-open={props.open} inert={!props.open} aria-label="Navigation" data-testid="sidebar" ref={navRef} onKeyDown={onTreeKeyDown}>
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
    </nav>
  );
}
