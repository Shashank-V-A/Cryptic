import { useState } from 'react';
import { StatusBadge, LoadingState } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { formatInr } from '../../lib/format.js';
import { useUiStore } from '../../stores/uiStore.js';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { FinancialYearSelector } from '../../components/forms/FinancialYearSelector.jsx';

export function TaxSimulatorPage() {
  const { meta } = useAuth();
  const financialYear = useUiStore((s) => s.financialYear);
  const setFinancialYear = useUiStore((s) => s.setFinancialYear);
  const [asset, setAsset] = useState('BTC');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setSubmitting(true);
    try {
      const data = await apiFetch('/api/tax/simulate', {
        method: 'POST',
        body: {
          assetSymbol: asset,
          quantity,
          priceInr: price,
          financialYear,
        },
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Simulation failed');
    } finally {
      setSubmitting(false);
    }
  }

  const metrics = result
    ? [
        { label: 'Sale consideration', value: result.saleConsiderationInr },
        { label: 'Estimated acquisition cost', value: result.acquisitionCostInr },
        { label: 'Estimated VDA income', value: result.vdaIncomeInr },
        { label: 'Estimated tax', value: result.estimatedTaxInr },
        { label: 'Estimated TDS', value: result.estimatedTdsInr },
        { label: 'Estimated net proceeds', value: result.estimatedNetProceedsInr },
      ]
    : [
        { label: 'Sale consideration', value: null },
        { label: 'Estimated acquisition cost', value: null },
        { label: 'Estimated VDA income', value: null },
        { label: 'Estimated tax', value: null },
        { label: 'Estimated TDS', value: null },
        { label: 'Estimated net proceeds', value: null },
      ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">What-if tax simulator</h1>
        <StatusBadge tone="warning">Simulation only</StatusBadge>
      </div>
      <p className="rounded-[var(--vda-radius)] border border-[var(--vda-terracotta-muted)] bg-[var(--vda-terracotta-muted)]/30 px-4 py-3 text-sm">
        Simulation only. Uses your open FIFO lots — nothing is persisted. Never connected to trading APIs.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <FinancialYearSelector
          value={financialYear}
          options={meta?.financialYears || []}
          onChange={setFinancialYear}
        />
      </div>

      <form className="scrapbook-panel grid gap-4 p-5 sm:grid-cols-3" onSubmit={onSubmit}>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--vda-ink-muted)]">Asset</span>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
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
          <span className="mb-1 block text-[var(--vda-ink-muted)]">Quantity</span>
          <input
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
            placeholder="0.00"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--vda-ink-muted)]">Expected sale price (INR)</span>
          <input
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
            placeholder="₹"
          />
        </label>
        {error ? (
          <p className="sm:col-span-3 text-sm text-[var(--vda-negative)]" role="alert">
            {error}
          </p>
        ) : null}
        {result?.missingCostBasis ? (
          <p className="sm:col-span-3 text-sm text-[var(--vda-warning)]">
            No open lots for this asset — acquisition cost assumed zero.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="sm:col-span-3 rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-4 py-2.5 text-sm font-medium text-[var(--vda-cream)] disabled:opacity-60"
        >
          {submitting ? 'Running…' : 'Run simulation'}
        </button>
      </form>

      {submitting ? <LoadingState label="Computing FIFO + tax…" /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] p-4"
          >
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">{label}</p>
            <p className="mt-1 font-[family-name:var(--vda-font-display)] text-xl">
              {value != null ? formatInr(value) : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
