import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api';
import { tagColor, toISODate } from '../../calendar';
import type { CalendarFeed } from '../../calendar';
import { addMonths, eventDays, eventsToday, monthGridStart, MONTH_GRID_DAYS } from '../../home';
import { useAsync, type Async } from '../../state';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/glass';

/** Home's calendar card (D43): read-only mini month with event dots, then today's events. Month arrows refetch the 42-day grid. */
export function MonthCard({ today }: { today: Async<CalendarFeed> }) {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const startIso = toISODate(monthGridStart(month));
  const feed = useAsync(() => api.calendar(startIso, MONTH_GRID_DAYS), startIso);
  const items = feed.status === 'ok' ? feed.data.items : [];
  const label = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todays = today.status === 'ok' ? eventsToday(today.data.items, new Date()) : [];
  const connected = feed.status === 'ok' && feed.data.connected;

  return (
    <Card className="flex flex-col gap-4" data-testid="month-calendar" aria-label="Calendar">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-base font-bold text-label-strong">Calendar</h2>
          <span className="text-[0.8125rem] text-label-secondary" data-testid="month-label" aria-live="polite">{label}</span>
        </div>
        <div className="flex gap-1.5">
          <Button size="icon" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
          </Button>
          <Button size="icon" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
          </Button>
        </div>
      </div>

      <Calendar month={month} onMonthChange={setMonth} eventDays={eventDays(items)} />

      {feed.status === 'loading' && <p className="sr-only" data-testid="calendar-status" role="status">Loading calendar…</p>}
      {feed.status === 'error' && <p className="m-0 text-[0.8125rem] text-negative" data-testid="calendar-status" role="alert">Couldn't load the calendar: {feed.message}</p>}

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <h3 className="m-0 text-xs font-semibold text-label-secondary">Today</h3>
        {feed.status === 'ok' && !connected && <p className="m-0 text-[0.8125rem] text-label-secondary" data-testid="calendar-status">No calendar connected yet.</p>}
        {connected && todays.length === 0 && <p className="m-0 text-[0.8125rem] text-label-secondary">Nothing scheduled today.</p>}
        {connected && todays.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-row bg-row px-3 py-2.5" data-testid="today-event">
            <span className="w-1 self-stretch rounded-sm" style={{ background: tagColor(e.tag) }} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[0.8125rem] font-semibold">{e.title}</span>
              <span className="truncate text-xs text-label-secondary">{[e.tag, e.location].filter(Boolean).join(' · ') || 'Event'}</span>
            </span>
            <span className="text-xs font-semibold tabular-nums text-label">{e.time ?? 'All day'}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
