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
export type Config = { brainLabel: string; terminalUrl: string };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** FastAPI errors: `detail` is a string, a `{message}` object, or a list of validation errors. */
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

export const api = {
  config: () => get<Config>('/api/config'),
  tree: () => get<{ sections: AtlasNode[] }>('/api/atlas/tree'),
  file: (path: string) => get<AtlasFile>(`/api/atlas/file?path=${encodeURIComponent(path)}`),
  recent: (limit = 8) => get<RecentFile[]>(`/api/atlas/recent?limit=${limit}`),
  calendar: (start: string, days: number) =>
    get<CalendarFeed>(`/api/calendar?${new URLSearchParams({ start, days: String(days) })}`),
  portfolio: (range: Range) => get<PortfolioFeed>(`/api/portfolio?${new URLSearchParams({ range })}`),
  briefing: () => get<BriefingFeed>('/api/briefing'),
};

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
