import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MetricCard, EmptyState, StatusBadge, LoadingState } from '@vda-ledger/ui';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useUiStore } from '../../stores/uiStore.js';
import { apiFetch } from '../../lib/api.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function inr(v) {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(v));
}

export function DashboardPage() {
  const { user, meta } = useAuth();
  const financialYear = useUiStore((s) => s.financialYear);
  const fyLabel =
    meta?.financialYears?.find((f) => f.id === financialYear)?.label ||
    financialYear.replace(/_/g, ' ');

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => apiFetch('/api/portfolio'),
  });

  const { data: txns } = useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: () => apiFetch('/api/transactions?limit=5'),
  });

  const s = portfolio?.summary;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-3xl tracking-tight">
            {greeting()}, {user?.fullName?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Here&apos;s a snapshot of your portfolio and tax position.
          </p>
        </div>
        <StatusBadge tone="info">{fyLabel}</StatusBadge>
      </div>

      {isLoading ? <LoadingState label="Loading portfolio…" /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Portfolio Value"
          value={s?.currentValue != null ? inr(s.currentValue) : '—'}
          hint={s?.priceAvailable === false ? 'Some prices unavailable' : undefined}
        />
        <MetricCard label="Total Invested" value={s ? inr(s.totalInvested) : '—'} />
        <MetricCard
          label="Realized P&L"
          value={s ? inr(s.realizedPnl) : '—'}
          tone={s && Number(s.realizedPnl) >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Unrealized P&L"
          value={s?.unrealizedPnl != null ? inr(s.unrealizedPnl) : 'Price unavailable'}
          tone={
            s?.unrealizedPnl == null
              ? 'default'
              : Number(s.unrealizedPnl) >= 0
                ? 'positive'
                : 'negative'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 shadow-[var(--vda-shadow-sm)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Top holdings
          </h2>
          {portfolio?.holdings?.length ? (
            <ul className="mt-4 space-y-3">
              {portfolio.holdings.slice(0, 4).map((h) => (
                <li key={h.assetSymbol} className="flex items-center justify-between text-sm">
                  <Link to={`/portfolio/${h.assetSymbol}`} className="font-medium text-[var(--vda-green)]">
                    {h.assetSymbol}
                  </Link>
                  <span className="font-mono text-xs">
                    {h.quantity} · {h.priceAvailable ? inr(h.currentValueInr) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No portfolio data yet"
              description="Import CSV or use demo seed. Values are never invented."
              action={
                <Link
                  to="/transactions"
                  className="rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-3 py-2 text-sm text-white"
                >
                  Go to Transactions
                </Link>
              }
            />
          )}
        </section>

        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 shadow-[var(--vda-shadow-sm)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Tax summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ['VDA Income', '—'],
              ['Estimated VDA Tax', '—'],
              ['TDS Already Deducted', '—'],
              ['Estimated Remaining', '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-[var(--vda-border)] pb-2">
                <dt className="text-[var(--vda-ink-soft)]">{k}</dt>
                <dd className="font-[family-name:var(--vda-font-mono)]">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-[var(--vda-ink-muted)]">
            {meta?.disclaimers?.estimatedVdaTax}
          </p>
          <p className="mt-2 text-xs text-[var(--vda-ink-faint)]">Tax engine calculation — Phase 5</p>
          <Link to="/tax" className="mt-4 inline-block text-sm font-medium text-[var(--vda-green)]">
            Open Tax Center →
          </Link>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Recent transactions
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(txns?.items || []).slice(0, 5).map((t) => (
              <li key={t.id} className="flex justify-between gap-2 border-b border-[var(--vda-border)] py-2">
                <Link to={`/transactions/${t.id}`} className="text-[var(--vda-green)]">
                  {t.asset} {t.type}
                </Link>
                <span className="text-xs text-[var(--vda-ink-muted)]">
                  {new Date(t.timestamp).toLocaleDateString('en-IN')}
                </span>
              </li>
            ))}
            {!txns?.items?.length ? (
              <li className="text-[var(--vda-ink-muted)]">No transactions yet.</li>
            ) : null}
          </ul>
        </section>
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Sync status
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>CoinDCX</span>
              <StatusBadge tone="warning">Not connected</StatusBadge>
            </div>
            <div className="flex justify-between">
              <span>CSV import</span>
              <StatusBadge tone="success">Ready</StatusBadge>
            </div>
            <div className="flex justify-between">
              <span>Lot methodology</span>
              <StatusBadge>{portfolio?.methodology || 'FIFO'}</StatusBadge>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
