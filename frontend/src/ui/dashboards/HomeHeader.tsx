import { api } from '../../api';
import { parseISODate } from '../../calendar';
import type { CalendarItem } from '../../calendar';
import { greeting } from '../../home';
import { useAsync } from '../../state';

function upNextMeta(it: CalendarItem): string {
  const day = parseISODate(it.date).toLocaleDateString('en-US', { weekday: 'short' });
  return [day, it.durationMin ? `${it.durationMin} min` : '', it.location ?? ''].filter(Boolean).join(' · ');
}

function generatedTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function todayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Home's header (D43): the greeting, the date and the briefing sentence; up next and suggestions as compact rows when connected. */
export function HomeHeader() {
  const feed = useAsync(() => api.briefing(), 'briefing');
  const now = new Date();
  const data = feed.status === 'ok' ? feed.data : null;
  const connected = !!data?.connected;
  const updated = connected ? generatedTime(data!.generatedAt) : '';
  let tail: string | null = null;
  if (feed.status === 'ok') tail = connected ? data!.summary ?? 'No summary today.' : 'No briefing yet.';
  return (
    <header className="flex flex-col gap-4" data-testid="briefing-panel" aria-label="Daily briefing">
      <div className="flex flex-col gap-1.5">
        <h1 className="view-h1" data-testid="view-title">{greeting(now.getHours())}, Ben</h1>
        <p className="m-0 max-w-[70ch] text-[0.875rem] text-label-secondary" data-testid="home-date">
          {todayLabel(now)}
          {tail && <> · {tail}</>}
          {updated && <> · Updated {updated}</>}
        </p>
      </div>
      {feed.status === 'loading' && <p className="sr-only" role="status">Loading briefing…</p>}
      {feed.status === 'error' && <p className="m-0 text-[0.8125rem] text-negative" role="alert">Couldn't load the briefing: {feed.message}</p>}
      {connected && (data!.upNext.length > 0 || data!.suggestions.length > 0) && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
          {data!.upNext.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-label-secondary">Up next</h2>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {data!.upNext.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 rounded-row bg-row px-3 py-2.5">
                    <span className="min-w-12 text-xs font-semibold tabular-nums text-label-secondary">{it.time ?? 'All day'}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[0.8125rem] font-semibold">{it.title}</span>
                      <span className="text-xs text-label-secondary">{upNextMeta(it)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data!.suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-label-secondary">Suggestions</h2>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {data!.suggestions.map((s) => (
                  <li key={s.id} className="rounded-row bg-row px-3 py-2.5 text-[0.8125rem]">{s.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
