import { useEffect, useMemo, useRef, useState } from 'react';
import type { AtlasNode } from '../api';
import { buildCommands, filterCommands } from '../commands';
import { navigate } from '../router';
import { Icon } from './icons';

/** Top-bar jump box (D39): views and brain files. Ctrl+K / Cmd+K focuses it. */
export function CommandBox({ sections }: { sections: AtlasNode[] | null }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const all = useMemo(() => buildCommands(sections), [sections]);
  const results = useMemo(() => filterCommands(all, query), [all, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === 'KeyK') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setActive(0), [query]);

  const go = (href: string) => {
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
    navigate(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      const hit = results[active];
      if (hit) {
        e.preventDefault();
        go(hit.href);
      }
    } else if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const expanded = open && results.length > 0;
  return (
    <div className="cmd" role="search">
      <span className="cmd-icon"><Icon name="search" size={14} /></span>
      <input
        ref={inputRef}
        className="cmd-input"
        type="text"
        role="combobox"
        aria-label="Jump to a view or file"
        aria-expanded={expanded}
        aria-controls="cmd-list"
        aria-autocomplete="list"
        aria-activedescendant={expanded ? `cmd-opt-${active}` : undefined}
        placeholder="Jump to a view or file…"
        autoComplete="off"
        spellCheck={false}
        value={query}
        data-testid="command-box"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <kbd className="cmd-hint" aria-hidden="true">Ctrl K</kbd>
      {expanded && (
        <ul className="cmd-list" id="cmd-list" role="listbox" aria-label="Results" onMouseDown={(e) => e.preventDefault()}>
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`cmd-opt-${i}`}
              role="option"
              aria-selected={i === active}
              data-testid="command-result"
              data-kind={r.kind}
              className="cmd-opt"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.href)}
            >
              <span className="cmd-label">{r.label}</span>
              <span className="cmd-detail">{r.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
