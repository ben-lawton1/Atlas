import { Brain, CalendarDays, CheckSquare, Compass, FolderKanban, LayoutGrid, MessageSquare, NotebookPen, Settings, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import type { Route } from '../router';
import { linkClick } from '../router';
import { GlassPanel } from '@/components/ui/glass';
import { useConnectors } from './useConnectors';

type Item = { id: string; label: string; href: string; icon: LucideIcon; active: (r: Route) => boolean };

const is = (name: Route['name']) => (r: Route) => r.name === name;
const TODAY: Item[] = [
  { id: 'home', label: 'Home', href: '/', icon: LayoutGrid, active: is('home') },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: CalendarDays, active: is('calendar') },
  { id: 'tasks', label: 'Tasks', href: '/tasks', icon: CheckSquare, active: is('tasks') },
  { id: 'notes', label: 'Notes', href: '/notes', icon: NotebookPen, active: is('notes') },
  { id: 'portfolio', label: 'Portfolio', href: '/portfolio', icon: TrendingUp, active: is('portfolio') },
];
const WORKSPACE: Item[] = [
  { id: 'projects', label: 'Projects', href: '/projects', icon: FolderKanban, active: is('projects') },
  { id: 'messages', label: 'Messages', href: '/messages', icon: MessageSquare, active: is('messages') },
  { id: 'people', label: 'People', href: '/people', icon: Users, active: is('people') },
  { id: 'brain', label: 'Brain', href: '/atlas', icon: Brain, active: is('atlas') },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, active: is('settings') },
];

function Group({ title, items, route, onNavigate, onShowSidebar }: { title: string; items: Item[]; route: Route; onNavigate: () => void; onShowSidebar: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="nav-eyebrow">{title}</span>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <a
            key={it.id}
            className="nav-item"
            href={it.href}
            aria-current={it.active(route) ? 'page' : undefined}
            data-testid={`rail-${it.id}`}
            onClick={(e) => {
              if (it.id === 'brain') onShowSidebar();
              onNavigate();
              linkClick(e, it.href);
            }}
          >
            <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
            <span className="flex-1">{it.label}</span>
          </a>
        );
      })}
    </div>
  );
}

/** Left navigation (D36, D43): glass panel on desktop, a drawer under 760px. */
export function Nav({ route, open, onNavigate, onShowSidebar }: { route: Route; open: boolean; onNavigate: () => void; onShowSidebar: () => void }) {
  const conn = useConnectors();
  return (
    <div className="nav-shell" data-open={open}>
      <GlassPanel as="nav" variant="nav" aria-label="Main" data-testid="rail" className="flex flex-col gap-[22px] overflow-y-auto px-3.5 py-5">
        <a className="flex items-center gap-3 px-2 py-1 text-label no-underline hover:no-underline" href="/" aria-label="Atlas home" onClick={(e) => { onNavigate(); linkClick(e, '/'); }}>
          <span className="flex size-[38px] items-center justify-center rounded-[12px] bg-accent text-on-accent shadow-card" aria-hidden="true">
            <Compass size={20} strokeWidth={2} />
          </span>
          <span className="flex flex-col">
            <span className="text-[0.9375rem] font-bold text-label-strong">Atlas</span>
            <span className="text-xs text-label-secondary">Personal OS</span>
          </span>
        </a>
        <Group title="Today" items={TODAY} route={route} onNavigate={onNavigate} onShowSidebar={onShowSidebar} />
        <Group title="Workspace" items={WORKSPACE} route={route} onNavigate={onNavigate} onShowSidebar={onShowSidebar} />
        <a
          href="/settings"
          data-testid="connectors-card"
          className="mt-auto flex min-h-11 flex-col gap-2.5 rounded-[18px] border border-card-edge bg-row p-3.5 text-label no-underline hover:no-underline"
          onClick={(e) => { onNavigate(); linkClick(e, '/settings'); }}
        >
          <span className="flex justify-between text-[0.8125rem]">
            <span className="font-semibold">Connectors</span>
            <span className="text-label-secondary" data-testid="connectors-count">{conn.loading ? 'Checking…' : `${conn.connected} of ${conn.total} connected`}</span>
          </span>
          <span
            className="h-1.5 rounded-[3px] bg-line-strong"
            role="meter"
            aria-label="Connectors connected"
            aria-valuemin={0}
            aria-valuemax={conn.total}
            aria-valuenow={conn.connected}
          >
            <span className="block h-1.5 rounded-[3px] bg-accent" style={{ width: `${(conn.connected / conn.total) * 100}%` }} />
          </span>
        </a>
      </GlassPanel>
    </div>
  );
}
