import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'calendar' }
  | { name: 'portfolio' }
  | { name: 'tasks' }
  | { name: 'notes' }
  | { name: 'projects' }
  | { name: 'messages' }
  | { name: 'people' }
  | { name: 'settings' }
  | { name: 'atlas'; path: string | null };

/** Routes with no extra path: the main views and the tab frames (D44). */
export const FRAME_ROUTES = ['calendar', 'portfolio', 'tasks', 'notes', 'projects', 'messages', 'people', 'settings'] as const;

function decode(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

export function parseRoute(pathname: string): Route {
  const segs = pathname.split('/').filter((s) => s !== '').map(decode);
  if (segs[0] === 'atlas') return { name: 'atlas', path: segs.length > 1 ? segs.slice(1).join('/') : null };
  if (segs[0] && (FRAME_ROUTES as readonly string[]).includes(segs[0])) return { name: segs[0] } as Route;
  return { name: 'home' };
}

const enc = (s: string) => s.split('/').map(encodeURIComponent).join('/');

export const atlasHref = (path: string, hash = '') => `/atlas/${enc(path)}${hash}`;

export function routeHref(route: Route): string {
  if (route.name === 'atlas') return route.path ? atlasHref(route.path) : '/atlas';
  if (route.name !== 'home') return `/${route.name}`;
  return '/';
}

const EVENT = 'atlas:navigate';

export function navigate(href: string, opts: { replace?: boolean } = {}): void {
  if (opts.replace) window.history.replaceState(null, '', href);
  else window.history.pushState(null, '', href);
  window.dispatchEvent(new Event(EVENT));
}

export function useRoute(): Route {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    window.addEventListener(EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(EVENT, update);
    };
  }, []);
  return parseRoute(path);
}

/** Click handler for same-origin <a> links: plain left clicks navigate in-app, everything else is left to the browser. */
export function linkClick(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; preventDefault(): void }, href: string): void {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(href);
}
