import { describe, expect, it } from 'vitest';
import type { AtlasNode, Library } from './api';
import { buildCommands, filterCommands, VIEWS } from './commands';

const library: Library = {
  notebooks: [{ name: 'Work', sections: [{ name: 'Notes', pages: [
    { id: 'p1', name: 'Page One', updatedAt: '', notebook: 'Work', section: 'Notes' },
    { id: 'p2', name: 'Plan', updatedAt: '', notebook: 'Work', section: 'Notes' },
  ] }] }],
};
const tree: AtlasNode[] = [
  { name: 'entities', path: 'entities', type: 'dir', children: [
    { name: 'about.md', path: 'entities/personal/about.md', type: 'file', kind: 'markdown' },
    { name: 'home-plan.md', path: 'entities/home-plan.md', type: 'file', kind: 'markdown' },
  ] },
];
const all = buildCommands(library, tree);

describe('buildCommands', () => {
  it('has views, note pages and brain files', () => {
    expect(all.filter((c) => c.kind === 'view')).toHaveLength(5);
    expect(all.find((c) => c.id === 'note:p1')).toMatchObject({ label: 'Page One', detail: 'Work / Notes', href: '/notes/p1' });
    expect(all.find((c) => c.kind === 'file')).toMatchObject({ label: 'about.md', detail: 'entities/personal/about.md', href: '/atlas/entities/personal/about.md' });
  });
  it('copes with missing data', () => {
    expect(buildCommands(null, null)).toEqual(VIEWS);
  });
});

describe('filterCommands', () => {
  it('shows the views for an empty query', () => {
    expect(filterCommands(all, '  ')).toEqual(VIEWS);
  });
  it('matches case-insensitively with every token', () => {
    expect(filterCommands(all, 'page ONE').map((c) => c.id)).toEqual(['note:p1']);
    expect(filterCommands(all, 'work one').map((c) => c.id)).toEqual(['note:p1']);
    expect(filterCommands(all, 'nothing here')).toEqual([]);
  });
  it('ranks label prefix, then label contains, then detail only; views first on ties', () => {
    // "home": view Home (prefix, view), home-plan.md (prefix, file), then "entities/home-plan.md" is the same entry
    expect(filterCommands(all, 'home').map((c) => c.id)).toEqual(['view:home', 'file:entities/home-plan.md']);
    // "pla": Plan (prefix), home-plan.md (contains); "personal" appears in a path only
    expect(filterCommands(all, 'pla').map((c) => c.id)).toEqual(['note:p2', 'file:entities/home-plan.md']);
    expect(filterCommands(all, 'person').map((c) => c.id)).toEqual(['file:entities/personal/about.md']);
  });
  it('caps the results', () => {
    const many = buildCommands(null, Array.from({ length: 20 }, (_, i) => ({ name: `f${i}.md`, path: `pipelines/f${i}.md`, type: 'file' as const, kind: 'markdown' as const })));
    expect(filterCommands(many, 'f')).toHaveLength(8);
  });
});
