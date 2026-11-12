// Recharts is large: this file is lazy-loaded (React.lazy) so the main chunk stays small.
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

export default function PortfolioChart({ values, dir, height, id }: { values: number[]; dir: 'up' | 'down'; height: number; id: string }) {
  const data = values.map((value, i) => ({ i, value }));
  const color = dir === 'up' ? 'var(--positive)' : 'var(--negative)';
  const gradient = `pf-${id}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gradient})`} isAnimationActive={false} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
