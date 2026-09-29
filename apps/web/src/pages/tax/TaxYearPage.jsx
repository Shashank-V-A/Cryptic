import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MetricCard, LoadingState, ErrorState, StatusBadge } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { formatInr } from '../../lib/format.js';
import { useUiStore } from '../../stores/uiStore.js';
import { useEffect } from 'react';

export function TaxYearPage() {
  const { financialYear } = useParams();
  const setFinancialYear = useUiStore((s) => s.setFinancialYear);

  useEffect(() => {
    if (financialYear) setFinancialYear(financialYear);
  }, [financialYear, setFinancialYear]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tax-center', financialYear],
    queryFn: () => apiFetch(`/api/tax/${financialYear}`),
    enabled: Boolean(financialYear),
  });

  if (isLoading) return <LoadingState label="Loading FY tax…" />;
  if (error) {
    return <ErrorState title="FY unavailable" description={error.message} onRetry={refetch} />;
  }

  const s = data?.latestCalculation?.summary;
  const method = data?.latestCalculation?.output?.methodology;

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in sm:space-y-6">
      <div>
        <Link to="/tax" className="text-sm text-[var(--vda-green)]">
          ← Tax Center
        </Link>
        <h1 className="mt-2 font-[family-name:var(--vda-font-display)] text-3xl">
          {financialYear?.replace(/_/g, ' ')}
        </h1>
        <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
          Rule {data.ruleSet?.id} · engine {data.engineVersion}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        <MetricCard
          label="VDA Income"
          value={s?.vdaIncomeInr != null ? formatInr(s.vdaIncomeInr) : '—'}
        />
        <MetricCard
          label="Estimated VDA Tax"
          value={s?.estimatedVdaTaxInr != null ? formatInr(s.estimatedVdaTaxInr) : '—'}
        />
        <MetricCard
          label="Est. remaining after TDS"
          value={s?.estimatedRemainingInr != null ? formatInr(s.estimatedRemainingInr) : '—'}
        />
      </div>

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Methodology
        </h2>
        {method ? (
          <dl className="mt-3 space-y-3 text-sm">
            {Object.entries(method).map(([k, v]) => (
              <div key={k}>
                <dt className="font-medium capitalize text-[var(--vda-ink)]">{k}</dt>
                <dd className="mt-1 text-[var(--vda-ink-muted)]">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--vda-ink-muted)]">
            Calculate from Tax Center to persist methodology for this year.
          </p>
        )}
        <div className="mt-4">
          <StatusBadge tone="warning">filingReady={String(data.ruleSet?.filingReady)}</StatusBadge>
        </div>
      </section>

      <section className="scrapbook-panel overflow-x-auto p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Taxable transfers
        </h2>
        <table className="mt-3 min-w-full text-sm">
          <thead className="text-xs uppercase text-[var(--vda-ink-muted)]">
            <tr>
              <th className="py-2 pr-3 text-left">Asset</th>
              <th className="py-2 pr-3 text-left">Income</th>
              <th className="py-2 pr-3 text-left">Est. tax</th>
              <th className="py-2 text-left">Explain</th>
            </tr>
          </thead>
          <tbody>
            {(data.latestCalculation?.transactions || []).map((t) => (
              <tr key={t.transactionId} className="border-t border-[var(--vda-border)]">
                <td className="py-2.5 pr-3">{t.asset}</td>
                <td className="py-2.5 pr-3">{formatInr(t.taxableIncomeInr)}</td>
                <td className="py-2.5 pr-3">{formatInr(t.estimatedTaxInr)}</td>
                <td className="py-2.5">
                  <Link to={`/tax/why/${t.transactionId}`} className="text-[var(--vda-green)]">
                    Why am I paying this?
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
