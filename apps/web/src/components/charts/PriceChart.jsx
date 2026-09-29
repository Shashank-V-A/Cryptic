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

export function PriceChart({ points = [], height = 240, label = 'Price' }) {
  const data = points.map((p) => ({
    date: p.date,
    price: Number(p.priceInr),
    label: p.date.slice(5),
  }));

  if (!data.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-[var(--vda-ink-muted)]">
        Price history unavailable
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="vdaPriceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.terracotta} stopOpacity={0.22} />
              <stop offset="100%" stopColor={CHART.terracotta} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART.muted, fontSize: 11 }}
            axisLine={{ stroke: CHART.grid }}
            tickLine={false}
            minTickGap={24}
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
            contentStyle={{
              background: 'var(--vda-surface)',
              border: '1px solid var(--vda-border)',
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value) => [formatInr(value), label]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={CHART.terracotta}
            strokeWidth={2}
            fill="url(#vdaPriceFill)"
            isAnimationActive
            animationDuration={750}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
