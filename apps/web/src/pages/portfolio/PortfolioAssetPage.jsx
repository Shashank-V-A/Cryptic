import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoadingState, ErrorState, MetricCard, StatusBadge } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { formatInr, formatQty, formatPct, relativeTime } from '../../lib/format.js';
import { ChartCard } from '../../components/charts/ChartCard.jsx';
import { PriceChart } from '../../components/charts/PriceChart.jsx';

export function PortfolioAssetPage() {
  const { asset } = useParams();
  const symbol = String(asset || '').toUpperCase();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio-asset', symbol],
    queryFn: () => apiFetch(`/api/portfolio/${symbol}`),
    enabled: Boolean(symbol),
  });

  if (isLoading) return <LoadingState label="Loading asset…" />;
  if (error) {
    return <ErrorState title="Asset not found" description={error.message} onRetry={refetch} />;
  }

  const buys = (data.transactions || []).filter((t) => t.type === 'BUY');
  const sells = (data.transactions || []).filter((t) => t.type === 'SELL');

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in sm:space-y-6">
      <div>
        <Link to="/portfolio" className="text-sm text-[var(--vda-green)]">
          ← Portfolio
        </Link>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">{data.assetSymbol}</h1>
          <StatusBadge>{data.methodology}</StatusBadge>
        </div>
        <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
          {relativeTime(data.pricesUpdatedSecondsAgo)} · {data.priceSource}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4">
        <MetricCard label="Quantity" value={formatQty(data.quantity)} />
        <MetricCard label="Average cost" value={formatInr(data.averageCostInr)} />
        <MetricCard
          label="Current price"
          value={data.priceAvailable ? formatInr(data.currentPriceInr) : 'Price unavailable'}
        />
        <MetricCard
          label="Realized P&L"
          value={formatInr(data.realizedPnlInr)}
          tone={Number(data.realizedPnlInr) >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Unrealized P&L"
          value={
            data.priceAvailable
              ? `${formatInr(data.unrealizedPnlInr)} (${formatPct(data.unrealizedPnlPct)})`
              : '—'
          }
          tone={
            !data.priceAvailable
              ? 'default'
              : Number(data.unrealizedPnlInr) >= 0
                ? 'positive'
                : 'negative'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Price chart" subtitle="90-day series from price provider (cached)">
          <PriceChart points={data.priceHistory || []} label={`${data.assetSymbol} price`} />
        </ChartCard>
        <ChartCard title="Holding summary">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-[var(--vda-border)] py-2">
              <dt className="text-[var(--vda-ink-muted)]">Current value</dt>
              <dd>{data.priceAvailable ? formatInr(data.currentValueInr) : '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--vda-border)] py-2">
              <dt className="text-[var(--vda-ink-muted)]">Cost basis</dt>
              <dd>{formatInr(data.totalCostInr)}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--vda-border)] py-2">
              <dt className="text-[var(--vda-ink-muted)]">Allocation</dt>
              <dd>{data.allocationPct != null ? formatPct(data.allocationPct) : '—'}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[var(--vda-ink-muted)]">Open lots</dt>
              <dd>{data.lots?.length || 0}</dd>
            </div>
          </dl>
        </ChartCard>
      </div>

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Acquisition lots
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-[var(--vda-ink-muted)]">
              <tr>
                <th className="py-2 pr-3 text-left">Acquired</th>
                <th className="py-2 pr-3 text-left">Remaining</th>
                <th className="py-2 pr-3 text-left">Unit cost</th>
                <th className="py-2 pr-3 text-left">FY</th>
                <th className="py-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {(data.lots || []).map((l) => (
                <tr key={l.id} className="border-t border-[var(--vda-border)]">
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    {new Date(l.acquiredAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{formatQty(l.remainingQuantity)}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">{formatInr(l.unitCostInr)}</td>
                  <td className="py-2.5 pr-3">{l.financialYear}</td>
                  <td className="py-2.5">
                    <Link
                      className="text-[var(--vda-green)]"
                      to={`/transactions/${l.sourceTransactionId}`}
                    >
                      view txn
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.lots?.length ? (
            <p className="py-4 text-sm text-[var(--vda-ink-muted)]">No open lots.</p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="scrapbook-panel p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Buy transactions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {buys.length === 0 ? <li className="text-[var(--vda-ink-muted)]">None</li> : null}
            {buys.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 border-b border-[var(--vda-border)] py-2">
                <Link to={`/transactions/${t.id}`} className="text-[var(--vda-green)]">
                  {new Date(t.timestamp).toLocaleDateString('en-IN')}
                </Link>
                <span className="font-mono text-xs">{formatQty(t.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="scrapbook-panel p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Sell transactions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sells.length === 0 ? <li className="text-[var(--vda-ink-muted)]">None</li> : null}
            {sells.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 border-b border-[var(--vda-border)] py-2">
                <Link to={`/transactions/${t.id}`} className="text-[var(--vda-green)]">
                  {new Date(t.timestamp).toLocaleDateString('en-IN')}
                </Link>
                <span className="font-mono text-xs">{formatQty(t.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
