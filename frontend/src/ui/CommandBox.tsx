import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { AtlasNode } from '../api';
import { buildCommands, filterCommands } from '../commands';
import { navigate } from '../router';
import { Command, CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

/** Top-bar search field (D39, D43): a trigger for the command dialog. Ctrl+K / Cmd+K opens it from anywhere. */
export function CommandBox({ sections }: { sections: AtlasNode[] | null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const all = useMemo(() => buildCommands(sections), [sections]);
  const results = useMemo(() => filterCommands(all, query), [all, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === 'KeyK') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) setQuery('');
  };
  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <>
      <button
        type="button"
        data-testid="command-trigger"
        onClick={() => setOpen(true)}
        className="flex min-h-11 min-w-0 flex-1 basis-40 items-center gap-2.5 rounded-2xl border border-card-edge bg-row px-4 text-left text-[0.875rem] text-label-secondary hover:bg-hover"
      >
        <Search aria-hidden="true" size={18} strokeWidth={1.8} className="flex-none" />
        <span className="min-w-0 flex-1 truncate">Search brain, views…</span>
        <kbd className="hidden rounded-lg bg-tile px-2 py-0.5 text-xs font-semibold text-label sm:inline" aria-hidden="true">Ctrl K</kbd>
        <span className="sr-only">Opens search. Shortcut Control K.</span>
      </button>
      <CommandDialog open={open} onOpenChange={onOpenChange} title="Jump to a view or file">
        <Command shouldFilter={false} label="Jump to a view or file" loop>
          <CommandInput data-testid="command-box" placeholder="Jump to a view or file…" value={query} onValueChange={setQuery} autoComplete="off" spellCheck={false} />
          <CommandList data-testid="command-list">
            <CommandEmpty>No matches.</CommandEmpty>
            {results.map((r) => (
              <CommandItem key={r.id} value={r.id} data-testid="command-result" data-kind={r.kind} onSelect={() => go(r.href)}>
                <span className="min-w-0 truncate">{r.label}</span>
                <span className="min-w-0 truncate text-xs text-label-secondary">{r.detail}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
