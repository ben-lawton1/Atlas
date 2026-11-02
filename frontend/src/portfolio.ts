export const RANGES = ['1D', '1W', '1M', '1Y', 'ALL'] as const;
export type Range = (typeof RANGES)[number];
export type Change = { amount: number; pct: number };
export type Holding = {
  symbol: string;
  name: string;
  shares: number | null;
  price: number | null;
  dayChangePct: number | null;
  value: number;
  spark: number[];
};
export type PortfolioFeed = {
  connected: boolean;
  sources: string[];
  asOf: string | null;
  currency: string;
  range: Range;
  total: number | null;
  dayChange: Change | null;
  totalChange: Change | null;
  history: { t: string; value: number }[];
  holdings: Holding[];
};

export function formatMoney(n: number, currency = 'USD'): string {
  const s = Math.abs(n).toLocaleString('en-US', { style: 'currency', currency });
  return n < 0 && Math.round(Math.abs(n) * 100) > 0 ? `-${s}` : s;
}

export function formatPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export type Dir = 'up' | 'down' | 'flat';

export function direction(n: number | null): Dir {
  if (!n) return 'flat';
  return n > 0 ? 'up' : 'down';
}

export function formatChange(c: Change, currency = 'USD'): { text: string; dir: Dir } {
  const dir = direction(c.amount);
  const body = `${formatMoney(Math.abs(c.amount), currency)} (${formatPct(Math.abs(c.pct), 2)})`;
  const mark = dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '';
  return { text: mark + body, dir };
}

export function withWeights(holdings: Holding[]): (Holding & { weight: number })[] {
  const total = holdings.reduce((sum, h) => sum + h.value, 0);
  return holdings
    .map((h) => ({ ...h, weight: total > 0 ? (h.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function linePoints(values: number[], width: number, height: number, pad = 2): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const inner = height - pad * 2;
  const y = (v: number) => (span === 0 ? height / 2 : pad + (1 - (v - min) / span) * inner);
  if (values.length === 1) return `0,${r1(y(values[0]))} ${r1(width)},${r1(y(values[0]))}`;
  return values
    .map((v, i) => `${r1((i / (values.length - 1)) * width)},${r1(y(v))}`)
    .join(' ');
}

export function areaPoints(values: number[], width: number, height: number, pad = 2): string {
  const line = linePoints(values, width, height, pad);
  return line ? `${line} ${width},${height} 0,${height}` : '';
}
