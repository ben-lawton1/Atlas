export type Subtask = { title: string; done: boolean };
export type CalendarItem = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  durationMin: number | null;
  kind: 'event' | 'task';
  tag: string | null;
  done: boolean | null;
  subtasks: Subtask[];
  source: string;
  location: string | null;
};
export type CalendarFeed = { connected: boolean; sources: string[]; start: string; days: number; items: CalendarItem[] };

const FALLBACK_COLOR = 'var(--cat-6)';
export const TAG_COLORS: Record<string, string> = {
  School: 'var(--cat-1)',
  Work: 'var(--cat-2)',
  Build: 'var(--cat-3)',
  Health: 'var(--cat-4)',
  Money: 'var(--cat-5)',
  Life: 'var(--cat-6)',
};

export function tagColor(tag: string | null): string {
  return (tag && Object.prototype.hasOwnProperty.call(TAG_COLORS, tag) && TAG_COLORS[tag]) || FALLBACK_COLOR;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local date as YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** YYYY-MM-DD as local midnight. */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday 00:00 local of d's week (Sunday belongs to the week before). */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

export type ItemView = {
  id: string;
  title: string;
  meta: string;
  color: string;
  isTask: boolean;
  done: boolean;
  subtasks: Subtask[];
};
export type DayView = {
  iso: string;
  dow: string;
  dayNum: string;
  isToday: boolean;
  items: ItemView[];
  load: string;
  pct: number;
};

function itemView(it: CalendarItem): ItemView {
  const doneSubs = it.subtasks.filter((s) => s.done).length;
  const meta = [it.tag, it.time, it.subtasks.length ? `${doneSubs}/${it.subtasks.length}` : '']
    .filter(Boolean)
    .join(' · ');
  return {
    id: it.id,
    title: it.title,
    meta,
    color: tagColor(it.tag),
    isTask: it.kind === 'task',
    done: !!it.done,
    subtasks: it.subtasks,
  };
}

export function buildDays(start: Date, count: number, items: CalendarItem[], today: Date): DayView[] {
  const todayIso = toISODate(today);
  const days: DayView[] = [];
  for (let i = 0; i < count; i++) {
    const d = addDays(start, i);
    const iso = toISODate(d);
    const mine = items.filter((it) => it.date === iso);
    const timed = mine.filter((it) => it.time).sort((a, b) => (a.time! < b.time! ? -1 : a.time! > b.time! ? 1 : 0));
    const ordered = [...timed, ...mine.filter((it) => !it.time)];
    const tasks = mine.filter((it) => it.kind === 'task');
    const doneTasks = tasks.filter((it) => it.done).length;
    let load: string;
    if (mine.length === 0) load = 'free';
    else if (tasks.length === 0) load = mine.length === 1 ? '1 event' : `${mine.length} events`;
    else load = `${doneTasks}/${tasks.length}`;
    days.push({
      iso,
      dow: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: String(d.getDate()),
      isToday: iso === todayIso,
      items: ordered.map(itemView),
      load,
      pct: tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0,
    });
  }
  return days;
}

/** 'Nov 2–8', 'Oct 30–Nov 5', 'Dec 29, 2026–Jan 4, 2027'. */
export function weekLabel(start: Date, count = 7): string {
  const end = addDays(start, count - 1);
  const md = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (start.getFullYear() !== end.getFullYear()) {
    const full = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${full(start)}–${full(end)}`;
  }
  if (start.getMonth() !== end.getMonth()) return `${md(start)}–${md(end)}`;
  return `${md(start)}–${end.getDate()}`;
}

export function taskTotals(items: CalendarItem[]): { done: number; total: number } {
  const tasks = items.filter((it) => it.kind === 'task');
  return { done: tasks.filter((it) => it.done).length, total: tasks.length };
}
