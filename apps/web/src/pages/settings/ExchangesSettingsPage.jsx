import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusBadge, LoadingState, ErrorState } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';

export function ExchangesSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ apiKey: '', apiSecret: '', label: 'CoinDCX' });
  const [message, setMessage] = useState('');

  const { data: exchanges } = useQuery({
    queryKey: ['exchanges'],
    queryFn: () => apiFetch('/api/exchanges'),
  });

  const { data: connections, isLoading, error, refetch } = useQuery({
    queryKey: ['exchange-connections'],
    queryFn: () => apiFetch('/api/exchanges/connections'),
  });

  const { data: syncRuns } = useQuery({
    queryKey: ['exchange-sync-runs'],
    queryFn: () => apiFetch('/api/exchanges/sync-runs'),
  });

  const connect = useMutation({
    mutationFn: () =>
      apiFetch('/api/exchanges/connections', {
        method: 'POST',
        body: {
          exchangeSlug: 'COINDCX',
          label: form.label,
          apiKey: form.apiKey,
          apiSecret: form.apiSecret,
        },
      }),
    onSuccess: () => {
      setForm({ apiKey: '', apiSecret: '', label: 'CoinDCX' });
      setMessage('CoinDCX connected (read-only). Credentials encrypted at rest.');
      queryClient.invalidateQueries({ queryKey: ['exchange-connections'] });
    },
    onError: (err) => setMessage(err.message),
  });

  const disconnect = useMutation({
    mutationFn: (id) => apiFetch(`/api/exchanges/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-connections'] });
      setMessage('Disconnected — secrets cleared.');
    },
  });

  const sync = useMutation({
    mutationFn: (id) => apiFetch(`/api/exchanges/connections/${id}/sync`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exchange-connections'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-sync-runs'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['tax-center'] });
      queryClient.invalidateQueries({ queryKey: ['tds'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setMessage(
        data.mode === 'inline'
          ? `Sync finished inline (${data.status}).`
          : `Sync queued (${data.jobId}).`,
      );
    },
    onError: (err) => setMessage(err.message),
  });

  const coindcx = (connections?.items || []).find((c) => c.exchange?.slug === 'COINDCX');

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">Exchanges</h1>
        <StatusBadge tone="info">Read-only</StatusBadge>
      </div>
      <p className="text-sm text-[var(--vda-ink-muted)]">
        VDA Ledger never requests withdrawal or trading permissions. API credentials are encrypted
        at rest (AES-256-GCM). Without credentials, use{' '}
        <Link to="/transactions" className="text-[var(--vda-green)]">
          CSV import
        </Link>
        — live data is never fabricated.
      </p>
      <p className="text-xs text-[var(--vda-ink-faint)]">
        <strong>Binance</strong> and other exchanges listed below are <strong>CSV import only</strong>{' '}
        today — no live read-only sync. CoinDCX supports read-only trade sync; deposit/withdrawal gaps
        may appear in sync history — use CSV for those rows.
      </p>

      {message ? (
        <p className="rounded border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      {isLoading ? <LoadingState label="Loading connections…" /> : null}
      {error ? (
        <ErrorState title="Exchanges unavailable" description={error.message} onRetry={refetch} />
      ) : null}

      <section className="scrapbook-panel space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Available adapters
        </h2>
        {(exchanges?.items || []).map((ex) => (
          <div
            key={ex.slug}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vda-border)] py-3 last:border-0"
          >
            <div>
              <p className="font-medium">{ex.name}</p>
              <p className="text-xs text-[var(--vda-ink-muted)]">
                {ex.liveSyncSupported
                  ? 'Live read-only sync when credentials configured'
                  : ex.adapterReady
                    ? 'CSV adapter ready'
                    : 'Planned'}
              </p>
            </div>
            <StatusBadge tone={ex.adapterReady ? 'success' : 'default'}>
              {ex.adapterReady ? 'Adapter ready' : 'Coming soon'}
            </StatusBadge>
          </div>
        ))}
      </section>

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          CoinDCX connection
        </h2>
        {coindcx ? (
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{coindcx.label || 'CoinDCX'}</p>
                <p className="text-xs text-[var(--vda-ink-muted)]">
                  Status: {coindcx.status}
                  {coindcx.lastSyncedAt
                    ? ` · Last sync ${new Date(coindcx.lastSyncedAt).toLocaleString('en-IN')}`
                    : ''}
                </p>
                {coindcx.lastSyncError ? (
                  <p className="mt-1 text-xs text-[var(--vda-terracotta)]">{coindcx.lastSyncError}</p>
                ) : null}
              </div>
              <StatusBadge
                tone={
                  coindcx.status === 'connected'
                    ? 'success'
                    : coindcx.status === 'error'
                      ? 'danger'
                      : 'warning'
                }
              >
                {coindcx.lastSyncStatus || coindcx.status}
              </StatusBadge>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!coindcx.hasCredentials || sync.isPending}
                onClick={() => sync.mutate(coindcx.id)}
                className="rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2 text-white disabled:opacity-50"
              >
                {sync.isPending ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                type="button"
                onClick={() => disconnect.mutate(coindcx.id)}
                className="rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] px-4 py-2"
              >
                Disconnect
              </button>
              <Link to="/reconciliation" className="px-2 py-2 text-[var(--vda-green)]">
                Reconcile →
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--vda-ink-muted)]">No CoinDCX connection yet.</p>
        )}

        <form
          className="mt-5 grid gap-3 border-t border-[var(--vda-border)] pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage('');
            connect.mutate();
          }}
        >
          <p className="text-xs text-[var(--vda-ink-muted)]">
            Paste a CoinDCX <strong>read-only</strong> API key. Keys are validated against live
            `/users/info` before storage.
          </p>
          <label className="text-sm">
            Label
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="mt-1 w-full rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            API key
            <input
              required
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              className="mt-1 w-full rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5 font-mono text-xs"
              autoComplete="off"
            />
          </label>
          <label className="text-sm">
            API secret
            <input
              required
              type="password"
              value={form.apiSecret}
              onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
              className="mt-1 w-full rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5 font-mono text-xs"
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            disabled={connect.isPending}
            className="rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-2 text-sm"
          >
            {connect.isPending ? 'Validating…' : 'Save & connect'}
          </button>
        </form>
      </section>

      <section className="scrapbook-panel p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Sync history
        </h2>
        <p className="mt-1 text-xs text-[var(--vda-ink-faint)]">
          Queue {syncRuns?.queueAvailable ? 'available' : 'inline fallback (Redis optional)'}
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {(syncRuns?.items || []).slice(0, 8).map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap justify-between gap-2 border-b border-[var(--vda-border)] py-2"
            >
              <span>
                <StatusBadge
                  tone={
                    r.status === 'SUCCEEDED'
                      ? 'success'
                      : r.status === 'FAILED'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {r.status}
                </StatusBadge>{' '}
                <span className="text-xs text-[var(--vda-ink-muted)]">
                  {r.summary
                    ? `+${r.summary.inserted || 0} / dup ${r.summary.duplicates || 0}`
                    : r.errorMessage || ''}
                </span>
              </span>
              <span className="text-xs text-[var(--vda-ink-faint)]">
                {new Date(r.startedAt).toLocaleString('en-IN')}
              </span>
            </li>
          ))}
          {!syncRuns?.items?.length ? (
            <li className="text-[var(--vda-ink-muted)]">No sync runs yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
