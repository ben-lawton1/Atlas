// Command box entries and matching (D39). Pure: the UI passes in the brain tree.
import type { AtlasNode } from './api';
import { atlasHref } from './router';

export type Command = { id: string; kind: 'view' | 'file'; label: string; detail: string; href: string };

export const MAX_RESULTS = 8;

export const VIEWS: Command[] = [
  { id: 'view:home', kind: 'view', label: 'Home', detail: 'View', href: '/' },
  { id: 'view:calendar', kind: 'view', label: 'Calendar', detail: 'View', href: '/calendar' },
  { id: 'view:portfolio', kind: 'view', label: 'Portfolio', detail: 'View', href: '/portfolio' },
  { id: 'view:brain', kind: 'view', label: 'Brain', detail: 'View', href: '/atlas' },
];

export function buildCommands(sections: AtlasNode[] | null): Command[] {
  const out = [...VIEWS];
  const walk = (nodes: AtlasNode[]) => {
    for (const n of nodes) {
      if (n.type === 'dir') walk(n.children);
      else out.push({ id: `file:${n.path}`, kind: 'file', label: n.name, detail: n.path, href: atlasHref(n.path) });
    }
  };
  walk(sections ?? []);
  return out;
}

/** Every whitespace-separated token must appear in label or detail. Rank: label prefix, label contains, detail only; views first on ties. */
export function filterCommands(all: Command[], query: string, max = MAX_RESULTS): Command[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return all.filter((c) => c.kind === 'view').slice(0, max);
  const scored: { c: Command; rank: number; i: number }[] = [];
  all.forEach((c, i) => {
    const label = c.label.toLowerCase();
    const detail = c.detail.toLowerCase();
    if (!tokens.every((t) => label.includes(t) || detail.includes(t))) return;
    const rank = tokens.every((t) => label.startsWith(t)) || label.startsWith(tokens.join(' '))
      ? 0
      : tokens.every((t) => label.includes(t)) ? 1 : 2;
    scored.push({ c, rank, i });
  });
  scored.sort((a, b) => a.rank - b.rank || Number(b.c.kind === 'view') - Number(a.c.kind === 'view') || a.i - b.i);
  return scored.slice(0, max).map((s) => s.c);
}
