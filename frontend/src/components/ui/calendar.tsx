// shadcn-shaped Calendar on react-day-picker: a controlled mini month, Monday first, today = filled day, accent dot on days with events.
import { DayPicker, type DayButtonProps } from 'react-day-picker';

function DayButton({ day: _day, modifiers, className, children, ...rest }: DayButtonProps) {
  const dot = modifiers.hasEvent && !modifiers.today;
  return (
    <button {...rest} className={className}>
      <span>{children}</span>
      {modifiers.today && <span className="sr-only">Today</span>}
      {dot && <span aria-hidden="true" className="atlas-cal-dot" />}
      {modifiers.hasEvent && <span className="sr-only">, has events</span>}
    </button>
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
      components={{ DayButton }}
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
        day_button: 'atlas-cal-btn',
        today: 'atlas-cal-today',
        outside: 'atlas-cal-outside',
        hidden: 'atlas-cal-hidden',
      }}
    />
  );
}
