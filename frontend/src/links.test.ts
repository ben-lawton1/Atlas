import { describe, expect, it } from 'vitest';
import { resolveBrainLink } from './links';
import { renderMarkdown } from './markdown';

const from = 'entities/personal/about.md';

describe('resolveBrainLink', () => {
  it('resolves relative .md links against the current file', () => {
    expect(resolveBrainLink(from, '../../pipelines/example.md')).toEqual({ kind: 'internal', path: 'pipelines/example.md', hash: '' });
    expect(resolveBrainLink(from, 'alpha.md')).toEqual({ kind: 'internal', path: 'entities/personal/alpha.md', hash: '' });
    expect(resolveBrainLink(from, './alpha.md')).toEqual({ kind: 'internal', path: 'entities/personal/alpha.md', hash: '' });
    expect(resolveBrainLink(from, '../../pipelines/example.md#top')).toEqual({ kind: 'internal', path: 'pipelines/example.md', hash: '#top' });
    expect(resolveBrainLink(from, 'my%20file.md')).toEqual({ kind: 'internal', path: 'entities/personal/my file.md', hash: '' });
  });
  it('treats non-md relative files as internal too', () => {
    expect(resolveBrainLink(from, '../../modules/demo/run.py')).toMatchObject({ kind: 'internal', path: 'modules/demo/run.py' });
  });
  it('classifies external links and anchors', () => {
    expect(resolveBrainLink(from, 'https://example.com/a.md')).toEqual({ kind: 'external' });
    expect(resolveBrainLink(from, 'mailto:a@b.c')).toEqual({ kind: 'external' });
    expect(resolveBrainLink(from, '//example.com/x')).toEqual({ kind: 'external' });
    expect(resolveBrainLink(from, '#section')).toEqual({ kind: 'anchor' });
  });
  it('refuses links that escape the sections', () => {
    expect(resolveBrainLink(from, '../../../outside.md').kind).toBe('none');
    expect(resolveBrainLink(from, '../../README.md').kind).toBe('none');
    expect(resolveBrainLink(from, '/etc/passwd').kind).toBe('none');
    expect(resolveBrainLink(from, '..\\..\\x.md').kind).toBe('none');
    expect(resolveBrainLink(from, '').kind).toBe('none');
  });
});

describe('renderMarkdown', () => {
  it('rewrites internal links and opens external ones safely', () => {
    const html = renderMarkdown('[p](../../pipelines/example.md#top) [w](https://example.com)', from);
    expect(html).toContain('href="/atlas/pipelines/example.md#top"');
    expect(html).toContain('data-atlas-link="1"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it('does not render raw HTML or javascript: links', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1))', from);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href="javascript:');
  });
  it('linkifies bare URLs as external', () => {
    expect(renderMarkdown('see https://example.com now', from)).toContain('rel="noopener noreferrer"');
  });
});
