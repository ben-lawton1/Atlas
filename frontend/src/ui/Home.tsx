import { api, formatWhen } from '../api';
import { startOfWeek } from '../calendar';
import { atlasHref, linkClick } from '../router';
import { useAsync } from '../state';
import { TodayHeader } from './dashboards/BriefingPanel';
import { PortfolioPanel } from './dashboards/PortfolioPanel';
import { WeekCalendar } from './dashboards/WeekCalendar';
import './home.css';

function splitPath(path: string): { name: string; dir: string } {
  const i = path.lastIndexOf('/');
  return i < 0 ? { name: path, dir: '' } : { name: path.slice(i + 1), dir: path.slice(0, i) };
}

export function Home() {
  const recent = useAsync(() => api.recent(8), 'recent');

  return (
    <div>
      <div className="home" data-testid="home">
        <TodayHeader />
        <WeekCalendar
          start={startOfWeek(new Date())}
          title="This week"
          actions={<a className="db-link" href="/calendar" onClick={(e) => linkClick(e, '/calendar')}>Open calendar</a>}
        />
        <div className="home-row">
          <section className="db-section" data-testid="card-recent-atlas" aria-labelledby="recent-h">
            <div className="db-section-head">
              <div className="db-title"><h2 id="recent-h">Recently changed</h2></div>
            </div>
            {recent.status === 'loading' && (
              <>
                <p className="db-sr" role="status">Loading recent files…</p>
                <div className="db-skel-stack" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => <span key={i} className="db-skel" style={{ width: '100%', height: '2.5rem' }} />)}
                </div>
              </>
            )}
            {recent.status === 'error' && (
              <p className="db-error" role="alert">Couldn't load recent files: {recent.message}</p>
            )}
            {recent.status === 'ok' && recent.data.length === 0 && <p className="db-note">Nothing has changed yet.</p>}
            {recent.status === 'ok' && recent.data.length > 0 && (
              <ul className="db-group recent-list">
                {recent.data.map((f) => {
                  const href = atlasHref(f.path);
                  const { name, dir } = splitPath(f.path);
                  return (
                    <li key={f.path}>
                      <a className="recent-row" href={href} onClick={(e) => linkClick(e, href)}>
                        <span className="recent-text">
                          <span className="recent-name">{name}</span>
                          {dir && <span className="recent-dir">{dir}</span>}
                        </span>
                        <span className="recent-when">{formatWhen(f.modifiedAt)}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <PortfolioPanel compact />
        </div>
      </div>
    </div>
  );
}
