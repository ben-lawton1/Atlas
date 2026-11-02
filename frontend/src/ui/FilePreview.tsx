import { useMemo, type MouseEvent } from 'react';
import { api, formatWhen } from '../api';
import { renderMarkdown } from '../markdown';
import { navigate } from '../router';
import { useAsync } from '../state';

export function FilePreview({ path }: { path: string }) {
  const state = useAsync(() => api.file(path), path);
  const html = useMemo(
    () => (state.status === 'ok' && state.data.kind === 'markdown' ? renderMarkdown(state.data.content ?? '', path) : ''),
    [state, path],
  );
  const crumbs = path.split('/');

  function onClick(e: MouseEvent<HTMLElement>) {
    const a = (e.target as HTMLElement).closest('a[data-atlas-link]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(a.getAttribute('href') ?? '/');
  }

  return (
    <div className="pane-scroll">
      <header className="pane-head">
        <nav className="crumbs" aria-label="Path" data-testid="preview-path">
          {crumbs.map((c, i) => (
            <span key={i} className={i === crumbs.length - 1 ? 'crumb last' : 'crumb'}>
              {i > 0 && <span className="sep"> / </span>}
              {c}
            </span>
          ))}
        </nav>
        {state.status === 'ok' && (
          <span className="muted" data-testid="preview-modified">Modified {formatWhen(state.data.modifiedAt)}</span>
        )}
      </header>
      <div className="preview">
        {state.status === 'loading' && <p className="muted">Loading…</p>}
        {state.status === 'error' && (
          <p className="notice" role="alert" data-testid="preview-error">
            {state.code === 404 ? 'That file isn’t available in Atlas.' : state.code === 413 ? 'That file is too large to preview.' : `Couldn't load the file: ${state.message}`}
          </p>
        )}
        {state.status === 'ok' && state.data.kind === 'markdown' && (
          // eslint-disable-next-line react/no-danger -- markdown-it runs with html:false
          <article className="markdown" data-testid="preview" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
        )}
        {state.status === 'ok' && state.data.kind === 'text' && (
          <pre className="code" data-testid="preview"><code>{state.data.content}</code></pre>
        )}
        {state.status === 'ok' && state.data.kind === 'unsupported' && (
          <p className="notice" data-testid="preview">No preview for this type of file ({state.data.size.toLocaleString()} bytes).</p>
        )}
      </div>
    </div>
  );
}
