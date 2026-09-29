import { useState } from 'react';
import { StatusBadge } from '@vda-ledger/ui';

export function TaxSimulatorPage() {
  const [asset, setAsset] = useState('BTC');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">What-if tax simulator</h1>
        <StatusBadge tone="warning">Simulation only</StatusBadge>
      </div>
      <p className="rounded-[var(--vda-radius)] border border-[var(--vda-terracotta-muted)] bg-[var(--vda-terracotta-muted)]/30 px-4 py-3 text-sm">
        Simulation only. No trade will be executed. Never connected to trading APIs.
      </p>

      <form
        className="grid gap-4 rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 sm:grid-cols-3"
        onSubmit={(e) => e.preventDefault()}
      >
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
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
            placeholder="0.00"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--vda-ink-muted)]">Expected sale price (INR)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
            placeholder="₹"
          />
        </label>
        <button
          type="submit"
          disabled
          className="sm:col-span-3 rounded-[var(--vda-radius)] bg-[var(--vda-ink)]/40 px-4 py-2.5 text-sm font-medium text-[var(--vda-cream)]"
          title="Requires lot engine + tax engine"
        >
          Run simulation — coming in Phase 9
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          'Sale consideration',
          'Estimated acquisition cost',
          'Estimated VDA income',
          'Estimated tax',
          'Estimated TDS',
          'Estimated net proceeds',
        ].map((label) => (
          <div key={label} className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">{label}</p>
            <p className="mt-1 font-[family-name:var(--vda-font-display)] text-xl">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
