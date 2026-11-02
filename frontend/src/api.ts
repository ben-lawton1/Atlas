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
export type Config = { chalkPublicUrl: string; brainLabel: string };

export type NotePage = { id: string; name: string; updatedAt: string; notebook: string; section: string };
export type Library = { notebooks: { name: string; sections: { name: string; pages: NotePage[] }[] }[] };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = ((await res.json()) as { detail?: string }).detail ?? detail;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export const api = {
  config: () => get<Config>('/api/config'),
  tree: () => get<{ sections: AtlasNode[] }>('/api/atlas/tree'),
  file: (path: string) => get<AtlasFile>(`/api/atlas/file?path=${encodeURIComponent(path)}`),
  recent: (limit = 8) => get<RecentFile[]>(`/api/atlas/recent?limit=${limit}`),
  library: () => get<Library>('/api/notes/library'),
};

export function allPages(lib: Library): NotePage[] {
  return lib.notebooks.flatMap((nb) => nb.sections.flatMap((s) => s.pages));
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
