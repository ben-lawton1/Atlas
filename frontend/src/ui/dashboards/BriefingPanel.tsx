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

export function BriefingPanel() {
  const feed = useAsync(() => api.briefing(), 'briefing');
  const data = feed.status === 'ok' ? feed.data : null;
  const connected = !!data?.connected;
  return (
    <section className="db-card" data-testid="briefing-panel" aria-label="Daily briefing">
      <div className="db-head">
        <div className="db-title">
          <h2>Daily briefing</h2>
        </div>
        {connected && data!.generatedAt && <span className="db-sub">{generatedTime(data!.generatedAt)}</span>}
      </div>
      {feed.status === 'loading' && <p className="db-notice" role="status">Loading briefing…</p>}
      {feed.status === 'error' && (
        <p className="db-notice error" role="alert">Could not load the briefing: {feed.message}</p>
      )}
      {feed.status === 'ok' && !connected && (
        <p className="db-notice">No briefing yet. Atlas will write one each morning once calendar and mail are connected.</p>
      )}
      {connected && (
        <>
          {data!.summary && <p className="db-brief-summary">{data!.summary}</p>}
          {data!.upNext.length > 0 && (
            <div className="db-list-wrap">
              <h3 className="db-section-label">Up next</h3>
              <ul className="db-list">
                {data!.upNext.map((it) => (
                  <li key={it.id} className="db-row">
                    <span className="db-row-time">{it.time ?? '—'}</span>
                    <div className="db-row-text">
                      <span className="db-row-title">{it.title}</span>
                      <span className="db-row-meta">{upNextMeta(it)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data!.suggestions.length > 0 && (
            <div className="db-list-wrap">
              <h3 className="db-section-label">Suggestions</h3>
              <ul className="db-list">
                {data!.suggestions.map((s) => (
                  <li key={s.id} className="db-row db-sugg">{s.text}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
