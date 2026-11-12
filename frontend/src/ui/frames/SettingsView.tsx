import { api } from '../../api';
import { useAsync } from '../../state';
import { Card } from '@/components/ui/glass';
import { useConnectors } from '../useConnectors';
import { ViewFrame } from './ViewFrame';

function Row({ name, status, detail, testid }: { name: string; status: string; detail?: string; testid: string }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 rounded-row bg-row px-3 py-2.5" data-testid={testid}>
      <span className="flex min-w-0 flex-col">
        <span className="text-[0.8125rem] font-semibold">{name}</span>
        {detail && <span className="truncate text-xs text-label-secondary">{detail}</span>}
      </span>
      <span className="flex-none text-[0.8125rem] font-semibold text-label-secondary">{status}</span>
    </li>
  );
}

/** Read-only (D44): connection status from the three feeds, system appearance, the terminal bridge address. */
export function SettingsView() {
  const conn = useConnectors();
  const config = useAsync(() => api.config(), 'settings-config');
  return (
    <ViewFrame id="settings" title="Settings" description="Where Atlas gets its data. Nothing here changes yet.">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-4">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-base font-bold text-label-strong">Connectors</h2>
            <span className="text-[0.8125rem] text-label-secondary" data-testid="settings-connectors-count">
              {conn.loading ? 'Checking…' : `${conn.connected} of ${conn.total} connected`}
            </span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {conn.list.map((c) => (
              <Row
                key={c.id}
                testid={`connector-${c.id}`}
                name={c.label}
                status={conn.loading ? 'Checking…' : c.connected ? 'Connected' : 'Not connected'}
                detail={c.connected && c.sources.length > 0 ? c.sources.join(', ') : undefined}
              />
            ))}
            {['Mail', 'Tasks', 'Slack'].map((n) => (
              <Row key={n} testid={`connector-${n.toLowerCase()}`} name={n} status="Not available yet" />
            ))}
          </ul>
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="m-0 text-base font-bold text-label-strong">This computer</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            <Row testid="setting-appearance" name="Appearance" status="Follows your system setting." />
            <Row
              testid="setting-terminal"
              name="Terminal bridge"
              status={config.status === 'ok' ? 'Address' : config.status === 'error' ? 'Unavailable' : 'Checking…'}
              detail={config.status === 'ok' ? config.data.terminalUrl : undefined}
            />
          </ul>
        </Card>
      </div>
    </ViewFrame>
  );
}
