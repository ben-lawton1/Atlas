import type { ReactNode } from 'react';
import { buildDays, taskTotals, weekLabel } from '../../calendar';
import type { CalendarFeed, DayView, ItemView } from '../../calendar';
import type { Async } from '../../state';
import { Card } from '@/components/ui/glass';
import { cn } from '@/lib/utils';

function Item({ it }: { it: ItemView }) {
  const done = it.isTask && it.done;
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        {it.isTask && (
          <span
            aria-hidden="true"
            className={cn('mt-0.5 flex size-4 flex-none items-center justify-center rounded-full border-[1.5px] border-label-tertiary', done && 'border-label-secondary bg-label-secondary text-on-today')}
          >
            {done && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className={cn('break-words text-[0.8125rem] font-semibold', done && 'text-label-secondary line-through')}>
            {it.title}
            {it.isTask && <span className="sr-only">{done ? ' (done)' : ' (to do)'}</span>}
          </span>
          {it.meta && (
            <span className="flex items-center gap-1.5 text-xs tabular-nums text-label-secondary">
              <span className="size-2 flex-none rounded-full" style={{ background: it.color }} aria-hidden="true" />
              {it.meta}
            </span>
          )}
        </span>
      </div>
      {it.subtasks.length > 0 && (
        <ul className="m-0 ml-6 flex list-none flex-col gap-0.5 p-0">
          {it.subtasks.map((s, i) => (
            <li key={i} className={cn('flex items-center gap-1.5 text-xs text-label-secondary', s.done && 'line-through')}>
              <span aria-hidden="true" className={cn('size-2.5 flex-none rounded-full border-[1.5px] border-label-tertiary', s.done && 'border-label-secondary bg-label-secondary')} />
              {s.title}
              <span className="sr-only">{s.done ? ' (done)' : ' (to do)'}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Day({ d, loading }: { d: DayView; loading: boolean }) {
  return (
    <li
      className="flex min-w-0 flex-col gap-2 rounded-row bg-row p-3 min-[761px]:min-h-40"
      data-testid="calendar-day"
      data-date={d.iso}
      aria-current={d.isToday ? 'date' : undefined}
    >
      <div className="flex items-baseline gap-2 min-[761px]:flex-col min-[761px]:items-start min-[761px]:gap-0.5">
        <span className="text-xs font-semibold text-label-secondary">{d.isToday ? 'Today' : d.dow}</span>
        <span
          className={cn(
            'inline-flex h-7 min-w-7 items-center justify-center rounded-[10px] px-1 text-[0.9375rem] font-bold tabular-nums',
            d.isToday ? 'bg-today text-on-today' : 'text-label-strong',
          )}
        >
          {d.dayNum}
        </span>
      </div>
      {loading && <span className="block h-3.5 w-4/5 rounded bg-hover" aria-hidden="true" />}
      {d.items.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {d.items.map((it) => <Item key={it.id} it={it} />)}
        </ul>
      )}
      {!loading && d.items.length === 0 && <span className="text-xs text-label-secondary">Nothing scheduled</span>}
    </li>
  );
}

/** A week of days in one card (the /calendar view). Data comes from the caller so the Upcoming card can share it. */
export function WeekCalendar({ start, title, feed, actions }: { start: Date; title: string; feed: Async<CalendarFeed>; actions?: ReactNode }) {
  const items = feed.status === 'ok' ? feed.data.items : [];
  const days = buildDays(start, 7, items, new Date());
  const { done, total } = taskTotals(items);
  const range = weekLabel(start).replace('–', ' – ');
  const sub = range + (feed.status === 'ok' && total > 0 ? ` · ${done} of ${total} done` : '');
  return (
    <Card className="flex min-w-0 flex-col gap-4" data-testid="week-calendar" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-base font-bold text-label-strong">{title}</h2>
          <span className="text-[0.8125rem] tabular-nums text-label-secondary">{sub}</span>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {feed.status === 'loading' && <p className="sr-only" data-testid="calendar-status" role="status">Loading calendar…</p>}
      {feed.status === 'error' && <p className="m-0 text-[0.8125rem] text-negative" data-testid="calendar-status" role="alert">Couldn't load the calendar: {feed.message}</p>}
      {feed.status === 'ok' && !feed.data.connected && (
        <p className="m-0 text-[0.8125rem] text-label-secondary" data-testid="calendar-status">No calendar connected yet. Google Calendar and Outlook will sync here.</p>
      )}
      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 min-[761px]:grid-cols-7" aria-label="Days of the week">
        {days.map((d) => <Day key={d.iso} d={d} loading={feed.status === 'loading'} />)}
      </ul>
    </Card>
  );
}
