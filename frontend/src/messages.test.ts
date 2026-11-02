import { describe, expect, it } from 'vitest';
import { originOf, parseChalkMessage, toChalk } from './messages';

const O = 'http://localhost:8080';

describe('originOf', () => {
  it('extracts the origin', () => {
    expect(originOf('http://localhost:8080/some/path?x=1')).toBe(O);
    expect(originOf('not a url')).toBeNull();
  });
});

describe('parseChalkMessage', () => {
  it('accepts well-formed messages from the expected origin', () => {
    expect(parseChalkMessage(O, { source: 'chalk', type: 'chalk:ready' }, O)).toEqual({ type: 'chalk:ready' });
    expect(parseChalkMessage(O, { source: 'chalk', type: 'chalk:sidebar', open: true }, O)).toEqual({ type: 'chalk:sidebar', open: true });
    expect(parseChalkMessage(O, { source: 'chalk', type: 'chalk:board', id: 'abc', name: 'N' }, O)).toEqual({ type: 'chalk:board', id: 'abc', name: 'N' });
  });
  it('drops messages from any other origin', () => {
    const msg = { source: 'chalk', type: 'chalk:board', id: 'abc' };
    expect(parseChalkMessage('http://evil.example', msg, O)).toBeNull();
    expect(parseChalkMessage('http://localhost:8081', msg, O)).toBeNull();
    expect(parseChalkMessage('https://localhost:8080', msg, O)).toBeNull();
    expect(parseChalkMessage(O, msg, null)).toBeNull();
  });
  it('drops malformed or foreign payloads', () => {
    expect(parseChalkMessage(O, null, O)).toBeNull();
    expect(parseChalkMessage(O, 'chalk:ready', O)).toBeNull();
    expect(parseChalkMessage(O, { type: 'chalk:ready' }, O)).toBeNull();
    expect(parseChalkMessage(O, { source: 'atlas', type: 'chalk:ready' }, O)).toBeNull();
    expect(parseChalkMessage(O, { source: 'chalk', type: 'chalk:sidebar', open: 'yes' }, O)).toBeNull();
    expect(parseChalkMessage(O, { source: 'chalk', type: 'chalk:board', id: '' }, O)).toBeNull();
    expect(parseChalkMessage(O, { source: 'chalk', type: 'chalk:board', id: 5 }, O)).toBeNull();
    expect(parseChalkMessage(O, { source: 'chalk', type: 'chalk:unknown' }, O)).toBeNull();
  });
});

describe('toChalk', () => {
  it('tags outgoing messages with source atlas', () => {
    expect(toChalk({ type: 'chalk:toggle-sidebar' })).toEqual({ source: 'atlas', type: 'chalk:toggle-sidebar' });
    expect(toChalk({ type: 'chalk:open-board', id: 'x' })).toEqual({ source: 'atlas', type: 'chalk:open-board', id: 'x' });
  });
});
