import { describe, expect, it } from 'vitest';
import {
  areaPoints, direction, formatChange, formatMoney, formatPct, linePoints, withWeights, type Holding,
} from './portfolio';

describe('format', () => {
  it('formatMoney', () => {
    expect(formatMoney(32000)).toBe('$32,000.00');
    expect(formatMoney(-1.5)).toBe('-$1.50');
    expect(formatMoney(1234567.891)).toBe('$1,234,567.89');
    expect(formatMoney(0)).toBe('$0.00');
  });
  it('formatPct', () => {
    expect(formatPct(35.6)).toBe('35.6%');
    expect(formatPct(0.04, 2)).toBe('0.04%');
  });
  it('direction', () => {
    expect(direction(null)).toBe('flat');
    expect(direction(0)).toBe('flat');
    expect(direction(2)).toBe('up');
    expect(direction(-2)).toBe('down');
  });
  it('formatChange', () => {
    expect(formatChange({ amount: 13.9, pct: 0.04 })).toEqual({ text: '▲ $13.90 (0.04%)', dir: 'up' });
    expect(formatChange({ amount: -2, pct: -1.25 })).toEqual({ text: '▼ $2.00 (1.25%)', dir: 'down' });
    expect(formatChange({ amount: 0, pct: 0 })).toEqual({ text: '$0.00 (0.00%)', dir: 'flat' });
  });
});

const h = (symbol: string, value: number): Holding => ({ symbol, name: symbol, shares: null, price: null, dayChangePct: null, value, spark: [] });

describe('withWeights', () => {
  it('sorts by value desc and sums to 100', () => {
    const out = withWeights([h('A', 25), h('B', 75)]);
    expect(out.map((x) => x.symbol)).toEqual(['B', 'A']);
    expect(out.map((x) => x.weight)).toEqual([75, 25]);
    expect(out.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(100);
  });
  it('zero total gives zero weights', () => {
    expect(withWeights([h('A', 0), h('B', 0)]).map((x) => x.weight)).toEqual([0, 0]);
    expect(withWeights([])).toEqual([]);
  });
});

describe('linePoints / areaPoints', () => {
  it('empty', () => {
    expect(linePoints([], 100, 50)).toBe('');
    expect(areaPoints([], 100, 50)).toBe('');
  });
  it('single value is a flat line across', () => {
    expect(linePoints([5], 100, 50)).toBe('0,25 100,25');
  });
  it('equal values are a middle line', () => {
    expect(linePoints([3, 3, 3], 100, 50)).toBe('0,25 50,25 100,25');
  });
  it('rising series has first y greater than last y', () => {
    const pts = linePoints([1, 2, 3], 100, 50, 2).split(' ').map((p) => p.split(',').map(Number));
    expect(pts[0]).toEqual([0, 48]);
    expect(pts[2]).toEqual([100, 2]);
    expect(pts[0][1]).toBeGreaterThan(pts[2][1]);
  });
  it('rounds to 1 decimal', () => {
    expect(linePoints([0, 1, 5], 100, 50, 0)).toBe('0,50 50,40 100,0');
    expect(linePoints([0, 1, 2, 3], 100, 50, 0)).toBe('0,50 33.3,33.3 66.7,16.7 100,0');
  });
  it('area closes the polygon', () => {
    expect(areaPoints([1, 2], 100, 50, 0)).toBe('0,50 100,0 100,50 0,50');
  });
});
