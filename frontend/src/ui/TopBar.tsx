import { Menu, PanelLeft } from 'lucide-react';
import type { AtlasNode, Config } from '../api';
import { GlassPanel } from '@/components/ui/glass';
import { CommandBox } from './CommandBox';
import { TerminalButton } from './terminal/TerminalPanel';

const iconBtn = 'btn icon';

export function TopBar(props: {
  config: Config | null;
  sections: AtlasNode[] | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenDrawer: () => void;
}) {
  return (
    <GlassPanel as="header" variant="bar" className="flex flex-none items-center gap-2 px-3 py-3 min-[761px]:gap-3.5 min-[761px]:px-3.5">
      <button type="button" className={`${iconBtn} drawer-btn`} aria-label="Open navigation" data-testid="drawer-toggle" onClick={props.onOpenDrawer}>
        <Menu aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        className={iconBtn}
        aria-label="Toggle sidebar"
        aria-expanded={props.sidebarOpen}
        title="Sidebar — Ctrl+\"
        data-testid="nav-toggle"
        onClick={props.onToggleSidebar}
      >
        <PanelLeft aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>
      <CommandBox sections={props.sections} />
      <TerminalButton />
      <div className="topbar-chip flex items-center gap-2.5 rounded-pill border border-card-edge bg-row py-1 pl-1 pr-3.5" data-testid="identity">
        <span
          aria-hidden="true"
          className="flex size-9 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f7399,#6a49c4)] text-[0.8125rem] font-bold text-white"
        >
          BL
        </span>
        <span className="who-text flex-col leading-tight">
          <span className="text-[0.8125rem] font-semibold">Ben Lawton</span>
          {props.config && <span className="max-w-40 truncate text-xs text-label-secondary" title="Brain folder">{props.config.brainLabel}</span>}
        </span>
      </div>
    </GlassPanel>
  );
}
