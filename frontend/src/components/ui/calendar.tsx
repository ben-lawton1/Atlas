// shadcn-shaped Calendar on react-day-picker: a controlled, read-only mini month (no day buttons, D38). Monday first,
// today = filled day (aria-current="date"), accent dot on days with events.
import type { ComponentProps } from 'react';
import { DayPicker, type DayProps } from 'react-day-picker';

function AtlasDay({ day: _day, modifiers, children, ...td }: DayProps & ComponentProps<'td'>) {
  const label = td['aria-label'];
  return (
    <td
      {...td}
      aria-label={label && modifiers.hasEvent ? `${label}, has events` : label}
      aria-current={modifiers.today ? 'date' : undefined}
    >
      <div className="atlas-cal-cell">
        <span>{children}</span>
        {modifiers.hasEvent && !modifiers.today && <span aria-hidden="true" className="atlas-cal-dot" />}
      </div>
    </td>
  );
}

export type CalendarProps = {
  month: Date;
  onMonthChange: (month: Date) => void;
  eventDays: Date[];
};

export function Calendar({ month, onMonthChange, eventDays }: CalendarProps) {
  return (
    <DayPicker
      month={month}
      onMonthChange={onMonthChange}
      hideNavigation
      weekStartsOn={1}
      fixedWeeks
      showOutsideDays={false}
      modifiers={{ hasEvent: eventDays }}
      components={{ Day: AtlasDay }}
      classNames={{
        root: 'atlas-cal',
        months: 'atlas-cal-months',
        month: 'atlas-cal-month',
        month_caption: 'sr-only',
        month_grid: 'atlas-cal-grid',
        weekdays: 'atlas-cal-weekdays',
        weekday: 'atlas-cal-weekday',
        week: 'atlas-cal-week',
        day: 'atlas-cal-day',
        today: 'atlas-cal-today',
        outside: 'atlas-cal-outside',
        hidden: 'atlas-cal-hidden',
      }}
    />
  );
}
