/** Resolution of links found inside brain markdown files. */

export const SECTIONS = ['entities', 'connectors', 'modules', 'pipelines', 'state', 'intake'] as const;

export type LinkTarget =
  | { kind: 'internal'; path: string; hash: string }
  | { kind: 'external' }
  | { kind: 'anchor' }
  | { kind: 'none' };

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function resolveBrainLink(fromPath: string, href: string): LinkTarget {
  const h = href.trim();
  if (h === '') return { kind: 'none' };
  if (h.startsWith('#')) return { kind: 'anchor' };
  if (SCHEME.test(h) || h.startsWith('//')) return { kind: 'external' };
  if (h.startsWith('/') || h.includes('\\')) return { kind: 'none' };

  const hashAt = h.indexOf('#');
  const hash = hashAt >= 0 ? h.slice(hashAt) : '';
  const noHash = hashAt >= 0 ? h.slice(0, hashAt) : h;
  const q = noHash.indexOf('?');
  const rel = q >= 0 ? noHash.slice(0, q) : noHash;
  if (rel === '') return { kind: 'none' };

  let decoded = rel;
  try {
    decoded = decodeURIComponent(rel);
  } catch {
    /* keep raw */
  }
  const out = fromPath.split('/').slice(0, -1);
  for (const seg of decoded.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (out.length === 0) return { kind: 'none' };
      out.pop();
    } else out.push(seg);
  }
  if (out.length < 2 || !(SECTIONS as readonly string[]).includes(out[0])) return { kind: 'none' };
  return { kind: 'internal', path: out.join('/'), hash };
}
