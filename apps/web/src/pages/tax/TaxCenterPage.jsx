import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MetricCard, StatusBadge, LoadingState, ErrorState } from '@vda-ledger/ui';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useUiStore } from '../../stores/uiStore.js';
import { apiFetch } from '../../lib/api.js';
import { formatInr } from '../../lib/format.js';
import { FinancialYearSelector } from '../../components/forms/FinancialYearSelector.jsx';

export function TaxCenterPage() {
  const { meta } = useAuth();
  const queryClient = useQueryClient();
  const financialYear = useUiStore((s) => s.financialYear);
  const setFinancialYear = useUiStore((s) => s.setFinancialYear);
  const fyLabel =
    meta?.financialYears?.find((f) => f.id === financialYear)?.label || financialYear;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tax-center', financialYear],
    queryFn: () => apiFetch(`/api/tax?financialYear=${financialYear}`),
  });

  const { data: audit } = useQuery({
    queryKey: ['tax-audit'],
    queryFn: () => apiFetch('/api/tax/audit'),
  });

  const calculate = useMutation({
    mutationFn: () =>
      apiFetch(`/api/tax/${financialYear}/calculate`, {
        method: 'POST',
        body: { payerKind: 'specified_person' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-center', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['tax-audit'] });
      queryClient.invalidateQueries({ queryKey: ['tds'] });
    },
  });

  const s = data?.latestCalculation?.summary;
  const txns = data?.latestCalculation?.transactions || [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-2xl sm:text-3xl">
            Tax Center
          </h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Versioned TaxRuleSet · Estimated VDA Tax (surcharge excluded)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FinancialYearSelector
            value={financialYear}
            options={meta?.financialYears || []}
            onChange={setFinancialYear}
          />
          <StatusBadge tone={data?.ruleSet?.filingReady ? 'success' : 'warning'}>
            {data?.ruleSet?.filingReady ? 'Filing ready' : 'Estimate only'}
          </StatusBadge>
          {data?.calculationStale || data?.latestCalculation?.stale ? (
            <StatusBadge tone="warning">Recalculate needed</StatusBadge>
          ) : null}
        </div>
      </div>

      {isLoading ? <LoadingState label="Loading tax position…" /> : null}
      {error ? (
        <ErrorState title="Tax center unavailable" description={error.message} onRetry={refetch} />
      ) : null}

      <p className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-3 text-sm text-[var(--vda-ink-soft)]">
        <strong>{fyLabel}</strong>
        {data?.ruleSet ? (
          <>
            {' '}
            · Rule {data.ruleSet.id} v{data.ruleSet.version} · scope{' '}
            <code className="text-xs">{data.ruleSet.calculationScope}</code>
          </>
        ) : null}
        . Rates verified against ITD s.115BBH / s.194S. Not Final Total Income-Tax Liability.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => calculate.mutate()}
          disabled={calculate.isPending}
          className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {calculate.isPending ? 'Calculating…' : 'Calculate Estimated VDA Tax'}
        </button>
        <Link
          to={`/tax/${financialYear}`}
          className="rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-2 text-sm"
        >
          FY detail
        </Link>
        <Link
          to="/tds"
          className="rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-2 text-sm"
        >
          TDS
        </Link>
      </div>

      {calculate.isError ? (
        <p className="text-sm text-[var(--vda-danger)]">{calculate.error.message}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <MetricCard
          label="VDA Sale Consideration"
          value={s?.saleConsiderationInr != null ? formatInr(s.saleConsiderationInr) : '—'}
        />
        <MetricCard
          label="Acquisition Cost"
          value={s?.acquisitionCostInr != null ? formatInr(s.acquisitionCostInr) : '—'}
          hint="Cost of acquisition only"
        />
        <MetricCard
          label="VDA Income"
          value={s?.vdaIncomeInr != null ? formatInr(s.vdaIncomeInr) : '—'}
          hint="Positive transfer income only"
        />
        <MetricCard
          label="Estimated VDA Tax"
          value={s?.estimatedVdaTaxInr != null ? formatInr(s.estimatedVdaTaxInr) : '—'}
          hint="30% + 4% HEC · no surcharge"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="scrapbook-panel p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            TDS summary
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-[var(--vda-border)] py-2">
              <dt>TDS Already Deducted</dt>
              <dd className="font-mono text-xs sm:text-sm">
                {s?.tdsDeductedInr != null
                  ? formatInr(s.tdsDeductedInr)
                  : data?.tdsDeductedInr
                    ? formatInr(data.tdsDeductedInr)
                    : '—'}
              </dd>
            </div>
            <div className="flex justify-between border-b border-[var(--vda-border)] py-2">
              <dt>Estimated Remaining</dt>
              <dd className="font-mono text-xs sm:text-sm">
                {s?.estimatedRemainingInr != null ? formatInr(s.estimatedRemainingInr) : '—'}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt>Cess (in estimate)</dt>
              <dd className="font-mono text-xs sm:text-sm">
                {s?.cessInr != null ? formatInr(s.cessInr) : '—'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--vda-ink-muted)]">{meta?.disclaimers?.estimatedVdaTax}</p>
        </section>

        <section className="scrapbook-panel p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Official sources
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--vda-ink-soft)]">
            <li>
              <a
                className="text-[var(--vda-green)]"
                href="https://www.incometaxindia.gov.in/w/section-115bbh"
                target="_blank"
                rel="noreferrer"
              >
                s.115BBH — Tax on income from VDA
              </a>
            </li>
            <li>
              <a
                className="text-[var(--vda-green)]"
                href="https://www.incometaxindia.gov.in/w/section-194s-4"
                target="_blank"
                rel="noreferrer"
              >
                s.194S — TDS on VDA transfer
              </a>
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-[var(--vda-ink-muted)]">
            {data?.ruleSet?.officialSourceNotes}
          </p>
        </section>
      </div>

      <section className="scrapbook-panel p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Transaction-level tax
          </h2>
          <span className="text-xs text-[var(--vda-ink-faint)]">
            {data?.latestCalculation
              ? `Calc ${new Date(data.latestCalculation.calculationTimestamp).toLocaleString('en-IN')}`
              : 'Run calculate to populate'}
          </span>
        </div>
        {txns.length === 0 ? (
          <p className="text-sm text-[var(--vda-ink-muted)]">
            No taxable transfers in this calculation yet. Import sells or load demo data, then
            calculate.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--vda-ink-muted)]">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Asset</th>
                  <th className="py-2 pr-3">Consideration</th>
                  <th className="py-2 pr-3">Cost</th>
                  <th className="py-2 pr-3">Income</th>
                  <th className="py-2 pr-3">Est. tax</th>
                  <th className="py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.transactionId} className="border-t border-[var(--vda-border)]">
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {t.timestamp
                        ? new Date(t.timestamp).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-3">{t.asset}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {formatInr(t.considerationInr)}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {formatInr(t.acquisitionCostInr)}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {formatInr(t.taxableIncomeInr)}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {formatInr(t.estimatedTaxInr)}
                    </td>
                    <td className="py-2.5">
                      <Link
                        to={`/tax/why/${t.transactionId}`}
                        className="text-[var(--vda-green)]"
                      >
                        Why?
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Audit trail
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(audit?.items || []).slice(0, 8).map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap justify-between gap-2 border-b border-[var(--vda-border)] py-2"
            >
              <span>
                <StatusBadge>{a.action}</StatusBadge>{' '}
                <span className="text-[var(--vda-ink-muted)]">
                  {a.entityType} {a.entityId?.slice(0, 8)}
                </span>
              </span>
              <span className="text-xs text-[var(--vda-ink-faint)]">
                {new Date(a.createdAt).toLocaleString('en-IN')}
              </span>
            </li>
          ))}
          {!audit?.items?.length ? (
            <li className="text-[var(--vda-ink-muted)]">No tax audit events yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
