import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART, formatInr } from '../../lib/format.js';

function tipStyle() {
  return {
    background: 'var(--vda-surface)',
    border: '1px solid var(--vda-border)',
    borderRadius: 6,
    fontSize: 12,
  };
}

export function PortfolioPerformanceChart({ points = [], height = 260 }) {
  const data = points
    .filter((p) => p.value != null)
    .map((p) => ({
      date: p.date,
      value: Number(p.value),
      invested: Number(p.invested),
      label: p.date.slice(5),
    }));

  if (!data.length) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-[var(--vda-ink-muted)]">
        Not enough ledger history for a performance chart yet.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="vdaValueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.green} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART.green} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART.muted, fontSize: 11 }}
            axisLine={{ stroke: CHART.grid }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: CHART.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={72}
            tickFormatter={(v) =>
              new Intl.NumberFormat('en-IN', {
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(v)
            }
          />
          <Tooltip
            contentStyle={tipStyle()}
            formatter={(value, name) => [
              formatInr(value),
              name === 'value' ? 'Portfolio value' : 'Invested',
            ]}
            labelFormatter={(l, payload) => payload?.[0]?.payload?.date || l}
          />
          <Area
            type="monotone"
            dataKey="invested"
            stroke={CHART.terracotta}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="transparent"
            name="invested"
            isAnimationActive
            animationDuration={700}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART.green}
            strokeWidth={2}
            fill="url(#vdaValueFill)"
            name="value"
            isAnimationActive
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
