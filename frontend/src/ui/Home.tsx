import { api, formatWhen } from '../api';
import { startOfWeek } from '../calendar';
import { atlasHref, linkClick } from '../router';
import { useAsync } from '../state';
import { BriefingPanel } from './dashboards/BriefingPanel';
import { PortfolioPanel } from './dashboards/PortfolioPanel';
import { WeekCalendar } from './dashboards/WeekCalendar';

export function Home() {
  const recent = useAsync(() => api.recent(8), 'recent');

  return (
    <div className="pane-scroll">
      <div className="home" data-testid="home">
        <WeekCalendar
          start={startOfWeek(new Date())}
          title="This week"
          actions={<a className="btn" href="/calendar" onClick={(e) => linkClick(e, '/calendar')}>Open calendar</a>}
        />
        <div className="home-row">
          <PortfolioPanel compact />
          <BriefingPanel />
        </div>
        <div className="cards">
          <section className="card" data-testid="card-recent-atlas">
            <h2>Recently changed in Atlas</h2>
            {recent.status === 'loading' && <p className="muted">Loading…</p>}
            {recent.status === 'error' && <p className="muted">Couldn't load recent files.</p>}
            {recent.status === 'ok' && recent.data.length === 0 && <p className="muted">Nothing yet.</p>}
            {recent.status === 'ok' && (
              <ul className="list">
                {recent.data.map((f) => {
                  const href = atlasHref(f.path);
                  return (
                    <li key={f.path}>
                      <a href={href} onClick={(e) => linkClick(e, href)}>{f.path}</a>
                      <span className="muted">{formatWhen(f.modifiedAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
