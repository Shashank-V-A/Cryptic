import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoadingState, ErrorState, MetricCard, StatusBadge } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';

function inr(v) {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(v));
}

export function PortfolioAssetPage() {
  const { asset } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio', asset],
    queryFn: () => apiFetch(`/api/portfolio/${asset}`),
    enabled: Boolean(asset),
  });

  const { data: txns } = useQuery({
    queryKey: ['transactions', { asset }],
    queryFn: () => apiFetch(`/api/transactions?asset=${asset}`),
    enabled: Boolean(asset),
  });

  if (isLoading) return <LoadingState />;
  if (error) {
    return <ErrorState title="Asset not found" description={error.message} onRetry={refetch} />;
  }

  const buys = txns?.items?.filter((t) => t.type === 'BUY') || [];
  const sells = txns?.items?.filter((t) => t.type === 'SELL') || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <Link to="/portfolio" className="text-sm text-[var(--vda-green)]">
          ← Portfolio
        </Link>
        <h1 className="mt-2 font-[family-name:var(--vda-font-display)] text-3xl">{data.assetSymbol}</h1>
        <p className="text-sm text-[var(--vda-ink-muted)]">
          Acquisition lots · {data.methodology}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Quantity" value={data.quantity} />
        <MetricCard label="Average cost" value={inr(data.averageCostInr)} />
        <MetricCard
          label="Current price"
          value={data.priceAvailable ? inr(data.currentPriceInr) : 'Price unavailable'}
        />
        <MetricCard
          label="Unrealized P&L"
          value={data.priceAvailable ? inr(data.unrealizedPnlInr) : '—'}
        />
      </div>

      <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Open acquisition lots
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-[var(--vda-ink-muted)]">
              <tr>
                <th className="py-2 text-left">Acquired</th>
                <th className="py-2 text-left">Remaining</th>
                <th className="py-2 text-left">Unit cost</th>
                <th className="py-2 text-left">FY</th>
                <th className="py-2 text-left">Source txn</th>
              </tr>
            </thead>
            <tbody>
              {data.lots.map((l) => (
                <tr key={l.id} className="border-t border-[var(--vda-border)]">
                  <td className="py-2">{new Date(l.acquiredAt).toLocaleDateString('en-IN')}</td>
                  <td className="py-2 font-mono text-xs">{l.remainingQuantity}</td>
                  <td className="py-2">{inr(l.unitCostInr)}</td>
                  <td className="py-2">{l.financialYear}</td>
                  <td className="py-2">
                    <Link className="text-[var(--vda-green)]" to={`/transactions/${l.sourceTransactionId}`}>
                      view
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
          <h2 className="text-sm font-semibold">Buys</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {buys.length === 0 ? <li className="text-[var(--vda-ink-muted)]">None</li> : null}
            {buys.map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <Link to={`/transactions/${t.id}`} className="text-[var(--vda-green)]">
                  {new Date(t.timestamp).toLocaleDateString('en-IN')}
                </Link>
                <span className="font-mono text-xs">{t.quantity}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
          <h2 className="text-sm font-semibold">Sells</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sells.length === 0 ? <li className="text-[var(--vda-ink-muted)]">None</li> : null}
            {sells.map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <Link to={`/transactions/${t.id}`} className="text-[var(--vda-green)]">
                  {new Date(t.timestamp).toLocaleDateString('en-IN')}
                </Link>
                <span className="font-mono text-xs">
                  {t.quantity}
                  {t.realizedPnl != null ? (
                    <StatusBadge tone={Number(t.realizedPnl) >= 0 ? 'success' : 'danger'}>
                      {inr(t.realizedPnl)}
                    </StatusBadge>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
