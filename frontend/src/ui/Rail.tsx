import type { Route } from '../router';
import { linkClick } from '../router';
import { Icon, type IconName } from './icons';

type Item = { id: string; label: string; href: string; icon: IconName; active: (r: Route) => boolean };

const ITEMS: Item[] = [
  { id: 'home', label: 'Home', href: '/', icon: 'home', active: (r) => r.name === 'home' },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: 'calendar', active: (r) => r.name === 'calendar' },
  { id: 'portfolio', label: 'Portfolio', href: '/portfolio', icon: 'trend', active: (r) => r.name === 'portfolio' },
  { id: 'notes', label: 'Notes', href: '/notes', icon: 'notebook', active: (r) => r.name === 'notes' },
  { id: 'brain', label: 'Brain', href: '/atlas', icon: 'brain', active: (r) => r.name === 'atlas' },
];

/** Left navigation (D36). Notes and Brain also reveal the sidebar trees. */
export function Rail({ route, onShowSidebar }: { route: Route; onShowSidebar: () => void }) {
  return (
    <nav className="rail" aria-label="Main" data-testid="rail">
      <a className="rail-brand" href="/" aria-label="Atlas" title="Atlas" onClick={(e) => linkClick(e, '/')}>
        <span className="rail-mark" aria-hidden="true">A</span>
        <span className="rail-name">Atlas</span>
      </a>
      {ITEMS.map((it) => {
        const current = it.active(route);
        return (
          <a
            key={it.id}
            className="rail-item"
            href={it.href}
            aria-label={it.label}
            title={it.label}
            aria-current={current ? 'page' : undefined}
            data-testid={`rail-${it.id}`}
            onClick={(e) => {
              if (it.id === 'notes' || it.id === 'brain') onShowSidebar();
              linkClick(e, it.href);
            }}
          >
            <Icon name={it.icon} size={16} />
            <span className="rail-label">{it.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
