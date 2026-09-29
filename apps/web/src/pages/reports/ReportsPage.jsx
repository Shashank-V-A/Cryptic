import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoadingState, ErrorState, StatusBadge } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useUiStore } from '../../stores/uiStore.js';
import { FinancialYearSelector } from '../../components/forms/FinancialYearSelector.jsx';

const REPORT_TYPES = [
  {
    type: 'CRYPTO_TAX',
    label: 'Crypto Tax Report',
    blurb: 'Estimated VDA Tax, methodology, Schedule VDA, TDS',
  },
  {
    type: 'SCHEDULE_VDA',
    label: 'Schedule VDA Data',
    blurb: 'Official column layout · row-level transaction trail',
  },
  {
    type: 'ITR_READY',
    label: 'ITR-ready Structured Data',
    blurb: 'JSON package for preparation — not certified e-filing',
  },
  {
    type: 'TDS_RECONCILIATION',
    label: 'TDS Reconciliation',
    blurb: 's.194S expected vs recorded',
  },
  {
    type: 'TRANSACTION_LEDGER',
    label: 'Transaction Ledger',
    blurb: 'FY ledger extract',
  },
  {
    type: 'PORTFOLIO',
    label: 'Portfolio Report',
    blurb: 'Holdings, allocation, P&L snapshot',
  },
];

export function ReportsPage() {
  const { meta } = useAuth();
  const queryClient = useQueryClient();
  const financialYear = useUiStore((s) => s.financialYear);
  const setFinancialYear = useUiStore((s) => s.setFinancialYear);
  const [selectedType, setSelectedType] = useState('CRYPTO_TAX');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch('/api/reports'),
  });

  const generate = useMutation({
    mutationFn: () =>
      apiFetch('/api/reports/generate', {
        method: 'POST',
        body: { type: selectedType, financialYear, payerKind: 'specified_person' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['tax-audit'] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-2xl sm:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Downloadable PDF + JSON · every Schedule VDA row traces to a sell / lot allocation
          </p>
        </div>
        <FinancialYearSelector
          value={financialYear}
          options={meta?.financialYears || []}
          onChange={setFinancialYear}
        />
      </div>

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Generate
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((r) => (
            <button
              key={r.type}
              type="button"
              onClick={() => setSelectedType(r.type)}
              className={`rounded-[var(--vda-radius)] border px-3 py-3 text-left text-sm transition ${
                selectedType === r.type
                  ? 'border-[var(--vda-green)] bg-[var(--vda-paper)]'
                  : 'border-[var(--vda-border)] bg-[var(--vda-surface)]'
              }`}
            >
              <span className="font-medium">{r.label}</span>
              <p className="mt-1 text-xs text-[var(--vda-ink-muted)]">{r.blurb}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {generate.isPending ? 'Generating…' : `Generate ${selectedType.replace(/_/g, ' ')}`}
          </button>
          {generate.isSuccess ? (
            <Link
              to={`/reports/${generate.data.id}`}
              className="text-sm text-[var(--vda-green)]"
            >
              Open latest →
            </Link>
          ) : null}
          {generate.isError ? (
            <p className="text-sm text-[var(--vda-terracotta)]">{generate.error.message}</p>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-[var(--vda-ink-muted)]">
          ITR-ready output uses Schedule VDA columns from ITD ITR-2 instructions. It is preparation
          data — not certified e-filing and not Final Total Income-Tax Liability.
        </p>
      </section>

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          History
        </h2>
        {isLoading ? <LoadingState label="Loading reports…" /> : null}
        {error ? (
          <ErrorState title="Reports unavailable" description={error.message} onRetry={refetch} />
        ) : null}
        <ul className="mt-3 space-y-2 text-sm">
          {(data?.items || []).map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--vda-border)] py-2.5"
            >
              <div>
                <Link to={`/reports/${r.id}`} className="font-medium text-[var(--vda-green)]">
                  {r.title}
                </Link>
                <p className="text-xs text-[var(--vda-ink-muted)]">
                  {new Date(r.createdAt).toLocaleString('en-IN')} · {r.transactionCount} linked
                  txns
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={
                    r.status === 'READY'
                      ? 'success'
                      : r.status === 'FAILED'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {r.status}
                </StatusBadge>
                {r.hasPdf && r.status === 'READY' ? (
                  <a
                    href={`/api/reports/${r.id}/download.pdf`}
                    className="text-xs text-[var(--vda-green)]"
                  >
                    PDF
                  </a>
                ) : null}
              </div>
            </li>
          ))}
          {!data?.items?.length && !isLoading ? (
            <li className="text-[var(--vda-ink-muted)]">No reports yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
