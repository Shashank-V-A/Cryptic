import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoadingState, ErrorState, StatusBadge } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { formatInr } from '../../lib/format.js';

export function TaxWhyPage() {
  const { transactionId } = useParams();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tax-why', transactionId],
    queryFn: () => apiFetch(`/api/tax/transactions/${transactionId}/why`),
    enabled: Boolean(transactionId),
  });

  if (isLoading) return <LoadingState label="Building explanation…" />;
  if (error) {
    return (
      <ErrorState title="Explanation unavailable" description={error.message} onRetry={refetch} />
    );
  }

  const { explanation, breakdown } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-in sm:space-y-6">
      <div>
        <Link to="/tax" className="text-sm text-[var(--vda-green)]">
          ← Tax Center
        </Link>
        <h1 className="mt-2 font-[family-name:var(--vda-font-display)] text-3xl">
          Why am I paying this?
        </h1>
        <p className="mt-2 text-sm text-[var(--vda-ink-soft)]">{explanation.headline}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge>{breakdown.asset}</StatusBadge>
          <StatusBadge>{breakdown.financialYear}</StatusBadge>
          <StatusBadge tone="info">{explanation.ruleSetId}</StatusBadge>
        </div>
      </div>

      <ol className="space-y-3">
        {explanation.steps.map((step, i) => (
          <li key={step.id} className="scrapbook-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
                  Step {i + 1}
                </p>
                <h2 className="mt-1 font-medium">{step.title}</h2>
              </div>
              {step.amountInr != null ? (
                <p className="font-mono text-sm">{formatInr(step.amountInr)}</p>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--vda-ink-soft)]">{step.detail}</p>
            <p className="mt-3 text-xs text-[var(--vda-ink-muted)]">
              Citation: {step.citation}
              {typeof step.source === 'string' && step.source.startsWith('http') ? (
                <>
                  {' · '}
                  <a
                    href={step.source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--vda-green)]"
                  >
                    Official source
                  </a>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ol>

      <section className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] p-4 text-sm text-[var(--vda-ink-muted)]">
        <p>{explanation.disclaimers.estimatedVdaTax}</p>
        <p className="mt-2">{explanation.disclaimers.notAdvice}</p>
        <Link
          to={`/transactions/${transactionId}`}
          className="mt-3 inline-block text-[var(--vda-green)]"
        >
          View source transaction →
        </Link>
      </section>
    </div>
  );
}
