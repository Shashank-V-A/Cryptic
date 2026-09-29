import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoadingState, ErrorState, StatusBadge, MetricCard } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { formatInr } from '../../lib/format.js';
import { useUiStore } from '../../stores/uiStore.js';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { FinancialYearSelector } from '../../components/forms/FinancialYearSelector.jsx';

export function TdsPage() {
  const { meta } = useAuth();
  const queryClient = useQueryClient();
  const financialYear = useUiStore((s) => s.financialYear);
  const setFinancialYear = useUiStore((s) => s.setFinancialYear);
  const [payerKind, setPayerKind] = useState('specified_person');
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    tdsAmountInr: '',
    saleValueInr: '',
    assetSymbol: '',
    transactionId: '',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tds', financialYear],
    queryFn: () => apiFetch(`/api/tds?financialYear=${financialYear}`),
  });

  const reconcile = useMutation({
    mutationFn: () =>
      apiFetch('/api/tds/reconcile', {
        method: 'POST',
        body: { financialYear, payerKind },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tds', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['tax-audit'] });
    },
  });

  const createRecord = useMutation({
    mutationFn: () =>
      apiFetch('/api/tds/records', {
        method: 'POST',
        body: {
          date: form.date,
          tdsAmountInr: form.tdsAmountInr,
          saleValueInr: form.saleValueInr || null,
          assetSymbol: form.assetSymbol || null,
          transactionId: form.transactionId || null,
          source: 'MANUAL',
          status: 'NEEDS_REVIEW',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tds', financialYear] });
      setForm((f) => ({ ...f, tdsAmountInr: '', saleValueInr: '', transactionId: '' }));
    },
  });

  const expected = reconcile.data?.expected;
  const items = reconcile.data?.reconciliation?.items || [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-2xl sm:text-3xl">TDS</h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            s.194S expected vs recorded · never silently corrected
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FinancialYearSelector
            value={financialYear}
            options={meta?.financialYears || []}
            onChange={setFinancialYear}
          />
          <Link to="/tax" className="text-sm text-[var(--vda-green)]">
            Tax Center
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-[var(--vda-ink-muted)]">Payer kind</span>
          <select
            value={payerKind}
            onChange={(e) => setPayerKind(e.target.value)}
            className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5"
          >
            <option value="specified_person">Specified person (₹50,000)</option>
            <option value="other_person">Other person (₹10,000)</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => reconcile.mutate()}
          disabled={reconcile.isPending}
          className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2 text-white disabled:opacity-60"
        >
          {reconcile.isPending ? 'Reconciling…' : 'Recompute expected TDS'}
        </button>
      </div>

      {expected ? (
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard label="Threshold" value={formatInr(expected.thresholdInr)} />
          <MetricCard label="Total consideration" value={formatInr(expected.totalConsiderationInr)} />
          <MetricCard label="Expected TDS" value={formatInr(expected.totalExpectedTdsInr)} />
        </div>
      ) : null}

      {isLoading ? <LoadingState label="Loading TDS records…" /> : null}
      {error ? (
        <ErrorState title="TDS unavailable" description={error.message} onRetry={refetch} />
      ) : null}

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Recorded TDS
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data?.items || []).map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--vda-border)] py-2"
            >
              <span>
                {new Date(r.date).toLocaleDateString('en-IN')} · {r.assetSymbol || '—'} ·{' '}
                {formatInr(r.tdsAmountInr)}
              </span>
              <StatusBadge
                tone={
                  r.status === 'MATCHED'
                    ? 'success'
                    : r.status === 'NOT_FOUND'
                      ? 'danger'
                      : 'warning'
                }
              >
                {r.status}
              </StatusBadge>
            </li>
          ))}
          {!data?.items?.length ? (
            <li className="text-[var(--vda-ink-muted)]">No TDS records yet.</li>
          ) : null}
        </ul>
      </section>

      {items.length ? (
        <section className="scrapbook-panel overflow-x-auto p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Reconciliation
          </h2>
          <table className="mt-3 min-w-full text-sm">
            <thead className="text-xs uppercase text-[var(--vda-ink-muted)]">
              <tr>
                <th className="py-2 pr-3 text-left">Txn</th>
                <th className="py-2 pr-3 text-left">Expected</th>
                <th className="py-2 pr-3 text-left">Recorded</th>
                <th className="py-2 pr-3 text-left">Diff</th>
                <th className="py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.transactionId} className="border-t border-[var(--vda-border)]">
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    <Link
                      to={`/tax/why/${i.transactionId}`}
                      className="text-[var(--vda-green)]"
                    >
                      {i.transactionId.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">{formatInr(i.expectedTdsInr)}</td>
                  <td className="py-2.5 pr-3">{formatInr(i.recordedTdsInr)}</td>
                  <td className="py-2.5 pr-3">{formatInr(i.differenceInr)}</td>
                  <td className="py-2.5">
                    <StatusBadge>{i.status}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Add TDS record
        </h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createRecord.mutate();
          }}
        >
          <label className="text-sm">
            Date
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1 w-full rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            TDS amount (INR)
            <input
              required
              value={form.tdsAmountInr}
              onChange={(e) => setForm({ ...form, tdsAmountInr: e.target.value })}
              className="mt-1 w-full rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5 font-mono"
            />
          </label>
          <label className="text-sm">
            Sale value (optional)
            <input
              value={form.saleValueInr}
              onChange={(e) => setForm({ ...form, saleValueInr: e.target.value })}
              className="mt-1 w-full rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5 font-mono"
            />
          </label>
          <label className="text-sm">
            Asset
            <input
              value={form.assetSymbol}
              onChange={(e) => setForm({ ...form, assetSymbol: e.target.value.toUpperCase() })}
              className="mt-1 w-full rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Linked transaction ID (optional)
            <input
              value={form.transactionId}
              onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
              className="mt-1 w-full rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5 font-mono text-xs"
            />
          </label>
          <button
            type="submit"
            disabled={createRecord.isPending}
            className="rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-2 text-sm sm:col-span-2"
          >
            {createRecord.isPending ? 'Saving…' : 'Save TDS record'}
          </button>
        </form>
        {createRecord.isError ? (
          <p className="mt-2 text-sm text-[var(--vda-danger)]">{createRecord.error.message}</p>
        ) : null}
      </section>
    </div>
  );
}
