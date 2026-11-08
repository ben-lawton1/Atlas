import { useState } from 'react';
import { api } from '../../api';
import { RANGES, areaPoints, direction, formatChange, formatMoney, formatPct, linePoints, withWeights } from '../../portfolio';
import type { Change, Range } from '../../portfolio';
import { useAsync } from '../../state';
import './dashboards.css';

const swatch = (i: number) => `var(--cat-${(i % 6) + 1})`;

function ChangeLine({ c, currency, label }: { c: Change; currency: string; label: string }) {
  const f = formatChange(c, currency);
  return <span className={'db-' + f.dir}>{f.text} {label}</span>;
}

function todayText(pct: number | null): string {
  if (pct === null) return '—';
  const dir = direction(pct);
  const arrow = dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '';
  return arrow + formatPct(Math.abs(pct), 2);
}

export function PortfolioPanel({ compact }: { compact?: boolean }) {
  const [range, setRange] = useState<Range>('1M');
  const feed = useAsync(() => api.portfolio(range), range);
  const data = feed.status === 'ok' ? feed.data : null;
  const connected = !!data?.connected;
  const cur = data?.currency ?? 'USD';
  const holdings = data ? withWeights(data.holdings) : [];
  const values = data ? data.history.map((p) => p.value) : [];
  const legend = compact ? holdings.slice(0, 5) : holdings;
  const trend = values.length > 0 && values[values.length - 1] >= values[0] ? 'up' : 'down';

  return (
    <section className={'db-section' + (compact ? ' db-compact' : '')} data-testid="portfolio-panel" aria-label="Portfolio">
      <div className="db-section-head">
        <div className="db-title">
          <h2>Portfolio</h2>
        </div>
        {connected && (
          <div className="db-range" role="group" aria-label="Chart range">
            {RANGES.map((r) => (
              <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        )}
      </div>

      {feed.status === 'loading' && (
        <>
          <p className="db-sr" data-testid="portfolio-status" role="status">Loading portfolio…</p>
          <div className="db-skel-stack" aria-hidden="true">
            <span className="db-skel" style={{ width: '40%', height: '1.875rem' }} />
            <span className="db-skel" style={{ width: '60%', height: '1.125rem' }} />
            <span className="db-skel" style={{ width: '100%', height: '8rem' }} />
          </div>
        </>
      )}
      {feed.status === 'error' && (
        <p className="db-error" data-testid="portfolio-status" role="alert">Couldn't load the portfolio: {feed.message}</p>
      )}
      {feed.status === 'ok' && !connected && (
        <p className="db-note" data-testid="portfolio-status">Not connected. Holdings will sync here through a connector.</p>
      )}

      {connected && (
        <div className="db-group db-pad">
          <span className="db-value">{data!.total !== null ? formatMoney(data!.total, cur) : '—'}</span>
          <div className="db-changes">
            {data!.dayChange && <ChangeLine c={data!.dayChange} currency={cur} label="today" />}
            {data!.totalChange && <ChangeLine c={data!.totalChange} currency={cur} label="all time" />}
          </div>

          {values.length > 0 && (
            <svg
              className="db-chart"
              viewBox="0 0 600 180"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Portfolio value over ${range}, from ${formatMoney(values[0], cur)} to ${formatMoney(values[values.length - 1], cur)}`}
            >
              {[45, 90, 135].map((y) => (
                <line key={y} className="db-grid-line" x1="0" y1={y} x2="600" y2={y} vectorEffect="non-scaling-stroke" />
              ))}
              <polygon className={'db-area ' + trend} points={areaPoints(values, 600, 180, 8)} />
              <polyline className={'db-line ' + trend} points={linePoints(values, 600, 180, 8)} vectorEffect="non-scaling-stroke" />
            </svg>
          )}

          {holdings.length > 0 && (
            <div className="db-alloc">
              <div className="db-alloc-head">
                <span className="db-label">Allocation</span>
                <span className="db-sub">{holdings.length} {holdings.length === 1 ? 'position' : 'positions'}</span>
              </div>
              <div className="db-alloc-bar" aria-hidden="true">
                {holdings.map((h, i) => (
                  <div key={h.symbol} style={{ width: `${h.weight}%`, background: swatch(i) }} />
                ))}
              </div>
              <ul className="db-legend">
                {legend.map((h, i) => (
                  <li key={h.symbol}>
                    <span className="db-dot" style={{ background: swatch(i) }} aria-hidden="true" />
                    {h.symbol} <b>{formatPct(h.weight)}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {connected && !compact && holdings.length > 0 && (
        <div className="db-group db-table-box">
          <table className="db-table">
            <thead>
              <tr>
                <th scope="col">Holding</th>
                <th scope="col">Shares</th>
                <th scope="col">Price</th>
                <th scope="col">Today</th>
                <th scope="col" className="mid">Trend</th>
                <th scope="col">Value</th>
                <th scope="col">Weight</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => {
                const dir = direction(h.dayChangePct);
                return (
                  <tr key={h.symbol}>
                    <td>
                      <div className="db-hold">
                        <span className="db-swatch" style={{ background: swatch(i) }} aria-hidden="true" />
                        <div className="db-hold-text">
                          <b>{h.symbol}</b>
                          <span>{h.name}</span>
                        </div>
                      </div>
                    </td>
                    <td>{h.shares ?? '—'}</td>
                    <td>{h.price !== null ? formatMoney(h.price, cur) : '—'}</td>
                    <td className={'db-' + dir}>{todayText(h.dayChangePct)}</td>
                    <td className="mid">
                      {h.spark.length > 0 && (
                        <svg width="72" height="20" viewBox="0 0 80 24" aria-hidden="true">
                          <polyline className={'db-spark ' + dir} points={linePoints(h.spark, 80, 24, 2)} />
                        </svg>
                      )}
                    </td>
                    <td>{formatMoney(h.value, cur)}</td>
                    <td className="db-muted">{formatPct(h.weight)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
