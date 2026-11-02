import MarkdownIt from 'markdown-it';
import { atlasHref } from './router';
import { resolveBrainLink } from './links';

// Raw HTML in brain files is never rendered (html: false); markdown-it also refuses javascript: URLs.
const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const tok = tokens[idx];
  const href = tok.attrGet('href') ?? '';
  const target = resolveBrainLink((env as { path: string }).path, href);
  if (target.kind === 'external') {
    tok.attrSet('target', '_blank');
    tok.attrSet('rel', 'noopener noreferrer');
  } else if (target.kind === 'internal') {
    tok.attrSet('href', atlasHref(target.path, target.hash));
    tok.attrSet('data-atlas-link', '1');
  } else if (target.kind === 'none') {
    tok.attrs = (tok.attrs ?? []).filter(([k]) => k !== 'href');
    tok.attrSet('class', 'dead-link');
  }
  return self.renderToken(tokens, idx, options);
};

export function renderMarkdown(source: string, path: string): string {
  return md.render(source, { path });
}
