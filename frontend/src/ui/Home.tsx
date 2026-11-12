import { CalendarDays, CheckSquare, FileClock, TrendingUp, type LucideIcon } from 'lucide-react';
import { api } from '../api';
import { toISODate } from '../calendar';
import { brainChangesThisWeek, eventsToday, portfolioToday, relativeTime } from '../home';
import { atlasHref, linkClick } from '../router';
import { useAsync } from '../state';
import { Card } from '@/components/ui/glass';
import { cn } from '@/lib/utils';
import { HomeHeader } from './dashboards/HomeHeader';
import { MonthCard } from './dashboards/MonthCard';
import { PortfolioPanel } from './dashboards/PortfolioPanel';

function splitPath(path: string): { name: string; dir: string } {
  const i = path.lastIndexOf('/');
  return i < 0 ? { name: path, dir: '' } : { name: path.slice(i + 1), dir: path.slice(0, i) };
}

function Stat(props: { id: string; icon: LucideIcon; value: string; label: string; sub: string; tone?: 'up' | 'down' | 'flat' }) {
  const Icon = props.icon;
  return (
    <Card as="div" radius="tile" className="flex flex-col gap-3.5" data-testid={`stat-${props.id}`}>
      <span className="flex size-9 items-center justify-center rounded-[12px] border border-card-edge bg-tile text-label" aria-hidden="true">
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span
          className={cn(
            'text-[1.75rem] font-bold leading-9 tracking-[-0.02em] tabular-nums text-label-strong',
            props.tone === 'up' && 'text-positive',
            props.tone === 'down' && 'text-negative',
          )}
          data-testid="stat-value"
        >
          {props.value}
        </span>
        <span className="text-[0.8125rem] font-semibold">{props.label}</span>
        <span className="text-xs text-label-secondary">{props.sub}</span>
      </span>
    </Card>
  );
}

export function Home() {
  const now = new Date();
  const todayIso = toISODate(now);
  const today = useAsync(() => api.calendar(todayIso, 1), `today-${todayIso}`);
  const recent = useAsync(() => api.recent(50), 'recent-50');
  const portfolio = useAsync(() => api.portfolio('1M'), 'portfolio-tile');

  const events = today.status === 'ok' && today.data.connected ? eventsToday(today.data.items, now).length : null;
  const brain = recent.status === 'ok' ? brainChangesThisWeek(recent.data, now) : null;
  const pf = portfolioToday(portfolio.status === 'ok' ? portfolio.data : null);

  return (
    <div className="flex flex-col gap-[22px]" data-testid="home">
      <HomeHeader />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-4" data-testid="stats">
        <Stat id="events" icon={CalendarDays} value={events === null ? '—' : String(events)} label="Events today" sub={today.status === 'loading' ? 'Loading…' : events === null ? 'Calendar not connected' : 'On your calendar'} />
        <Stat id="tasks" icon={CheckSquare} value="—" label="Tasks due today" sub="Tasks not connected" />
        <Stat id="brain" icon={FileClock} value={brain === null ? '—' : String(brain)} label="Brain changes this week" sub={recent.status === 'error' ? "Couldn't load files" : 'Files edited in your brain'} />
        <Stat id="portfolio" icon={TrendingUp} value={pf ? pf.text : '—'} tone={pf?.dir} label="Portfolio today" sub={pf ? 'Change since yesterday' : portfolio.status === 'loading' ? 'Loading…' : 'Portfolio not connected'} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-stretch gap-4">
        <MonthCard today={today} />

        <Card className="flex flex-col gap-4" data-testid="card-recent-atlas" aria-labelledby="recent-h">
          <div className="flex flex-col gap-0.5">
            <h2 id="recent-h" className="m-0 text-base font-bold text-label-strong">Recently changed</h2>
            <span className="text-[0.8125rem] text-label-secondary">Latest edits in your brain</span>
          </div>
          {recent.status === 'loading' && (
            <>
              <p className="sr-only" role="status">Loading recent files…</p>
              <div className="flex flex-col gap-2" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => <span key={i} className="block h-14 w-full rounded-row bg-row" />)}
              </div>
            </>
          )}
          {recent.status === 'error' && <p className="m-0 text-[0.8125rem] text-negative" role="alert">Couldn't load recent files: {recent.message}</p>}
          {recent.status === 'ok' && recent.data.length === 0 && <p className="m-0 text-[0.8125rem] text-label-secondary">Nothing has changed yet.</p>}
          {recent.status === 'ok' && recent.data.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {recent.data.slice(0, 5).map((f) => {
                const href = atlasHref(f.path);
                const { name, dir } = splitPath(f.path);
                return (
                  <li key={f.path}>
                    <a
                      href={href}
                      onClick={(e) => linkClick(e, href)}
                      className="flex min-h-11 flex-col gap-1 rounded-row bg-row px-4 py-3 text-label no-underline hover:bg-hover hover:no-underline"
                    >
                      <span className="flex items-center gap-2">
                        <span className="size-2 flex-none rounded-full bg-label-tertiary" aria-hidden="true" />
                        <span className="min-w-0 truncate text-xs font-semibold text-label-secondary">{dir || 'brain'}</span>
                        <span className="ml-auto flex-none text-xs tabular-nums text-label-secondary">{relativeTime(f.modifiedAt, now)}</span>
                      </span>
                      <span className="truncate text-[0.875rem] font-semibold text-label-strong">{name}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <PortfolioPanel compact />
      </div>
    </div>
  );
}
