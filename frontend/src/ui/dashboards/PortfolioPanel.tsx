import { lazy, Suspense, useId, useState } from 'react';
import { api } from '../../api';
import { direction, formatChange, formatMoney, formatPct, withWeights } from '../../portfolio';
import type { Change, Range } from '../../portfolio';
import { useAsync } from '../../state';
import { Card } from '@/components/ui/glass';
import { cn } from '@/lib/utils';

const PortfolioChart = lazy(() => import('./PortfolioChart'));

const PANEL_RANGES: Range[] = ['1D', '1W', '1M', '1Y'];
const RANGE_WORDS: Record<string, string> = { '1D': 'today', '1W': 'this week', '1M': 'this month', '1Y': 'this year', ALL: 'all time' };

const DIR_TEXT = { up: 'text-positive', down: 'text-negative', flat: 'text-label-secondary' } as const;

function ChangeLine({ c, currency, label }: { c: Change; currency: string; label: string }) {
  const f = formatChange(c, currency);
  return (
    <span className={cn('text-[0.8125rem] font-semibold tabular-nums', DIR_TEXT[f.dir])}>
      {f.text} <span className="font-medium text-label-secondary">{label}</span>
    </span>
  );
}

function pctText(pct: number | null): string {
  if (pct === null) return '—';
  const dir = direction(pct);
  return (dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '') + formatPct(Math.abs(pct), 2);
}

/** The portfolio card (D43): title, range segments, total, change, sparkline, holdings rows. `compact` is Home's version. */
export function PortfolioPanel({ compact }: { compact?: boolean }) {
  const [range, setRange] = useState<Range>('1M');
  const feed = useAsync(() => api.portfolio(range), range);
  const uid = useId().replace(/:/g, '');
  const data = feed.status === 'ok' ? feed.data : null;
  const connected = !!data?.connected;
  const cur = data?.currency ?? 'USD';
  const holdings = data ? withWeights(data.holdings) : [];
  const shown = compact ? holdings.slice(0, 4) : holdings;
  const values = data ? data.history.map((p) => p.value) : [];
  const trend: 'up' | 'down' = values.length > 0 && values[values.length - 1] >= values[0] ? 'up' : 'down';
  const chartLabel = values.length > 0
    ? `Portfolio value ${trend === 'up' ? 'rose' : 'fell'} over ${range}, from ${formatMoney(values[0], cur)} to ${formatMoney(values[values.length - 1], cur)}`
    : '';

  return (
    <Card className="flex flex-col gap-4" data-testid="portfolio-panel" aria-label="Portfolio">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="m-0 text-base font-bold text-label-strong">Portfolio</h2>
        {connected && (
          <div className="flex gap-0.5 rounded-[12px] bg-row p-[3px]" role="group" aria-label="Chart range">
            {PANEL_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={cn(
                  'h-7 min-w-9 rounded-[9px] border-0 px-2 text-xs pointer-coarse:min-h-11 pointer-coarse:min-w-11',
                  range === r ? 'bg-today font-bold text-on-today' : 'bg-transparent font-semibold text-label-secondary hover:text-label',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {feed.status === 'loading' && (
        <>
          <p className="sr-only" data-testid="portfolio-status" role="status">Loading portfolio…</p>
          <div className="flex flex-col gap-2" aria-hidden="true">
            <span className="block h-8 w-2/5 rounded-lg bg-row" />
            <span className="block h-4 w-3/5 rounded-lg bg-row" />
            <span className="block h-24 w-full rounded-lg bg-row" />
          </div>
        </>
      )}
      {feed.status === 'error' && (
        <p className="m-0 text-[0.8125rem] text-negative" data-testid="portfolio-status" role="alert">Couldn't load the portfolio: {feed.message}</p>
      )}
      {feed.status === 'ok' && !connected && (
        <p className="m-0 text-[0.8125rem] text-label-secondary" data-testid="portfolio-status">Not connected. Holdings will sync here through a connector.</p>
      )}

      {connected && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-[1.875rem] font-bold leading-9 tracking-[-0.02em] tabular-nums text-label-strong">
              {data!.total !== null ? formatMoney(data!.total, cur) : '—'}
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {data!.dayChange && <ChangeLine c={data!.dayChange} currency={cur} label={RANGE_WORDS['1D']} />}
              {data!.totalChange && <ChangeLine c={data!.totalChange} currency={cur} label="all time" />}
            </div>
          </div>

          {values.length > 0 && (
            <div role="img" aria-label={chartLabel} data-testid="portfolio-chart" className="w-full">
              <Suspense fallback={<div className="h-24 rounded-lg bg-row" aria-hidden="true" />}>
                <PortfolioChart values={values} dir={trend} height={compact ? 96 : 160} id={uid} />
              </Suspense>
            </div>
          )}

          {shown.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Holdings">
              {shown.map((h, i) => {
                const dir = direction(h.dayChangePct);
                return (
                  <li key={h.symbol} className="flex items-center gap-3 rounded-row bg-row px-3 py-2.5" data-testid="holding-row">
                    <span
                      className="flex size-[34px] flex-none items-center justify-center rounded-[10px] bg-tile text-[0.6875rem] font-bold text-label-strong"
                      style={{ boxShadow: `inset 0 -3px 0 var(--cat-${(i % 6) + 1})` }}
                      aria-hidden="true"
                    >
                      {h.symbol.slice(0, 4)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[0.8125rem] font-semibold">{h.symbol} <span className="font-medium text-label-secondary">{h.name}</span></span>
                      <span className="text-xs tabular-nums text-label-secondary">
                        {formatPct(h.weight)} of portfolio{!compact && h.shares !== null && h.price !== null ? ` · ${h.shares} × ${formatMoney(h.price, cur)}` : ''}
                      </span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="text-[0.8125rem] font-semibold tabular-nums">{formatMoney(h.value, cur)}</span>
                      <span className={cn('text-xs font-semibold tabular-nums', DIR_TEXT[dir])}>{pctText(h.dayChangePct)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
