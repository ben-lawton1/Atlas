import type { CalendarItem } from './calendar';

export type Suggestion = { id: string; text: string };
export type BriefingFeed = {
  connected: boolean;
  generatedAt: string | null;
  summary: string | null;
  upNext: CalendarItem[];
  suggestions: Suggestion[];
};
