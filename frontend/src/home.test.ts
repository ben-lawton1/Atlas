import { describe, expect, it } from 'vitest';
import type { CalendarItem } from './calendar';
import { addMonths, brainChangesThisWeek, connectorsSummary, eventDays, eventsToday, greeting, monthGridStart, portfolioToday, relativeTime } from './home';
import type { PortfolioFeed } from './portfolio';

const item = (o: Partial<CalendarItem>): CalendarItem => ({
  id: 'x', title: 't', date: '2026-11-08', time: null, durationMin: null, kind: 'event', tag: null, done: null, subtasks: [], source: 's', location: null, ...o,
});
const now = new Date(2026, 10, 8, 10, 0);

describe('greeting', () => {
  it('follows the local hour', () => {
    expect(greeting(0)).toBe('Good morning');
    expect(greeting(11)).toBe('Good morning');
    expect(greeting(12)).toBe('Good afternoon');
    expect(greeting(17)).toBe('Good afternoon');
    expect(greeting(18)).toBe('Good evening');
    expect(greeting(23)).toBe('Good evening');
  });
});

describe('eventsToday', () => {
  it('keeps today events (not tasks), ordered by time with untimed last', () => {
    const got = eventsToday([
      item({ id: 'a', time: '14:00' }), item({ id: 'b', time: '09:00' }), item({ id: 'c', time: null }),
      item({ id: 'd', kind: 'task' }), item({ id: 'e', date: '2026-11-09' }),
    ], now);
    expect(got.map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('brainChangesThisWeek', () => {
  it('counts files modified within 7 days, ignores future and invalid dates', () => {
    const f = (modifiedAt: string) => ({ path: 'a.md', name: 'a.md', size: 1, modifiedAt });
    const day = 86_400_000;
    const files = [
      f(new Date(now.getTime() - 1000).toISOString()),
      f(new Date(now.getTime() - 6 * day).toISOString()),
      f(new Date(now.getTime() - 7 * day).toISOString()),
      f(new Date(now.getTime() + day).toISOString()),
      f('nope'),
    ];
    expect(brainChangesThisWeek(files, now)).toBe(2);
    expect(brainChangesThisWeek([], now)).toBe(0);
  });
});

describe('portfolioToday', () => {
  const feed = (o: Partial<PortfolioFeed>): PortfolioFeed => ({
    connected: true, sources: [], asOf: null, currency: 'USD', range: '1M', total: 1, dayChange: { amount: 1, pct: 0.333 }, totalChange: null, history: [], holdings: [], ...o,
  });
  it('is null when not connected', () => {
    expect(portfolioToday(null)).toBeNull();
    expect(portfolioToday(feed({ connected: false }))).toBeNull();
    expect(portfolioToday(feed({ dayChange: null }))).toBeNull();
  });
  it('carries a mark with the sign (nothing by color alone)', () => {
    expect(portfolioToday(feed({}))).toEqual({ text: '▲ 0.33%', dir: 'up' });
    expect(portfolioToday(feed({ dayChange: { amount: -2, pct: -1.2 } }))).toEqual({ text: '▼ 1.20%', dir: 'down' });
    expect(portfolioToday(feed({ dayChange: { amount: 0, pct: 0 } }))).toEqual({ text: '0.00%', dir: 'flat' });
  });
});

describe('month grid', () => {
  it('starts on the Monday on or before the 1st', () => {
    expect(monthGridStart(new Date(2026, 10, 15)).getDate()).toBe(26); // Nov 1 2026 is a Sunday -> Mon Oct 26
    expect(monthGridStart(new Date(2026, 11, 3))).toEqual(new Date(2026, 10, 30));
  });
  it('steps months', () => {
    expect(addMonths(new Date(2026, 11, 20), 1)).toEqual(new Date(2027, 0, 1));
    expect(addMonths(new Date(2026, 0, 20), -1)).toEqual(new Date(2025, 11, 1));
  });
  it('lists unique days with items', () => {
    expect(eventDays([item({ date: '2026-11-03' }), item({ date: '2026-11-03' }), item({ date: '2026-11-09' })])).toEqual([new Date(2026, 10, 3), new Date(2026, 10, 9)]);
  });
});

describe('relativeTime', () => {
  it('reads naturally', () => {
    const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
    expect(relativeTime(ago(10_000), now)).toBe('just now');
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5 min ago');
    expect(relativeTime(ago(2 * 3_600_000), now)).toBe('2 h ago');
    expect(relativeTime(ago(3 * 86_400_000), now)).toBe('3 d ago');
    expect(relativeTime('bad', now)).toBe('bad');
  });
});

describe('connectorsSummary', () => {
  it('counts connected feeds out of three', () => {
    expect(connectorsSummary({}).connected).toBe(0);
    expect(connectorsSummary({}).total).toBe(3);
    const s = connectorsSummary({ calendar: { connected: true, sources: ['google'] }, portfolio: { connected: false, sources: [] }, briefing: { connected: true } });
    expect(s.connected).toBe(2);
    expect(s.list[0]).toMatchObject({ id: 'calendar', connected: true, sources: ['google'] });
  });
});
