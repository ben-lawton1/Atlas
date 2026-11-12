/** Pure sidebar logic: row keys, expand/collapse state and saved preferences. Ported from Chalk's Sidebar (D23). */

export const SIDEBAR_STORAGE_KEY = 'atlas:sidebar';

export const dirKey = (path: string): string => `dir:${path}`;

/** `a/b/c.md` -> `dir:a`, `dir:a/b`. */
export function ancestorDirKeys(path: string): string[] {
  const segs = path.split('/');
  const out: string[] = [];
  for (let i = 1; i < segs.length; i++) out.push(dirKey(segs.slice(0, i).join('/')));
  return out;
}

export interface SidebarPrefs {
  /** Expanded brain directory keys (`dir:...`). */
  expanded: string[];
  atlasOpen: boolean;
}

/** Tolerates JSON saved by older versions: `notesOpen` and note row keys (`nb:`, `sec:`, `page:`) are ignored. */
export function parseSidebarPrefs(raw: string | null): SidebarPrefs {
  const def: SidebarPrefs = { expanded: [], atlasOpen: true };
  if (!raw) return def;
  try {
    const v = JSON.parse(raw) as Partial<SidebarPrefs> | null;
    if (!v || typeof v !== 'object') return def;
    return {
      expanded: Array.isArray(v.expanded) ? v.expanded.filter((k): k is string => typeof k === 'string' && k.startsWith('dir:')) : [],
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
