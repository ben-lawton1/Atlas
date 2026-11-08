import { api } from '../api';
import { connectorsSummary } from '../home';
import { useAsync } from '../state';

/** Connection status of the three dashboard feeds (D37), for the nav card and Settings. */
export function useConnectors() {
  const calendar = useAsync(() => api.calendar(new Date().toISOString().slice(0, 10), 1), 'conn-calendar');
  const portfolio = useAsync(() => api.portfolio('1M'), 'conn-portfolio');
  const briefing = useAsync(() => api.briefing(), 'conn-briefing');
  const ok = <T,>(a: { status: string; data?: T }) => (a.status === 'ok' ? (a.data as T) : null);
  const loading = [calendar, portfolio, briefing].some((a) => a.status === 'loading');
  return { ...connectorsSummary({ calendar: ok(calendar), portfolio: ok(portfolio), briefing: ok(briefing) }), loading };
}
