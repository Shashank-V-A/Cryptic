import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoadingState, ErrorState, StatusBadge } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--vda-border)] py-2 text-sm">
      <dt className="text-[var(--vda-ink-muted)]">{label}</dt>
      <dd className="text-right font-mono text-xs sm:text-sm">{value ?? '—'}</dd>
    </div>
  );
}

export function TransactionDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => apiFetch(`/api/transactions/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading) return <LoadingState label="Loading transaction…" />;
  if (error) {
    return <ErrorState title="Transaction not found" description={error.message} onRetry={refetch} />;
  }

  const n = data.normalized;

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
      <div>
        <Link to="/transactions" className="text-sm text-[var(--vda-green)]">
          ← Transactions
        </Link>
        <h1 className="mt-2 font-[family-name:var(--vda-font-display)] text-3xl">
          {n.asset} · {n.type}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge>{n.status}</StatusBadge>
          {data.metadata?.needsReview ? (
            <StatusBadge tone="review">Review Required</StatusBadge>
          ) : null}
        </div>
      </div>

      <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--vda-ink-muted)]">
          Normalized transaction
        </h2>
        <dl className="mt-3">
          <Row label="Timestamp" value={new Date(n.timestamp).toLocaleString('en-IN')} />
          <Row label="Quantity" value={n.quantity} />
          <Row label="Price" value={n.price} />
          <Row label="Gross" value={n.grossValue} />
          <Row label="Fee" value={n.fee} />
          <Row label="Net" value={n.netValue} />
          <Row label="Financial year" value={n.financialYear} />
          <Row label="External ID" value={n.externalTransactionId} />
          <Row label="Source" value={n.source} />
        </dl>
        {data.metadata?.reviewReason ? (
          <p className="mt-3 text-sm text-[var(--vda-warning)]">{data.metadata.reviewReason}</p>
        ) : null}
      </section>

      <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--vda-ink-muted)]">
          Calculation impact
        </h2>
        <dl className="mt-3">
          <Row label="Realized P&L" value={data.calculationImpact.realizedPnlInr} />
        </dl>
        {data.calculationImpact.lotsCreated?.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-medium">Lots created</p>
            <ul className="mt-2 space-y-2 text-xs font-mono">
              {data.calculationImpact.lotsCreated.map((l) => (
                <li key={l.id} className="rounded border border-[var(--vda-border)] bg-[var(--vda-paper)] p-2">
                  rem {l.remainingQuantity} @ {l.unitCostInr} (orig {l.originalQuantity})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.calculationImpact.lotAllocations?.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-medium">Lot allocations (FIFO)</p>
            <ul className="mt-2 space-y-2 text-xs font-mono">
              {data.calculationImpact.lotAllocations.map((a) => (
                <li key={a.id} className="rounded border border-[var(--vda-border)] bg-[var(--vda-paper)] p-2">
                  qty {a.quantity} · cost {a.costBasisInr} · proceeds {a.proceedsInr} · pnl{' '}
                  {a.realizedPnlInr}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--vda-ink-muted)]">
          Tax treatment
        </h2>
        <p className="mt-2 text-sm text-[var(--vda-ink-soft)]">{data.taxTreatment.note}</p>
      </section>

      <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--vda-ink-muted)]">
          Original imported data
        </h2>
        <pre className="mt-3 overflow-x-auto rounded bg-[var(--vda-paper)] p-3 text-xs">
          {JSON.stringify(data.original, null, 2)}
        </pre>
      </section>

      <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 text-sm text-[var(--vda-ink-muted)]">
        <p>Created {new Date(data.audit.createdAt).toLocaleString('en-IN')}</p>
        <p>Updated {new Date(data.audit.updatedAt).toLocaleString('en-IN')}</p>
      </section>
    </div>
  );
}
