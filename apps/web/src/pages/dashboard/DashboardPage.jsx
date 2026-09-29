import { Link } from 'react-router-dom';
import { MetricCard, EmptyState, StatusBadge } from '@vda-ledger/ui';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useUiStore } from '../../stores/uiStore.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const { user, meta } = useAuth();
  const financialYear = useUiStore((s) => s.financialYear);
  const fyLabel =
    meta?.financialYears?.find((f) => f.id === financialYear)?.label ||
    financialYear.replace(/_/g, ' ');

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-3xl tracking-tight">
            {greeting()}, {user?.fullName?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Here&apos;s a snapshot of your portfolio and tax position.
          </p>
        </div>
        <StatusBadge tone="info">{fyLabel}</StatusBadge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Portfolio Value" value="—" hint="Awaiting portfolio engine (Phase 3)" />
        <MetricCard label="Total Invested" value="—" hint="From acquisition lots" />
        <MetricCard label="Realized P&L" value="—" hint="Separate from unrealized" />
        <MetricCard label="Unrealized P&L" value="—" hint="Uses latest market prices" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 shadow-[var(--vda-shadow-sm)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Portfolio performance
          </h2>
          <EmptyState
            title="No portfolio data yet"
            description="Import a CoinDCX CSV or seed the demo ledger (Phase 2+) to populate charts. Values are never invented."
            action={
              <Link
                to="/transactions"
                className="rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-3 py-2 text-sm text-[var(--vda-cream)]"
              >
                Go to Transactions
              </Link>
            }
          />
        </section>

        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 shadow-[var(--vda-shadow-sm)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Tax summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ['VDA Income', '—'],
              ['Estimated VDA Tax', '—'],
              ['TDS Already Deducted', '—'],
              ['Estimated Remaining', '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-[var(--vda-border)] pb-2">
                <dt className="text-[var(--vda-ink-soft)]">{k}</dt>
                <dd className="font-[family-name:var(--vda-font-mono)]">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-[var(--vda-ink-muted)]">
            {meta?.disclaimers?.estimatedVdaTax ||
              'Estimated VDA Tax is not Final Total Income-Tax Liability.'}
          </p>
          <Link to="/tax" className="mt-4 inline-block text-sm font-medium text-[var(--vda-green)]">
            Open Tax Center →
          </Link>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Top holdings
          </h2>
          <p className="mt-4 text-sm text-[var(--vda-ink-muted)]">No holdings until ledger data exists.</p>
        </section>
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Recent transactions
          </h2>
          <p className="mt-4 text-sm text-[var(--vda-ink-muted)]">Import CSV to begin the ledger.</p>
        </section>
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Sync status
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>CoinDCX</span>
              <StatusBadge tone="warning">Not connected</StatusBadge>
            </div>
            <div className="flex justify-between">
              <span>CSV import</span>
              <StatusBadge>Ready (Phase 2)</StatusBadge>
            </div>
            <p className="pt-2 text-xs text-[var(--vda-ink-muted)]">
              Live exchange sync is Phase 8. No fabricated connection status.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
