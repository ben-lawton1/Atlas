/** Pure sidebar logic: row keys, expand/collapse state, name handling. Ported from Chalk's Sidebar (D23). */
import type { Library } from './api';

export const SIDEBAR_STORAGE_KEY = 'atlas:sidebar';
export const DELETE_CONFIRM_MS = 3000;
export const MAX_NAME_LENGTH = 120;

export const nbKey = (nb: string): string => `nb:${nb}`;
export const secKey = (nb: string, sec: string): string => `sec:${nb}/${sec}`;
export const pageKey = (id: string): string => `page:${id}`;
export const dirKey = (path: string): string => `dir:${path}`;

/** Re-keys a renamed notebook: its own row and the section rows below it (their keys embed the notebook name). */
export function rekeyNotebook(keys: Set<string>, from: string, to: string): Set<string> {
  return rekey(rekey(keys, nbKey(from), nbKey(to)), `sec:${from}`, `sec:${to}`);
}

/** Row keys that equal `from` or start with `from/` are re-keyed to `to` (a renamed notebook or section). */
export function rekey(keys: Set<string>, from: string, to: string): Set<string> {
  const out = new Set<string>();
  for (const k of keys) {
    if (k === from) out.add(to);
    else if (k.startsWith(from + '/')) out.add(to + k.slice(from.length));
    else out.add(k);
  }
  return out;
}

/** The trimmed new name, or null when there is nothing to do (empty, or unchanged). */
export function cleanName(value: string, current: string): string | null {
  const name = value.trim();
  return name === '' || name === current ? null : name.slice(0, MAX_NAME_LENGTH);
}

/** Keys of the rows that are on screen, in order, given the expanded set. */
export function visibleNoteKeys(lib: Library, expanded: Set<string>): string[] {
  const keys: string[] = [];
  for (const nb of lib.notebooks) {
    keys.push(nbKey(nb.name));
    if (!expanded.has(nbKey(nb.name))) continue;
    for (const sec of nb.sections) {
      keys.push(secKey(nb.name, sec.name));
      if (!expanded.has(secKey(nb.name, sec.name))) continue;
      for (const p of sec.pages) keys.push(pageKey(p.id));
    }
  }
  return keys;
}

/** Every notebook and section key (used to open everything the first time Atlas is used). */
export function allNoteBranchKeys(lib: Library): string[] {
  return lib.notebooks.flatMap((nb) => [nbKey(nb.name), ...nb.sections.map((s) => secKey(nb.name, s.name))]);
}

/** Keys to expand so that a page is visible. */
export function revealPageKeys(notebook: string, section: string): string[] {
  return section ? [nbKey(notebook), secKey(notebook, section)] : [nbKey(notebook)];
}

/** `a/b/c.md` -> `dir:a`, `dir:a/b`. */
export function ancestorDirKeys(path: string): string[] {
  const segs = path.split('/');
  const out: string[] = [];
  for (let i = 1; i < segs.length; i++) out.push(dirKey(segs.slice(0, i).join('/')));
  return out;
}

export function pageExists(lib: Library, id: string): boolean {
  return lib.notebooks.some((nb) => nb.sections.some((s) => s.pages.some((p) => p.id === id)));
}

export interface SidebarPrefs {
  /** null: never saved, so the notes tree starts fully expanded. */
  expanded: string[] | null;
  notesOpen: boolean;
  atlasOpen: boolean;
}

export function parseSidebarPrefs(raw: string | null): SidebarPrefs {
  const def: SidebarPrefs = { expanded: null, notesOpen: true, atlasOpen: true };
  if (!raw) return def;
  try {
    const v = JSON.parse(raw) as Partial<SidebarPrefs> | null;
    if (!v || typeof v !== 'object') return def;
    return {
      expanded: Array.isArray(v.expanded) ? v.expanded.filter((k): k is string => typeof k === 'string') : null,
      notesOpen: typeof v.notesOpen === 'boolean' ? v.notesOpen : true,
      atlasOpen: typeof v.atlasOpen === 'boolean' ? v.atlasOpen : true,
    };
  } catch {
    return def;
  }
}

export function readSidebarPrefs(): SidebarPrefs {
  try {
    return parseSidebarPrefs(window.localStorage.getItem(SIDEBAR_STORAGE_KEY));
  } catch {
    return parseSidebarPrefs(null);
  }
}

export function writeSidebarPrefs(prefs: SidebarPrefs): void {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable: the tree just forgets its state */
  }
}

export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
