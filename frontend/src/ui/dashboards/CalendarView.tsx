import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api';
import { addDays, startOfWeek, tagColor, toISODate, weekLabel } from '../../calendar';
import { useAsync } from '../../state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/glass';
import { ViewFrame } from '../frames/ViewFrame';
import { WeekCalendar } from './WeekCalendar';

const TITLES: Record<number, string> = { 0: 'This week', 1: 'Next week', [-1]: 'Last week' };

export function CalendarView() {
  const [offset, setOffset] = useState(0);
  const start = addDays(startOfWeek(new Date()), offset * 7);
  const title = TITLES[offset] ?? weekLabel(start);
  const iso = toISODate(start);
  const feed = useAsync(() => api.calendar(iso, 7), iso);
  const upcoming = feed.status === 'ok' && feed.data.connected
    ? feed.data.items.filter((it) => it.kind === 'event').sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? ''))).slice(0, 6)
    : [];
  const actions = (
    <>
      <Button size="icon" aria-label="Previous week" onClick={() => setOffset(offset - 1)}>
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
      </Button>
      <Button size="sm" disabled={offset === 0} onClick={() => setOffset(0)}>Today</Button>
      <Button size="icon" aria-label="Next week" onClick={() => setOffset(offset + 1)}>
        <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
      </Button>
    </>
  );
  return (
    <ViewFrame id="calendar" title="Calendar" description="Your week at a glance.">
      <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1fr)_300px]">
        <WeekCalendar start={start} title={title} feed={feed} actions={actions} />
        <Card className="flex flex-col gap-3" data-testid="upcoming-card">
          <h2 className="m-0 text-base font-bold text-label-strong">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="m-0 rounded-row bg-row px-3 py-2.5 text-[0.8125rem] text-label-secondary">Connect Google Calendar or Microsoft 365 to see upcoming events.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-row bg-row px-3 py-2.5">
                  <span className="w-1 self-stretch rounded-sm" style={{ background: tagColor(e.tag) }} aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[0.8125rem] font-semibold">{e.title}</span>
                    <span className="text-xs text-label-secondary">{e.date}</span>
                  </span>
                  <span className="text-xs font-semibold tabular-nums">{e.time ?? 'All day'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </ViewFrame>
  );
}
