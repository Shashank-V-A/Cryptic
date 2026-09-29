import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingState, ErrorState, StatusBadge, MetricCard } from '@vda-ledger/ui';
import { apiFetch, downloadApiFile } from '../../lib/api.js';
import { formatInr } from '../../lib/format.js';

export function ReportDetailPage() {
  const { id } = useParams();
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['report', id],
    queryFn: () => apiFetch(`/api/reports/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading) return <LoadingState label="Loading report…" />;
  if (error) {
    return <ErrorState title="Report unavailable" description={error.message} onRetry={refetch} />;
  }

  const p = data.payload || {};
  const summary = p.summary || p.estimatedVdaTax || {};
  const validation = p.scheduleValidation || p.validation;
  const scheduleRows = p.scheduleVda?.rows || [];
  const trail = p.transactionTrail || [];
  const lotWarnings = p.lotWarnings || [];

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in sm:space-y-6">
      <div>
        <Link to="/reports" className="text-sm text-[var(--vda-green)]">
          ← Reports
        </Link>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">{data.title}</h1>
          <StatusBadge
            tone={
              data.status === 'READY' ? 'success' : data.status === 'FAILED' ? 'danger' : 'warning'
            }
          >
            {data.status}
          </StatusBadge>
        </div>
        <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
          {data.financialYear}
          {p.assessmentYear?.label ? ` · ${p.assessmentYear.label}` : ''} ·{' '}
          {new Date(data.createdAt).toLocaleString('en-IN')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {data.status === 'READY' && data.hasPdf ? (
          <button
            type="button"
            disabled={downloading === 'pdf'}
            onClick={async () => {
              setDownloadError('');
              setDownloading('pdf');
              try {
                await downloadApiFile(
                  `/api/reports/${id}/download.pdf`,
                  `vda-ledger-${data.type}-${data.financialYear}.pdf`,
                );
              } catch (err) {
                setDownloadError(err.message || 'PDF download failed');
              } finally {
                setDownloading(null);
              }
            }}
            className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {downloading === 'pdf' ? 'Downloading…' : 'Download PDF'}
          </button>
        ) : null}
        {data.status === 'READY' ? (
          <button
            type="button"
            disabled={downloading === 'json'}
            onClick={async () => {
              setDownloadError('');
              setDownloading('json');
              try {
                await downloadApiFile(
                  `/api/reports/${id}/download.json`,
                  `vda-ledger-${data.type}-${data.financialYear}.json`,
                );
              } catch (err) {
                setDownloadError(err.message || 'JSON download failed');
              } finally {
                setDownloading(null);
              }
            }}
            className="rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-2 text-sm disabled:opacity-60"
          >
            {downloading === 'json' ? 'Downloading…' : 'Download JSON'}
          </button>
        ) : null}
        {downloadError ? (
          <p role="alert" className="text-sm text-[var(--vda-negative)]">
            {downloadError}
          </p>
        ) : null}
      </div>

      {data.status === 'FAILED' ? (
        <section className="scrapbook-panel border-[var(--vda-negative)]/30 p-4 sm:p-5" role="alert">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-negative)]">
            Report failed
          </h2>
          <p className="mt-2 text-sm text-[var(--vda-ink-soft)]">
            {p.error?.message || p.error || 'Generation failed. No downloadable artefacts were produced.'}
          </p>
        </section>
      ) : null}

      {data.status === 'READY' && (summary.estimatedVdaTaxInr || summary.vdaIncomeInr) ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <MetricCard
            label="VDA Income"
            value={summary.vdaIncomeInr != null ? formatInr(summary.vdaIncomeInr) : '—'}
          />
          <MetricCard
            label="Estimated VDA Tax"
            value={
              summary.estimatedVdaTaxInr != null ? formatInr(summary.estimatedVdaTaxInr) : '—'
            }
          />
          <MetricCard
            label="Schedule VDA total"
            value={
              p.scheduleVda?.totalPositiveIncomeInr != null
                ? formatInr(p.scheduleVda.totalPositiveIncomeInr)
                : '—'
            }
          />
          <MetricCard
            label="Linked transactions"
            value={String(data.transactions?.length || 0)}
          />
        </div>
      ) : null}

      {lotWarnings.length ? (
        <section className="scrapbook-panel border-[var(--vda-warning)]/40 p-4 sm:p-5" role="status">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-warning)]">
            Cost-basis gaps
          </h2>
          <p className="mt-1 text-xs text-[var(--vda-ink-muted)]">
            These sells were omitted from Schedule VDA because acquisition lots could not be matched.
            No cost of zero was invented.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--vda-ink-soft)]">
            {lotWarnings.map((w, i) => (
              <li key={i}>{w.message || w}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {validation ? (
        <section className="scrapbook-panel p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Validation
          </h2>
          <p className="mt-2 text-sm">
            <StatusBadge tone={validation.ok ? 'success' : 'danger'}>
              {validation.ok ? 'Passed' : 'Failed'}
            </StatusBadge>{' '}
            <span className="text-[var(--vda-ink-muted)]">
              schema {validation.schemaId || p.scheduleVda?.schema?.id || '—'}
            </span>
          </p>
          {(validation.errors || []).length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--vda-terracotta)]">
              {validation.errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          ) : null}
          {(validation.warnings || []).length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--vda-ink-muted)]">
              {validation.warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {scheduleRows.length ? (
        <section className="scrapbook-panel overflow-x-auto p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Schedule VDA rows
          </h2>
          <table className="mt-3 min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-[var(--vda-ink-muted)]">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Acquired</th>
                <th className="py-2 pr-3">Transferred</th>
                <th className="py-2 pr-3">Cost</th>
                <th className="py-2 pr-3">Consideration</th>
                <th className="py-2 pr-3">Income</th>
                <th className="py-2">Source txn</th>
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((r) => {
                const t = trail.find((x) => x.serialNo === r.serialNo) || r._trace;
                return (
                  <tr key={r.serialNo} className="border-t border-[var(--vda-border)]">
                    <td className="py-2.5 pr-3">{r.serialNo}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{r.dateOfAcquisition}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{r.dateOfTransfer}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {formatInr(r.costOfAcquisitionInr)}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {formatInr(r.considerationReceivedInr)}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {formatInr(r.incomeFromTransferInr)}
                    </td>
                    <td className="py-2.5">
                      {t?.sellTransactionId ? (
                        <Link
                          to={`/transactions/${t.sellTransactionId}`}
                          className="font-mono text-xs text-[var(--vda-green)]"
                        >
                          {t.sellTransactionId.slice(0, 10)}…
                        </Link>
                      ) : (
                        '—'
                      )}
                      {t?.sellTransactionId ? (
                        <>
                          {' · '}
                          <Link
                            to={`/tax/why/${t.sellTransactionId}`}
                            className="text-xs text-[var(--vda-green)]"
                          >
                            Why?
                          </Link>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Linked transactions
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data.transactions || []).map((t) => (
            <li
              key={t.transactionId}
              className="flex flex-wrap justify-between gap-2 border-b border-[var(--vda-border)] py-2"
            >
              <Link to={`/transactions/${t.transactionId}`} className="text-[var(--vda-green)]">
                {t.asset} {t.type}
              </Link>
              <span className="text-xs text-[var(--vda-ink-muted)]">
                {t.timestamp ? new Date(t.timestamp).toLocaleDateString('en-IN') : '—'}
              </span>
            </li>
          ))}
          {!data.transactions?.length ? (
            <li className="text-[var(--vda-ink-muted)]">No linked transactions.</li>
          ) : null}
        </ul>
      </section>

      {(p.disclaimer || p.disclaimers?.report) && (
        <p className="text-xs leading-relaxed text-[var(--vda-ink-muted)]">
          {p.disclaimer || p.disclaimers?.report}
        </p>
      )}
    </div>
  );
}
