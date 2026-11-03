import { describe, expect, it } from 'vitest';
import { ancestorDirKeys, dirKey, parseSidebarPrefs } from './tree';

describe('tree keys', () => {
  it('builds dir keys and lists ancestors', () => {
    expect(dirKey('entities/personal')).toBe('dir:entities/personal');
    expect(ancestorDirKeys('entities/personal/about.md')).toEqual(['dir:entities', 'dir:entities/personal']);
    expect(ancestorDirKeys('README.md')).toEqual([]);
  });
});

describe('parseSidebarPrefs', () => {
  it('defaults when missing or corrupt', () => {
    expect(parseSidebarPrefs(null)).toEqual({ expanded: [], atlasOpen: true });
    expect(parseSidebarPrefs('{nope')).toEqual({ expanded: [], atlasOpen: true });
    expect(parseSidebarPrefs('null')).toEqual({ expanded: [], atlasOpen: true });
  });
  it('reads saved values and drops junk', () => {
    expect(parseSidebarPrefs(JSON.stringify({ expanded: ['dir:a', 3], atlasOpen: 'x' }))).toEqual({
      expanded: ['dir:a'], atlasOpen: true,
    });
    expect(parseSidebarPrefs(JSON.stringify({ expanded: ['dir:a'], atlasOpen: false }))).toEqual({
      expanded: ['dir:a'], atlasOpen: false,
    });
  });
  it('tolerates old saved JSON with notesOpen and note keys', () => {
    const old = JSON.stringify({ expanded: ['nb:A', 'sec:A/S1', 'page:p1', 'dir:entities'], notesOpen: false, atlasOpen: false });
    expect(parseSidebarPrefs(old)).toEqual({ expanded: ['dir:entities'], atlasOpen: false });
  });
});
