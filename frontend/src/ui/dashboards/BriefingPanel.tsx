import { api } from '../../api';
import { parseISODate } from '../../calendar';
import type { CalendarItem } from '../../calendar';
import { useAsync } from '../../state';
import './dashboards.css';

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

/** Home's lead: the date, then the briefing Atlas wrote ("Atlas speaks first"). */
export function TodayHeader() {
  const feed = useAsync(() => api.briefing(), 'briefing');
  const data = feed.status === 'ok' ? feed.data : null;
  const connected = !!data?.connected;
  const updated = connected ? generatedTime(data!.generatedAt) : '';
  return (
    <header className="today" data-testid="briefing-panel" aria-label="Daily briefing">
      <p className="today-eyebrow">
        <span data-testid="home-date">{todayLabel(new Date())}</span>
        {updated && <span> · Updated {updated}</span>}
      </p>
      {feed.status === 'loading' && (
        <>
          <p className="db-sr" role="status">Loading briefing…</p>
          <div className="db-skel-stack" aria-hidden="true">
            <span className="db-skel" style={{ width: 'min(60ch, 90%)', height: '1.5rem' }} />
            <span className="db-skel" style={{ width: 'min(40ch, 60%)', height: '1.5rem' }} />
          </div>
        </>
      )}
      {feed.status === 'error' && (
        <p className="db-error" role="alert">Couldn't load the briefing: {feed.message}</p>
      )}
      {feed.status === 'ok' && !connected && (
        <>
          <p className="today-lead muted-lead">No briefing yet.</p>
          <p className="today-note">Atlas writes one each morning once calendar and mail are connected.</p>
        </>
      )}
      {connected && (
        <>
          {data!.summary && <p className="today-lead">{data!.summary}</p>}
          {(data!.upNext.length > 0 || data!.suggestions.length > 0) && (
            <div className="today-cols">
              {data!.upNext.length > 0 && (
                <div>
                  <h3 className="db-label">Up next</h3>
                  <ul className="today-list">
                    {data!.upNext.map((it) => (
                      <li key={it.id} className="today-row">
                        <span className="today-time">{it.time ?? '—'}</span>
                        <span className="today-text">
                          <span className="today-title">{it.title}</span>
                          <span className="today-meta">{upNextMeta(it)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data!.suggestions.length > 0 && (
                <div>
                  <h3 className="db-label">Suggestions</h3>
                  <ul className="today-list">
                    {data!.suggestions.map((s) => (
                      <li key={s.id} className="today-row">
                        <span className="today-title">{s.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </header>
  );
}
