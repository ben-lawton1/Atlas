import { describe, expect, it } from 'vitest';
import {
  addDays, buildDays, parseISODate, startOfWeek, tagColor, taskTotals, toISODate, weekLabel, type CalendarItem,
} from './calendar';

const item = (o: Partial<CalendarItem> & { id: string; date: string }): CalendarItem => ({
  title: o.id, time: null, durationMin: null, kind: 'event', tag: null, done: null, subtasks: [], source: 'test', location: null, ...o,
});

describe('dates', () => {
  it('startOfWeek returns Monday for Mon, Wed and Sun', () => {
    expect(toISODate(startOfWeek(new Date(2026, 10, 2, 15)))).toBe('2026-11-02');
    expect(toISODate(startOfWeek(new Date(2026, 10, 4)))).toBe('2026-11-02');
    expect(toISODate(startOfWeek(new Date(2026, 10, 8, 23, 59)))).toBe('2026-11-02');
    expect(startOfWeek(new Date(2026, 10, 4, 12)).getHours()).toBe(0);
  });

  it('toISODate uses the local date', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(toISODate(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('parseISODate gives local midnight', () => {
    const d = parseISODate('2026-11-02');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 2, 0]);
  });

  it('addDays keeps the date part across a DST change', () => {
    expect(toISODate(addDays(new Date(2026, 9, 31), 2))).toBe('2026-11-02');
    expect(toISODate(addDays(new Date(2026, 10, 1), 1))).toBe('2026-11-02');
    expect(toISODate(addDays(new Date(2026, 2, 7), 2))).toBe('2026-03-09');
    expect(toISODate(addDays(new Date(2026, 10, 2), -7))).toBe('2026-10-26');
  });
});

describe('tagColor', () => {
  it('maps known tags and falls back', () => {
    expect(tagColor('Build')).toBe('var(--cat-3)');
    expect(tagColor('Nope')).toBe('var(--cat-6)');
    expect(tagColor(null)).toBe('var(--cat-6)');
  });
});

describe('buildDays', () => {
  const start = new Date(2026, 10, 2);
  const today = new Date(2026, 10, 4, 10);

  it('builds 7 days with labels and today', () => {
    const days = buildDays(start, 7, [], today);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.dow)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(days[0].dayNum).toBe('2');
    expect(days[0].iso).toBe('2026-11-02');
    expect(days.filter((d) => d.isToday).map((d) => d.iso)).toEqual(['2026-11-04']);
    expect(days[0]).toMatchObject({ load: 'free', pct: 0, items: [] });
  });

  it('groups by date, timed first sorted, untimed in input order', () => {
    const items = [
      item({ id: 'u1', date: '2026-11-02' }),
      item({ id: 't2', date: '2026-11-02', time: '14:00' }),
      item({ id: 'x', date: '2026-11-03' }),
      item({ id: 'u2', date: '2026-11-02' }),
      item({ id: 't1', date: '2026-11-02', time: '09:30' }),
    ];
    const days = buildDays(start, 7, items, today);
    expect(days[0].items.map((i) => i.id)).toEqual(['t1', 't2', 'u1', 'u2']);
    expect(days[1].items.map((i) => i.id)).toEqual(['x']);
  });

  it('builds meta, color and flags', () => {
    const days = buildDays(start, 7, [
      item({ id: 'a', date: '2026-11-02', kind: 'task', tag: 'Build', time: '08:00', done: true, subtasks: [{ title: 's', done: true }, { title: 't', done: false }] }),
      item({ id: 'b', date: '2026-11-02', kind: 'event' }),
    ], today);
    const [a, b] = days[0].items;
    expect(a.meta).toBe('Build · 08:00 · 1/2');
    expect(a).toMatchObject({ color: 'var(--cat-3)', isTask: true, done: true });
    expect(b).toMatchObject({ meta: '', isTask: false, done: false });
  });

  it('computes load and pct', () => {
    const items = [
      item({ id: 'e1', date: '2026-11-02' }),
      item({ id: 'e2', date: '2026-11-03' }),
      item({ id: 'e3', date: '2026-11-03' }),
      item({ id: 'k1', date: '2026-11-04', kind: 'task', done: true }),
      item({ id: 'k2', date: '2026-11-04', kind: 'task', done: false }),
      item({ id: 'k3', date: '2026-11-04', kind: 'task', done: false }),
      item({ id: 'ev', date: '2026-11-04' }),
    ];
    const days = buildDays(start, 7, items, today);
    expect(days[0]).toMatchObject({ load: '1 event', pct: 0 });
    expect(days[1]).toMatchObject({ load: '2 events', pct: 0 });
    expect(days[2]).toMatchObject({ load: '1/3', pct: 33 });
    expect(days[3].load).toBe('free');
  });
});

describe('weekLabel', () => {
  it('same month', () => expect(weekLabel(new Date(2026, 10, 2))).toBe('Nov 2–8'));
  it('across months', () => expect(weekLabel(new Date(2026, 9, 30))).toBe('Oct 30–Nov 5'));
  it('across years', () => expect(weekLabel(new Date(2026, 11, 29))).toBe('Dec 29, 2026–Jan 4, 2027'));
});

describe('taskTotals', () => {
  it('counts only tasks', () => {
    expect(taskTotals([])).toEqual({ done: 0, total: 0 });
    expect(taskTotals([
      item({ id: 'a', date: 'd', kind: 'task', done: true }),
      item({ id: 'b', date: 'd', kind: 'task', done: null }),
      item({ id: 'c', date: 'd', kind: 'event', done: true }),
    ])).toEqual({ done: 1, total: 2 });
  });
});
