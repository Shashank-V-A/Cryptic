import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoadingState, ErrorState, StatusBadge } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { formatInr } from '../../lib/format.js';

const emptyForm = {
  assetSymbol: 'BTC',
  frequency: 'MONTHLY',
  amountInr: '',
  startDate: new Date().toISOString().slice(0, 10),
  label: '',
};

export function SipsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sips'],
    queryFn: () => apiFetch('/api/sips'),
  });

  const createPlan = useMutation({
    mutationFn: () =>
      apiFetch('/api/sips', {
        method: 'POST',
        body: {
          ...form,
          startDate: new Date(form.startDate).toISOString(),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sips'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err) => setFormError(err.message),
  });

  const pausePlan = useMutation({
    mutationFn: (id) => apiFetch(`/api/sips/${id}/pause`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sips'] }),
  });

  const resumePlan = useMutation({
    mutationFn: (id) => apiFetch(`/api/sips/${id}/resume`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sips'] }),
  });

  const executePlan = useMutation({
    mutationFn: (id) => apiFetch(`/api/sips/${id}/execute-next`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sips'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  if (isLoading) return <LoadingState label="Loading SIP plans…" />;
  if (error) {
    return <ErrorState title="Could not load SIPs" description={error.message} onRetry={refetch} />;
  }

  const items = data?.items || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">SIPs</h1>
        <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
          Manual SIP execution posts BUY ledger entries — separate from automated tax classification.
        </p>
      </div>

      <form
        className="scrapbook-panel grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          createPlan.mutate();
        }}
      >
        <h2 className="sm:col-span-2 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          New plan
        </h2>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--vda-ink-muted)]">Asset</span>
          <select
            value={form.assetSymbol}
            onChange={(e) => setForm((f) => ({ ...f, assetSymbol: e.target.value }))}
            className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
          >
            {['BTC', 'ETH', 'SOL', 'USDT'].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--vda-ink-muted)]">Frequency</span>
          <select
            value={form.frequency}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
            className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--vda-ink-muted)]">Amount (INR)</span>
          <input
            required
            value={form.amountInr}
            onChange={(e) => setForm((f) => ({ ...f, amountInr: e.target.value }))}
            className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
            placeholder="5000"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--vda-ink-muted)]">Start date</span>
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-[var(--vda-ink-muted)]">Label (optional)</span>
          <input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
            placeholder="Monthly BTC DCA"
          />
        </label>
        {formError ? (
          <p className="sm:col-span-2 text-sm text-[var(--vda-negative)]" role="alert">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={createPlan.isPending}
          className="sm:col-span-2 rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-4 py-2.5 text-sm font-medium text-[var(--vda-cream)] disabled:opacity-60"
        >
          {createPlan.isPending ? 'Creating…' : 'Create SIP plan'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Your plans
        </h2>
        {items.length === 0 ? (
          <p className="scrapbook-panel p-4 text-sm text-[var(--vda-ink-muted)]">No SIP plans yet.</p>
        ) : (
          items.map((plan) => (
            <article
              key={plan.id}
              className="scrapbook-panel flex flex-wrap items-start justify-between gap-3 p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-[family-name:var(--vda-font-display)] text-xl">
                    {plan.assetSymbol}
                  </h3>
                  <StatusBadge tone={plan.isActive ? 'success' : 'default'}>
                    {plan.isActive ? 'Active' : 'Paused'}
                  </StatusBadge>
                  <StatusBadge>{plan.frequency}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-[var(--vda-ink-soft)]">
                  {formatInr(plan.amountInr)} · from{' '}
                  {new Date(plan.startDate).toLocaleDateString('en-IN')}
                  {plan.label ? ` · ${plan.label}` : ''}
                </p>
                {plan.recentExecutions?.length ? (
                  <p className="mt-2 text-xs text-[var(--vda-ink-muted)]">
                    Last run {new Date(plan.recentExecutions[0].executedAt).toLocaleString('en-IN')}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={executePlan.isPending}
                  onClick={() => executePlan.mutate(plan.id)}
                  className="rounded-[var(--vda-radius)] border border-[var(--vda-border-strong)] bg-[var(--vda-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-[var(--vda-paper)] disabled:opacity-60"
                >
                  Execute next
                </button>
                {plan.isActive ? (
                  <button
                    type="button"
                    onClick={() => pausePlan.mutate(plan.id)}
                    className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] px-3 py-1.5 text-xs text-[var(--vda-ink-muted)] hover:bg-[var(--vda-paper)]"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => resumePlan.mutate(plan.id)}
                    className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] px-3 py-1.5 text-xs text-[var(--vda-green)] hover:bg-[var(--vda-paper)]"
                  >
                    Resume
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
