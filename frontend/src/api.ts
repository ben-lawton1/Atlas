import type { BriefingFeed } from './briefing';
import type { CalendarFeed } from './calendar';
import type { PortfolioFeed, Range } from './portfolio';

export type AtlasNode =
  | { name: string; path: string; type: 'dir'; children: AtlasNode[] }
  | { name: string; path: string; type: 'file'; kind: 'markdown' | 'text' | 'unsupported' };

export type AtlasFile = {
  path: string;
  kind: 'markdown' | 'text' | 'unsupported';
  content?: string;
  size: number;
  modifiedAt: string;
};

export type RecentFile = { path: string; name: string; modifiedAt: string; size: number };
export type Config = { chalkPublicUrl: string; brainLabel: string; terminalUrl: string };
export type NewBoard = { id: string; name: string; notebook: string; section: string };

export type NotePage = { id: string; name: string; updatedAt: string; notebook: string; section: string };
export type Library = { notebooks: { name: string; sections: { name: string; pages: NotePage[] }[] }[] };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** FastAPI/Chalk errors: `detail` is a string, a `{message}` object, or a list of validation errors. */
export function detailMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === 'string') return first.msg;
  }
  if (detail && typeof detail === 'object' && typeof (detail as { message?: unknown }).message === 'string') {
    return (detail as { message: string }).message;
  }
  return fallback;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = detailMessage(((await res.json()) as { detail?: unknown }).detail, detail);
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const get = <T>(url: string) => request<T>('GET', url);
const enc = encodeURIComponent;

export const api = {
  config: () => get<Config>('/api/config'),
  tree: () => get<{ sections: AtlasNode[] }>('/api/atlas/tree'),
  file: (path: string) => get<AtlasFile>(`/api/atlas/file?path=${encodeURIComponent(path)}`),
  recent: (limit = 8) => get<RecentFile[]>(`/api/atlas/recent?limit=${limit}`),
  library: () => get<Library>('/api/notes/library'),
  calendar: (start: string, days: number) =>
    get<CalendarFeed>(`/api/calendar?${new URLSearchParams({ start, days: String(days) })}`),
  portfolio: (range: Range) => get<PortfolioFeed>(`/api/portfolio?${new URLSearchParams({ range })}`),
  briefing: () => get<BriefingFeed>('/api/briefing'),
  // Notes writes (D21): proxied to Chalk by the Atlas backend. Chalk may adjust names, so callers use the returned name.
  createNotebook: (name: string) => request<{ name: string }>('POST', '/api/notes/notebooks', { name }),
  renameNotebook: (nb: string, name: string) => request<{ name: string }>('PUT', `/api/notes/notebooks/${enc(nb)}`, { name }),
  deleteNotebook: (nb: string) => request<void>('DELETE', `/api/notes/notebooks/${enc(nb)}`),
  createSection: (nb: string, name: string) =>
    request<{ name: string }>('POST', `/api/notes/notebooks/${enc(nb)}/sections`, { name }),
  renameSection: (nb: string, sec: string, name: string) =>
    request<{ name: string }>('PUT', `/api/notes/notebooks/${enc(nb)}/sections/${enc(sec)}`, { name }),
  deleteSection: (nb: string, sec: string) =>
    request<void>('DELETE', `/api/notes/notebooks/${enc(nb)}/sections/${enc(sec)}`),
  createBoard: (notebook: string, section: string) =>
    request<NewBoard>('POST', '/api/notes/boards', { notebook, section }),
  renameBoard: (id: string, name: string) => request<unknown>('PUT', `/api/notes/boards/${enc(id)}`, { name }),
  deleteBoard: (id: string) => request<void>('DELETE', `/api/notes/boards/${enc(id)}`),
};

export function allPages(lib: Library): NotePage[] {
  return lib.notebooks.flatMap((nb) => nb.sections.flatMap((s) => s.pages));
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
