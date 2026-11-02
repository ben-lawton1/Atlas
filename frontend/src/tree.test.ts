import { describe, expect, it } from 'vitest';
import type { Library } from './api';
import {
  allNoteBranchKeys, ancestorDirKeys, cleanName, MAX_NAME_LENGTH, nbKey, pageExists, pageKey, parseSidebarPrefs, rekey,
  rekeyNotebook, revealPageKeys, secKey, visibleNoteKeys,
} from './tree';

const page = (id: string, notebook: string, section: string) => ({ id, name: id, updatedAt: '', notebook, section });
const lib: Library = {
  notebooks: [
    { name: 'A', sections: [{ name: 'S1', pages: [page('p1', 'A', 'S1'), page('p2', 'A', 'S1')] }, { name: 'S2', pages: [] }] },
    { name: 'B', sections: [] },
  ],
};

describe('rekey', () => {
  it('renames a notebook key and the section keys below it, leaving others alone', () => {
    const out = rekeyNotebook(new Set([nbKey('A'), secKey('A', 'S1'), nbKey('AB'), secKey('AB', 'S1'), secKey('B', 'S1')]), 'A', 'Z');
    expect([...out].sort()).toEqual([nbKey('AB'), nbKey('Z'), secKey('AB', 'S1'), secKey('B', 'S1'), secKey('Z', 'S1')].sort());
  });
  it('renames one section key', () => {
    const out = rekey(new Set([secKey('A', 'S1'), secKey('A', 'S2')]), secKey('A', 'S1'), secKey('A', 'New'));
    expect([...out].sort()).toEqual([secKey('A', 'New'), secKey('A', 'S2')]);
  });
});

describe('cleanName', () => {
  it('returns null for empty or unchanged names and trims otherwise', () => {
    expect(cleanName('   ', 'x')).toBeNull();
    expect(cleanName(' x ', 'x')).toBeNull();
    expect(cleanName('  y  ', 'x')).toBe('y');
    expect(cleanName('a'.repeat(MAX_NAME_LENGTH + 5), 'x')).toHaveLength(MAX_NAME_LENGTH);
  });
});

describe('tree keys', () => {
  it('lists only visible rows', () => {
    expect(visibleNoteKeys(lib, new Set())).toEqual([nbKey('A'), nbKey('B')]);
    expect(visibleNoteKeys(lib, new Set([nbKey('A')]))).toEqual([nbKey('A'), secKey('A', 'S1'), secKey('A', 'S2'), nbKey('B')]);
    expect(visibleNoteKeys(lib, new Set([nbKey('A'), secKey('A', 'S1')]))).toEqual([
      nbKey('A'), secKey('A', 'S1'), pageKey('p1'), pageKey('p2'), secKey('A', 'S2'), nbKey('B'),
    ]);
  });
  it('knows all branch keys, reveal keys, ancestors and page existence', () => {
    expect(allNoteBranchKeys(lib)).toEqual([nbKey('A'), secKey('A', 'S1'), secKey('A', 'S2'), nbKey('B')]);
    expect(revealPageKeys('A', 'S1')).toEqual([nbKey('A'), secKey('A', 'S1')]);
    expect(ancestorDirKeys('entities/personal/about.md')).toEqual(['dir:entities', 'dir:entities/personal']);
    expect(ancestorDirKeys('README.md')).toEqual([]);
    expect(pageExists(lib, 'p2')).toBe(true);
    expect(pageExists(lib, 'nope')).toBe(false);
  });
});

describe('parseSidebarPrefs', () => {
  it('defaults when missing or corrupt', () => {
    expect(parseSidebarPrefs(null)).toEqual({ expanded: null, notesOpen: true, atlasOpen: true });
    expect(parseSidebarPrefs('{nope')).toEqual({ expanded: null, notesOpen: true, atlasOpen: true });
  });
  it('reads saved values and drops junk', () => {
    expect(parseSidebarPrefs(JSON.stringify({ expanded: ['a', 3], notesOpen: false, atlasOpen: 'x' }))).toEqual({
      expanded: ['a'], notesOpen: false, atlasOpen: true,
    });
  });
});
