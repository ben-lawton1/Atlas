import { describe, expect, it } from 'vitest';
import type { AtlasNode } from './api';
import { buildCommands, filterCommands, VIEWS } from './commands';

const file = (name: string, path: string): AtlasNode => ({ name, path, type: 'file', kind: 'markdown' });
const tree: AtlasNode[] = [
  { name: 'entities', path: 'entities', type: 'dir', children: [
    file('about.md', 'entities/personal/about.md'),
    file('home-plan.md', 'entities/home-plan.md'),
    file('Page One.md', 'pipelines/Page One.md'),
    file('plan.md', 'pipelines/plan.md'),
  ] },
];
const all = buildCommands(tree);

describe('buildCommands', () => {
  it('has views and brain files', () => {
    expect(all.filter((c) => c.kind === 'view')).toHaveLength(4);
    expect(all.find((c) => c.kind === 'file')).toMatchObject({ label: 'about.md', detail: 'entities/personal/about.md', href: '/atlas/entities/personal/about.md' });
  });
  it('copes with missing data', () => {
    expect(buildCommands(null)).toEqual(VIEWS);
  });
});

describe('filterCommands', () => {
  it('shows the views for an empty query', () => {
    expect(filterCommands(all, '  ')).toEqual(VIEWS);
  });
  it('matches case-insensitively with every token', () => {
    expect(filterCommands(all, 'page ONE').map((c) => c.id)).toEqual(['file:pipelines/Page One.md']);
    expect(filterCommands(all, 'pipelines one').map((c) => c.id)).toEqual(['file:pipelines/Page One.md']);
    expect(filterCommands(all, 'nothing here')).toEqual([]);
  });
  it('ranks label prefix, then label contains, then detail only; views first on ties', () => {
    // "home": view Home (prefix, view), then home-plan.md (prefix, file)
    expect(filterCommands(all, 'home').map((c) => c.id)).toEqual(['view:home', 'file:entities/home-plan.md']);
    // "pla": plan.md (prefix), home-plan.md (contains)
    expect(filterCommands(all, 'pla').map((c) => c.id)).toEqual(['file:pipelines/plan.md', 'file:entities/home-plan.md']);
    // "person" appears in a path only
    expect(filterCommands(all, 'person').map((c) => c.id)).toEqual(['file:entities/personal/about.md']);
  });
  it('caps the results', () => {
    const many = buildCommands(Array.from({ length: 20 }, (_, i) => file(`f${i}.md`, `pipelines/f${i}.md`)));
    expect(filterCommands(many, 'f')).toHaveLength(8);
  });
});
