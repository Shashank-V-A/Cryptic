import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MetricCard,
  LoadingState,
  ErrorState,
  EmptyState,
  ProfitLoss,
  StatusBadge,
} from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { formatInr, formatQty, formatPct, relativeTime } from '../../lib/format.js';
import { ChartCard } from '../../components/charts/ChartCard.jsx';
import { PortfolioPerformanceChart } from '../../components/charts/PortfolioPerformanceChart.jsx';
import { AllocationChart } from '../../components/charts/AllocationChart.jsx';

export function PortfolioPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => apiFetch('/api/portfolio'),
    refetchInterval: 60_000,
  });

  const { data: performance } = useQuery({
    queryKey: ['portfolio-performance'],
    queryFn: () => apiFetch('/api/portfolio/performance?days=120'),
  });

  const recalc = useMutation({
    mutationFn: () => apiFetch('/api/portfolio/recalculate', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-performance'] });
    },
  });

  if (isLoading) return <LoadingState label="Calculating portfolio…" />;
  if (error) {
    return (
      <ErrorState title="Portfolio unavailable" description={error.message} onRetry={refetch} />
    );
  }

  const s = data.summary;

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-2xl sm:text-3xl">
            Portfolio
          </h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Lots · {data.methodology} · {relativeTime(data.pricesUpdatedSecondsAgo)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => recalc.mutate()}
          className="rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-2 text-sm"
        >
          {recalc.isPending ? 'Recalculating…' : 'Recalculate + snapshot'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 sm:gap-4">
        <MetricCard
          label="Portfolio value"
          value={s.currentValue != null ? formatInr(s.currentValue) : '—'}
        />
        <MetricCard label="Total invested" value={formatInr(s.totalInvested)} />
        <MetricCard
          label="Realized P&L"
          value={formatInr(s.realizedPnl)}
          tone={Number(s.realizedPnl) >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Unrealized P&L"
          value={s.unrealizedPnl != null ? formatInr(s.unrealizedPnl) : 'Price unavailable'}
          tone={
            s.unrealizedPnl == null
              ? 'default'
              : Number(s.unrealizedPnl) >= 0
                ? 'positive'
                : 'negative'
          }
        />
        <MetricCard
          label="Total return"
          value={s.totalReturn != null ? formatInr(s.totalReturn) : '—'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Performance" subtitle="Value vs invested over ledger history">
          <PortfolioPerformanceChart points={performance?.points || []} />
        </ChartCard>
        <ChartCard title="Asset allocation">
          <AllocationChart allocation={data.allocation || []} />
        </ChartCard>
      </div>

      {data.holdings?.length === 0 ? (
        <EmptyState
          title="No holdings"
          description="Import transactions or seed demo data to build acquisition lots."
          action={
            <Link
              to="/transactions"
              className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-3 py-2 text-sm text-white"
            >
              Transactions
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile card stack */}
          <ul className="space-y-3 md:hidden">
            {data.holdings.map((h) => (
              <li key={h.assetSymbol} className="scrapbook-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    className="font-[family-name:var(--vda-font-display)] text-xl text-[var(--vda-green)]"
                    to={`/portfolio/${h.assetSymbol}`}
                  >
                    {h.assetSymbol}
                  </Link>
                  <span className="text-xs text-[var(--vda-ink-muted)]">
                    {h.allocationPct != null ? formatPct(h.allocationPct) : '—'}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--vda-ink-muted)]">Quantity</dt>
                    <dd className="font-mono text-xs">{formatQty(h.quantity)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--vda-ink-muted)]">Value</dt>
                    <dd>{h.priceAvailable ? formatInr(h.currentValueInr) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--vda-ink-muted)]">Avg cost</dt>
                    <dd>{formatInr(h.averageCostInr)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--vda-ink-muted)]">Unrealized</dt>
                    <dd>
                      {h.priceAvailable ? (
                        <ProfitLoss
                          value={Number(h.unrealizedPnlInr)}
                          formatted={formatInr(h.unrealizedPnlInr)}
                        />
                      ) : (
                        <StatusBadge tone="warning">Price unavailable</StatusBadge>
                      )}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] shadow-[var(--vda-shadow-sm)] md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--vda-border)] bg-[var(--vda-paper)] text-xs uppercase tracking-wide text-[var(--vda-ink-muted)]">
                <tr>
                  <th className="px-3 py-3">Asset</th>
                  <th className="px-3 py-3">Quantity</th>
                  <th className="px-3 py-3">Avg cost</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Value</th>
                  <th className="px-3 py-3">Unrealized</th>
                  <th className="px-3 py-3">Alloc</th>
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h) => (
                  <tr key={h.assetSymbol} className="border-b border-[var(--vda-border)]/70">
                    <td className="px-3 py-3">
                      <Link
                        className="font-medium text-[var(--vda-green)]"
                        to={`/portfolio/${h.assetSymbol}`}
                      >
                        {h.assetSymbol}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{formatQty(h.quantity)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatInr(h.averageCostInr)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {h.priceAvailable ? (
                        formatInr(h.currentPriceInr)
                      ) : (
                        <StatusBadge tone="warning">Price unavailable</StatusBadge>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {h.priceAvailable ? formatInr(h.currentValueInr) : '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {h.priceAvailable ? (
                        <span className="inline-flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                          <ProfitLoss
                            value={Number(h.unrealizedPnlInr)}
                            formatted={formatInr(h.unrealizedPnlInr)}
                          />
                          <span className="text-xs text-[var(--vda-ink-muted)]">
                            {formatPct(h.unrealizedPnlPct)}
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--vda-ink-muted)]">
                      {h.allocationPct != null ? formatPct(h.allocationPct) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.warnings?.length > 0 ? (
        <div className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] p-4 text-sm">
          <p className="font-medium">Warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--vda-ink-muted)]">
            {data.warnings.map((w, i) => (
              <li key={`${w.transactionId}-${i}`}>{w.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
