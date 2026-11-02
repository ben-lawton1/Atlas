import type { ReactNode } from 'react';
import { api } from '../../api';
import { buildDays, taskTotals, toISODate, weekLabel } from '../../calendar';
import type { DayView, ItemView } from '../../calendar';
import { useAsync } from '../../state';
import './dashboards.css';

function Item({ it }: { it: ItemView }) {
  const done = it.isTask && it.done;
  return (
    <li className={'db-item' + (done ? ' done' : '')}>
      <div className="db-item-row">
        {it.isTask && (
          <span className={'db-box' + (done ? ' done' : '')} aria-hidden="true">
            {done && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
          </span>
        )}
        <div className="db-item-main">
          <span className="db-item-title">
            {it.title}
            {it.isTask && <span className="db-sr">{done ? ' (done)' : ' (to do)'}</span>}
          </span>
          {it.meta && (
            <span className="db-item-meta">
              <span className="db-dot" style={{ background: it.color }} aria-hidden="true" />
              {it.meta}
            </span>
          )}
        </div>
      </div>
      {it.subtasks.length > 0 && (
        <ul className="db-subs">
          {it.subtasks.map((s, i) => (
            <li key={i} className={'db-sub-item' + (s.done ? ' done' : '')}>
              <span className="db-sub-box" aria-hidden="true" />
              {s.title}
              <span className="db-sr">{s.done ? ' (done)' : ' (to do)'}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Day({ d }: { d: DayView }) {
  return (
    <li className="db-day" data-testid="calendar-day" data-date={d.iso} aria-current={d.isToday ? 'date' : undefined}>
      <div className="db-day-head">
        <div className="db-day-name">
          <span className="db-dow">{d.dow}</span>
          <span className="db-num">{d.dayNum}</span>
        </div>
        <span className="db-load">{d.load}</span>
      </div>
      <div className="db-bar" aria-hidden="true">
        <div style={{ width: `${d.pct}%` }} />
      </div>
      {d.items.length > 0 && (
        <ul className="db-items">
          {d.items.map((it) => (
            <Item key={it.id} it={it} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function WeekCalendar({ start, title, actions, tall }: { start: Date; title: string; actions?: ReactNode; tall?: boolean }) {
  const iso = toISODate(start);
  const feed = useAsync(() => api.calendar(iso, 7), iso);
  const items = feed.status === 'ok' ? feed.data.items : [];
  const days = buildDays(start, 7, items, new Date());
  const { done, total } = taskTotals(items);
  const sub = weekLabel(start) + (feed.status === 'ok' ? ` · ${done}/${total} done` : '');
  return (
    <section className={'db-card' + (tall ? ' db-tall' : '')} data-testid="week-calendar" aria-label={title}>
      <div className="db-head">
        <div className="db-title">
          <h2>{title}</h2>
          <span className="db-sub">{sub}</span>
        </div>
        {actions && <div className="db-actions">{actions}</div>}
      </div>
      {feed.status === 'loading' && (
        <p className="db-notice" data-testid="calendar-status" role="status">Loading calendar…</p>
      )}
      {feed.status === 'error' && (
        <p className="db-notice error" data-testid="calendar-status" role="alert">Could not load the calendar: {feed.message}</p>
      )}
      {feed.status === 'ok' && !feed.data.connected && (
        <p className="db-notice" data-testid="calendar-status">No calendar connected yet. Google Calendar and Outlook will sync here.</p>
      )}
      <ul className="db-grid" aria-label="Days of the week">
        {days.map((d) => (
          <Day key={d.iso} d={d} />
        ))}
      </ul>
    </section>
  );
}
