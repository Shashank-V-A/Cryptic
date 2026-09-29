import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge, LoadingState, EmptyState, ErrorState } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { useUiStore } from '../../stores/uiStore.js';

const TYPE_FILTERS = [
  'ALL',
  'BUY',
  'SELL',
  'DEPOSIT',
  'WITHDRAWAL',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'FEE',
  'REWARD',
  'SWAP',
  'UNKNOWN',
];

function formatInr(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const financialYear = useUiStore((s) => s.financialYear);
  const [type, setType] = useState('ALL');
  const [q, setQ] = useState('');
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const filters = useMemo(
    () => ({
      type,
      q,
      financialYear: financialYear || undefined,
    }),
    [type, q, financialYear],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.type && filters.type !== 'ALL') params.set('type', filters.type);
      if (filters.q) params.set('q', filters.q);
      if (filters.financialYear) params.set('financialYear', filters.financialYear);
      return apiFetch(`/api/transactions?${params}`);
    },
  });

  const previewMutation = useMutation({
    mutationFn: (body) =>
      apiFetch('/api/imports/csv/preview', { method: 'POST', body }),
    onSuccess: (res) => setPreview(res),
  });

  const confirmMutation = useMutation({
    mutationFn: (previewId) =>
      apiFetch('/api/imports/csv/confirm', { method: 'POST', body: { previewId } }),
    onSuccess: async () => {
      setPreview(null);
      setCsvText('');
      setShowImport(false);
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">Transactions</h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Unified ledger — every number traces back here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2 text-sm font-medium text-white"
          >
            Import CSV
          </button>
          <button
            type="button"
            disabled
            title="Live sync is Phase 8 — not faked"
            className="rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-2 text-sm text-[var(--vda-ink-muted)]"
          >
            Sync Exchange — coming soon
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              type === t
                ? 'bg-[var(--vda-ink)] text-white'
                : 'bg-[var(--vda-surface)] text-[var(--vda-ink-muted)] border border-[var(--vda-border)]'
            }`}
          >
            {t === 'ALL' ? 'All' : t}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search asset, external id, notes…"
        className="w-full max-w-md rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-3 py-2 text-sm"
      />

      {isLoading ? <LoadingState label="Loading ledger…" /> : null}
      {error ? <ErrorState title="Could not load transactions" description={error.message} onRetry={refetch} /> : null}

      {!isLoading && !error && data?.items?.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Import a CSV or use the demo seed (npm run db:seed)."
          action={
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-3 py-2 text-sm text-white"
            >
              Import CSV
            </button>
          }
        />
      ) : null}

      {data?.items?.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] shadow-[var(--vda-shadow-sm)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--vda-border)] bg-[var(--vda-paper)] text-xs uppercase tracking-wide text-[var(--vda-ink-muted)]">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Asset</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Quantity</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Gross</th>
                <th className="px-3 py-3">Fee</th>
                <th className="px-3 py-3">Net</th>
                <th className="px-3 py-3">P&amp;L</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id} className="border-b border-[var(--vda-border)]/70 hover:bg-[var(--vda-paper)]/60">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link to={`/transactions/${t.id}`} className="text-[var(--vda-green)] hover:underline">
                      {new Date(t.timestamp).toLocaleString('en-IN')}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-medium">{t.asset}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={t.type === 'UNKNOWN' ? 'review' : 'default'}>{t.type}</StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{t.quantity}</td>
                  <td className="px-3 py-2.5">{formatInr(t.price)}</td>
                  <td className="px-3 py-2.5">{formatInr(t.grossValue)}</td>
                  <td className="px-3 py-2.5">{formatInr(t.fee)}</td>
                  <td className="px-3 py-2.5">{formatInr(t.netValue)}</td>
                  <td className="px-3 py-2.5">{t.realizedPnl != null ? formatInr(t.realizedPnl) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{t.source}</td>
                  <td className="px-3 py-2.5">
                    {t.needsReview ? (
                      <StatusBadge tone="review">Review Required</StatusBadge>
                    ) : (
                      <StatusBadge tone="success">{t.status}</StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-xs text-[var(--vda-ink-muted)]">{data.total} transactions</p>
        </div>
      ) : null}

      {showImport ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 shadow-[var(--vda-shadow-md)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-[family-name:var(--vda-font-display)] text-xl">Import CSV</h2>
              <button type="button" onClick={() => { setShowImport(false); setPreview(null); }} className="text-sm text-[var(--vda-ink-muted)]">
                Close
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--vda-ink-muted)]">
              Headers: timestamp, asset, type, quantity, price, fee, external_id (CoinDCX-like columns also accepted).
              Original rows are preserved. Duplicates are never inserted.
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={10}
              className="mt-3 w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] p-3 font-mono text-xs"
              placeholder="Paste CSV…"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!csvText || previewMutation.isPending}
                onClick={() =>
                  previewMutation.mutate({ csvText, filename: 'paste.csv' })
                }
                className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {previewMutation.isPending ? 'Parsing…' : 'Preview'}
              </button>
              {preview ? (
                <button
                  type="button"
                  disabled={confirmMutation.isPending || preview.summary.imported + preview.summary.needsReview === 0}
                  onClick={() => confirmMutation.mutate(preview.previewId)}
                  className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-green)] px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {confirmMutation.isPending ? 'Importing…' : 'Confirm import'}
                </button>
              ) : null}
            </div>
            {previewMutation.error ? (
              <p className="mt-2 text-sm text-[var(--vda-negative)]">{previewMutation.error.message}</p>
            ) : null}
            {preview ? (
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  Imported candidates: {preview.summary.imported} · Duplicates:{' '}
                  {preview.summary.duplicates} · Invalid: {preview.summary.invalid} · Needs review:{' '}
                  {preview.summary.needsReview} · Unknown types: {preview.summary.unknownTypes}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
