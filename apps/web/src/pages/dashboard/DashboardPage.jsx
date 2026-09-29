import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MetricCard, EmptyState, StatusBadge, LoadingState, ProfitLoss } from '@vda-ledger/ui';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useUiStore } from '../../stores/uiStore.js';
import { apiFetch } from '../../lib/api.js';
import { formatInr, formatQty, relativeTime } from '../../lib/format.js';
import { ChartCard } from '../../components/charts/ChartCard.jsx';
import { PortfolioPerformanceChart } from '../../components/charts/PortfolioPerformanceChart.jsx';
import { AllocationChart } from '../../components/charts/AllocationChart.jsx';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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
    refetchInterval: 60_000,
  });

  const { data: performance } = useQuery({
    queryKey: ['portfolio-performance'],
    queryFn: () => apiFetch('/api/portfolio/performance?days=120'),
  });

  const { data: txns } = useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: () => apiFetch('/api/transactions?limit=5'),
  });

  const s = portfolio?.summary;

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-2xl tracking-tight sm:text-3xl">
            {greeting()}, {user?.fullName?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Here&apos;s a snapshot of your portfolio and tax position.
          </p>
          {portfolio?.pricesUpdatedSecondsAgo != null ? (
            <p className="mt-1 text-xs text-[var(--vda-ink-faint)]">
              {relativeTime(portfolio.pricesUpdatedSecondsAgo)} · {portfolio.priceSource}
            </p>
          ) : null}
        </div>
        <StatusBadge tone="info">{fyLabel}</StatusBadge>
      </div>

      {isLoading ? <LoadingState label="Loading portfolio…" /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <MetricCard
          label="Portfolio Value"
          value={s?.currentValue != null ? formatInr(s.currentValue) : '—'}
          hint={s?.priceAvailable === false ? 'Some prices unavailable' : undefined}
        />
        <MetricCard label="Total Invested" value={s ? formatInr(s.totalInvested) : '—'} />
        <MetricCard
          label="Realized P&L"
          value={s ? formatInr(s.realizedPnl) : '—'}
          tone={s && Number(s.realizedPnl) >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Unrealized P&L"
          value={s?.unrealizedPnl != null ? formatInr(s.unrealizedPnl) : 'Price unavailable'}
          tone={
            s?.unrealizedPnl == null
              ? 'default'
              : Number(s.unrealizedPnl) >= 0
                ? 'positive'
                : 'negative'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <ChartCard
          title="Portfolio performance"
          subtitle={performance?.methodology || 'Mark-to-market along the ledger timeline'}
        >
          <PortfolioPerformanceChart points={performance?.points || []} />
        </ChartCard>

        <ChartCard title="Tax summary" subtitle="Estimated VDA Tax — Phase 5 engine">
          <dl className="space-y-3 text-sm">
            {[
              ['VDA Income', '—'],
              ['Estimated VDA Tax', '—'],
              ['TDS Already Deducted', '—'],
              ['Estimated Remaining', '—'],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between border-b border-[var(--vda-border)] pb-2"
              >
                <dt className="text-[var(--vda-ink-soft)]">{k}</dt>
                <dd className="font-mono text-xs sm:text-sm">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-[var(--vda-ink-muted)]">
            {meta?.disclaimers?.estimatedVdaTax}
          </p>
          <Link to="/tax" className="mt-4 inline-block text-sm font-medium text-[var(--vda-green)]">
            Open Tax Center →
          </Link>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Asset allocation" className="lg:col-span-1">
          <AllocationChart allocation={portfolio?.allocation || []} height={200} />
        </ChartCard>

        <ChartCard
          title="Top holdings"
          action={
            <Link to="/portfolio" className="text-xs font-medium text-[var(--vda-green)]">
              View all
            </Link>
          }
          className="lg:col-span-1"
        >
          {portfolio?.holdings?.length ? (
            <ul className="space-y-3">
              {portfolio.holdings.slice(0, 5).map((h) => (
                <li key={h.assetSymbol} className="flex items-center justify-between gap-2 text-sm">
                  <Link
                    to={`/portfolio/${h.assetSymbol}`}
                    className="font-medium text-[var(--vda-green)]"
                  >
                    {h.assetSymbol}
                  </Link>
                  <div className="text-right">
                    <p className="font-mono text-xs">{formatQty(h.quantity)}</p>
                    <p className="text-xs text-[var(--vda-ink-muted)]">
                      {h.priceAvailable ? formatInr(h.currentValueInr) : 'Price unavailable'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No holdings yet"
              description="Import CSV or seed demo data."
              action={
                <Link
                  to="/transactions"
                  className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-3 py-2 text-sm text-white"
                >
                  Transactions
                </Link>
              }
            />
          )}
        </ChartCard>

        <ChartCard
          title="Recent transactions"
          action={
            <Link to="/transactions" className="text-xs font-medium text-[var(--vda-green)]">
              Ledger
            </Link>
          }
          className="lg:col-span-1"
        >
          <ul className="space-y-2 text-sm">
            {(txns?.items || []).slice(0, 5).map((t) => (
              <li
                key={t.id}
                className="flex justify-between gap-2 border-b border-[var(--vda-border)] py-2"
              >
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
          {s?.realizedPnl != null ? (
            <p className="mt-4 flex items-center justify-between text-xs text-[var(--vda-ink-muted)]">
              <span>Realized P&amp;L (ledger)</span>
              <ProfitLoss value={Number(s.realizedPnl)} formatted={formatInr(s.realizedPnl)} />
            </p>
          ) : null}
        </ChartCard>
      </div>

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Sync status
        </h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex justify-between gap-2 sm:block">
            <span>CoinDCX</span>
            <StatusBadge tone="warning">Not connected</StatusBadge>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <span>CSV import</span>
            <StatusBadge tone="success">Ready</StatusBadge>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <span>Lots</span>
            <StatusBadge>{portfolio?.methodology || 'FIFO'}</StatusBadge>
          </div>
        </div>
      </section>
    </div>
  );
}
