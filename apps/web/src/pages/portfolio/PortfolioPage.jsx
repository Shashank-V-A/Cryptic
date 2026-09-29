import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MetricCard, LoadingState, ErrorState, EmptyState, ProfitLoss, StatusBadge } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';

function inr(v) {
  if (v === null || v === undefined) return 'Price unavailable';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

function qty(v) {
  if (v == null) return '—';
  return String(v).replace(/\.?0+$/, '') || '0';
}

export function PortfolioPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => apiFetch('/api/portfolio'),
  });

  const recalc = useMutation({
    mutationFn: () => apiFetch('/api/portfolio/recalculate', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
  });

  if (isLoading) return <LoadingState label="Calculating portfolio…" />;
  if (error) {
    return <ErrorState title="Portfolio unavailable" description={error.message} onRetry={refetch} />;
  }

  const s = data.summary;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">Portfolio</h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Lots · {data.methodology} · prices {data.priceSource} · {new Date(data.asOf).toLocaleString('en-IN')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => recalc.mutate()}
          className="rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-2 text-sm"
        >
          {recalc.isPending ? 'Recalculating…' : 'Recalculate lots'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Portfolio value" value={s.currentValue != null ? inr(s.currentValue) : '—'} />
        <MetricCard label="Total invested" value={inr(s.totalInvested)} />
        <MetricCard
          label="Realized P&L"
          value={inr(s.realizedPnl)}
          tone={Number(s.realizedPnl) >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Unrealized P&L"
          value={s.unrealizedPnl != null ? inr(s.unrealizedPnl) : 'Price unavailable'}
          tone={s.unrealizedPnl == null ? 'default' : Number(s.unrealizedPnl) >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Total return"
          value={s.totalReturn != null ? inr(s.totalReturn) : '—'}
        />
      </div>

      {data.holdings?.length === 0 ? (
        <EmptyState
          title="No holdings"
          description="Import transactions or seed demo data to build acquisition lots."
          action={
            <Link to="/transactions" className="rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-3 py-2 text-sm text-white">
              Transactions
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--vda-border)] bg-[var(--vda-paper)] text-xs uppercase tracking-wide text-[var(--vda-ink-muted)]">
              <tr>
                <th className="px-3 py-3">Asset</th>
                <th className="px-3 py-3">Quantity</th>
                <th className="px-3 py-3">Avg cost</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Value</th>
                <th className="px-3 py-3">Unrealized P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((h) => (
                <tr key={h.assetSymbol} className="border-b border-[var(--vda-border)]/70">
                  <td className="px-3 py-3">
                    <Link className="font-medium text-[var(--vda-green)]" to={`/portfolio/${h.assetSymbol}`}>
                      {h.assetSymbol}
                    </Link>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{qty(h.quantity)}</td>
                  <td className="px-3 py-3">{inr(h.averageCostInr)}</td>
                  <td className="px-3 py-3">
                    {h.priceAvailable ? inr(h.currentPriceInr) : <StatusBadge tone="warning">Price unavailable</StatusBadge>}
                  </td>
                  <td className="px-3 py-3">{h.priceAvailable ? inr(h.currentValueInr) : '—'}</td>
                  <td className="px-3 py-3">
                    {h.priceAvailable ? (
                      <ProfitLoss value={Number(h.unrealizedPnlInr)} formatted={inr(h.unrealizedPnlInr)} />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
