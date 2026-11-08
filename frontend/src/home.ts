// Pure derivations for Home, the nav's connectors card and Settings (D43, D44).
import type { RecentFile } from './api';
import { parseISODate, startOfWeek, toISODate } from './calendar';
import type { CalendarItem } from './calendar';
import { direction, formatPct } from './portfolio';
import type { PortfolioFeed } from './portfolio';

export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function eventsToday(items: CalendarItem[], today: Date): CalendarItem[] {
  const iso = toISODate(today);
  return items
    .filter((it) => it.kind === 'event' && it.date === iso)
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
}

const WEEK_MS = 7 * 86_400_000;

/** Files modified in the 7 days up to and including `now`. */
export function brainChangesThisWeek(files: RecentFile[], now: Date): number {
  const t = now.getTime();
  return files.filter((f) => {
    const m = new Date(f.modifiedAt).getTime();
    return !Number.isNaN(m) && m <= t && t - m < WEEK_MS;
  }).length;
}

export function portfolioToday(feed: PortfolioFeed | null): { text: string; dir: 'up' | 'down' | 'flat' } | null {
  if (!feed || !feed.connected || !feed.dayChange) return null;
  const dir = direction(feed.dayChange.pct);
  const mark = dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '';
  return { text: `${mark}${formatPct(Math.abs(feed.dayChange.pct), 2)}`, dir };
}

/** First day shown by the 6-week month grid (Monday first) and how many days to request. */
export const MONTH_GRID_DAYS = 42;
export function monthGridStart(month: Date): Date {
  return startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1));
}

export function eventDays(items: CalendarItem[]): Date[] {
  return [...new Set(items.map((it) => it.date))].map(parseISODate);
}

export function relativeTime(iso: string, now: Date): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const s = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} d ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export type Connector = { id: 'calendar' | 'portfolio' | 'briefing'; label: string; connected: boolean; sources: string[] };

export function connectorsSummary(feeds: { calendar?: { connected: boolean; sources: string[] } | null; portfolio?: { connected: boolean; sources: string[] } | null; briefing?: { connected: boolean } | null }): { list: Connector[]; connected: number; total: number } {
  const list: Connector[] = [
    { id: 'calendar', label: 'Calendar', connected: !!feeds.calendar?.connected, sources: feeds.calendar?.sources ?? [] },
    { id: 'portfolio', label: 'Portfolio', connected: !!feeds.portfolio?.connected, sources: feeds.portfolio?.sources ?? [] },
    { id: 'briefing', label: 'Briefing', connected: !!feeds.briefing?.connected, sources: [] },
  ];
  return { list, connected: list.filter((c) => c.connected).length, total: list.length };
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
