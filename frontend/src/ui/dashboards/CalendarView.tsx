import { useState } from 'react';
import { addDays, startOfWeek, weekLabel } from '../../calendar';
import { Icon } from '../icons';
import { WeekCalendar } from './WeekCalendar';
import './dashboards.css';

const TITLES: Record<number, string> = { 0: 'This week', 1: 'Next week', [-1]: 'Last week' };

export function CalendarView() {
  const [offset, setOffset] = useState(0);
  const start = addDays(startOfWeek(new Date()), offset * 7);
  const title = TITLES[offset] ?? weekLabel(start);
  const actions = (
    <>
      <button type="button" className="db-btn" aria-label="Previous week" onClick={() => setOffset(offset - 1)}>
        <Icon name="chevronLeft" size={14} />
      </button>
      <button type="button" className="db-btn" disabled={offset === 0} onClick={() => setOffset(0)}>Today</button>
      <button type="button" className="db-btn" aria-label="Next week" onClick={() => setOffset(offset + 1)}>
        <span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}>
          <Icon name="chevronLeft" size={14} />
        </span>
      </button>
    </>
  );
  return (
    <div data-testid="calendar-view">
      <div className="db-page">
        <WeekCalendar start={start} title={title} actions={actions} tall />
      </div>
    </div>
  );
}
