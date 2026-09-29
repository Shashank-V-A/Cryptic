import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART, formatInr, formatPct } from '../../lib/format.js';

const COLORS = [CHART.green, CHART.terracotta, CHART.greenSoft, '#9a6b2f', '#3d5a6b', '#6b7166'];

export function AllocationChart({ allocation = [], height = 220 }) {
  const data = allocation.map((a) => ({
    name: a.assetSymbol,
    value: Number(a.valueInr),
    pct: Number(a.allocationPct),
  }));

  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-[var(--vda-ink-muted)]">
        Allocation appears when holdings have market prices.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div style={{ width: '100%', height }} className="min-w-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="var(--vda-cream)"
              strokeWidth={2}
              isAnimationActive
              animationDuration={700}
            >
              {data.map((_, i) => (
                <Cell key={data[i].name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--vda-surface)',
                border: '1px solid var(--vda-border)',
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value, _n, item) => [
                `${formatInr(value)} (${formatPct(item.payload.pct)})`,
                item.payload.name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: COLORS[i % COLORS.length] }}
              aria-hidden
            />
            <span className="font-medium">{d.name}</span>
            <span className="text-[var(--vda-ink-muted)]">{formatPct(d.pct)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
