import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoadingState, ErrorState, StatusBadge, MetricCard } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { formatQty } from '../../lib/format.js';

export function ReconciliationPage() {
  const queryClient = useQueryClient();
  const [selectedConnection, setSelectedConnection] = useState('');
  const [activeRunId, setActiveRunId] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});

  const { data: connections } = useQuery({
    queryKey: ['exchange-connections'],
    queryFn: () => apiFetch('/api/exchanges/connections'),
  });

  const { data: history, isLoading, error, refetch } = useQuery({
    queryKey: ['reconciliation'],
    queryFn: () => apiFetch('/api/reconciliation'),
  });

  const { data: detail } = useQuery({
    queryKey: ['reconciliation', activeRunId],
    queryFn: () => apiFetch(`/api/reconciliation/${activeRunId}`),
    enabled: Boolean(activeRunId),
  });

  const run = useMutation({
    mutationFn: () =>
      apiFetch('/api/reconciliation/run', {
        method: 'POST',
        body: { connectionId: selectedConnection || null },
      }),
    onSuccess: (data) => {
      setActiveRunId(data.id);
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
    },
  });

  const saveNotes = useMutation({
    mutationFn: ({ itemId, investigationNotes }) =>
      apiFetch(`/api/reconciliation/${activeRunId}/items/${itemId}`, {
        method: 'PATCH',
        body: { investigationNotes },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation', activeRunId] });
    },
  });

  const latest = detail || history?.items?.[0];
  const connected = (connections?.items || []).filter((c) => c.hasCredentials);

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-2xl sm:text-3xl">
            Reconciliation
          </h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Exchange balances vs ledger · mismatches never auto-corrected
          </p>
        </div>
        <Link to="/settings/exchanges" className="text-sm text-[var(--vda-green)]">
          Exchange settings
        </Link>
      </div>

      <section className="scrapbook-panel flex flex-wrap items-end gap-3 p-4 sm:p-5">
        <label className="text-sm">
          Connection
          <select
            value={selectedConnection}
            onChange={(e) => setSelectedConnection(e.target.value)}
            className="mt-1 block rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5"
          >
            <option value="">Ledger snapshot only</option>
            {connected.map((c) => (
              <option key={c.id} value={c.id}>
                {c.exchange?.name || c.label} ({c.status})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {run.isPending ? 'Running…' : 'Run reconciliation'}
        </button>
        {run.isError ? (
          <p className="text-sm text-[var(--vda-terracotta)]">{run.error.message}</p>
        ) : null}
      </section>

      {isLoading ? <LoadingState label="Loading runs…" /> : null}
      {error ? (
        <ErrorState title="Reconciliation unavailable" description={error.message} onRetry={refetch} />
      ) : null}

      {latest ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <MetricCard label="Assets compared" value={String(latest.summary?.total ?? 0)} />
            <MetricCard label="Mismatches" value={String(latest.summary?.mismatches ?? 0)} />
            <MetricCard label="Reconciled" value={String(latest.summary?.reconciled ?? 0)} />
          </div>

          <section className="scrapbook-panel overflow-x-auto p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
              Results · {new Date(latest.ranAt).toLocaleString('en-IN')}
            </h2>
            <p className="mt-1 text-xs text-[var(--vda-ink-faint)]">{latest.notes}</p>
            <table className="mt-3 min-w-full text-sm">
              <thead className="text-xs uppercase text-[var(--vda-ink-muted)]">
                <tr>
                  <th className="py-2 pr-3 text-left">Asset</th>
                  <th className="py-2 pr-3 text-left">Exchange</th>
                  <th className="py-2 pr-3 text-left">Ledger</th>
                  <th className="py-2 pr-3 text-left">Diff</th>
                  <th className="py-2 pr-3 text-left">Status</th>
                  <th className="py-2 text-left">Investigation</th>
                </tr>
              </thead>
              <tbody>
                {(latest.items || []).map((i) => (
                  <tr key={i.id} className="border-t border-[var(--vda-border)] align-top">
                    <td className="py-2.5 pr-3 font-medium">{i.assetSymbol}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">
                      {formatQty(i.exchangeQuantity)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs">
                      {formatQty(i.ledgerQuantity)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{formatQty(i.difference)}</td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge
                        tone={
                          i.status === 'RECONCILED'
                            ? 'success'
                            : i.status === 'MISMATCH'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {i.status}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5">
                      {i.status === 'MISMATCH' || i.status === 'NEEDS_REVIEW' ? (
                        <div className="flex flex-col gap-1">
                          <textarea
                            rows={2}
                            className="w-full min-w-[12rem] rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1 text-xs"
                            placeholder="Investigation notes…"
                            value={notesDraft[i.id] ?? i.investigationNotes ?? ''}
                            onChange={(e) =>
                              setNotesDraft((d) => ({ ...d, [i.id]: e.target.value }))
                            }
                          />
                          <button
                            type="button"
                            className="self-start text-xs text-[var(--vda-green)]"
                            onClick={() => {
                              setActiveRunId(latest.id);
                              saveNotes.mutate({
                                itemId: i.id,
                                investigationNotes: notesDraft[i.id] ?? i.investigationNotes ?? '',
                              });
                            }}
                          >
                            Save notes
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--vda-ink-faint)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          History
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(history?.items || []).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="text-[var(--vda-green)]"
                onClick={() => setActiveRunId(r.id)}
              >
                {new Date(r.ranAt).toLocaleString('en-IN')}
              </button>
              <span className="ml-2 text-xs text-[var(--vda-ink-muted)]">
                {r.summary?.mismatches || 0} mismatches
              </span>
            </li>
          ))}
          {!history?.items?.length ? (
            <li className="text-[var(--vda-ink-muted)]">No reconciliation runs yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
