import { describe, expect, it } from 'vitest';
import { atlasHref, notesHref, parseRoute, routeHref } from './router';

describe('parseRoute', () => {
  it('parses home', () => {
    expect(parseRoute('/')).toEqual({ name: 'home' });
    expect(parseRoute('/whatever')).toEqual({ name: 'home' });
  });
  it('parses atlas paths with decoding', () => {
    expect(parseRoute('/atlas/entities/personal/about.md')).toEqual({ name: 'atlas', path: 'entities/personal/about.md' });
    expect(parseRoute('/atlas/entities/my%20file.md')).toEqual({ name: 'atlas', path: 'entities/my file.md' });
    expect(parseRoute('/atlas')).toEqual({ name: 'atlas', path: null });
    expect(parseRoute('/atlas/')).toEqual({ name: 'atlas', path: null });
  });
  it('parses calendar and portfolio', () => {
    expect(parseRoute('/calendar')).toEqual({ name: 'calendar' });
    expect(parseRoute('/portfolio/')).toEqual({ name: 'portfolio' });
  });
  it('parses notes', () => {
    expect(parseRoute('/notes/D9oZeaWacSE')).toEqual({ name: 'notes', boardId: 'D9oZeaWacSE' });
    expect(parseRoute('/notes')).toEqual({ name: 'notes', boardId: null });
  });
  it('survives malformed escapes', () => {
    expect(parseRoute('/atlas/a%E0%A4%A.md')).toMatchObject({ name: 'atlas' });
  });
});

describe('hrefs', () => {
  it('round-trips', () => {
    for (const path of ['entities/my file.md', 'intake/a#b.md', 'state/schema/001.sql']) {
      expect(parseRoute(atlasHref(path))).toEqual({ name: 'atlas', path });
    }
    expect(parseRoute(notesHref('ab/c d'))).toEqual({ name: 'notes', boardId: 'ab/c d' });
    expect(routeHref({ name: 'home' })).toBe('/');
    expect(routeHref({ name: 'calendar' })).toBe('/calendar');
    expect(routeHref({ name: 'portfolio' })).toBe('/portfolio');
  });
});
