import { Link } from 'react-router-dom';
import { MetricCard, StatusBadge } from '@vda-ledger/ui';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useUiStore } from '../../stores/uiStore.js';

export function TaxCenterPage() {
  const { meta } = useAuth();
  const financialYear = useUiStore((s) => s.financialYear);
  const fyLabel =
    meta?.financialYears?.find((f) => f.id === financialYear)?.label || financialYear;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">Tax Center</h1>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
            Versioned TaxRuleSet calculations — not hard-coded rates in the UI.
          </p>
        </div>
        <StatusBadge tone="warning">Engine Phase 5 · Rules draft</StatusBadge>
      </div>

      <p className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-3 text-sm text-[var(--vda-ink-soft)]">
        Financial year: <strong>{fyLabel}</strong>. Draft rule sets are registered for FY 2025–26 and
        FY 2026–27 and marked for official Income Tax Department verification before production use.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="VDA Sale Consideration" value="—" hint="From taxable sells" />
        <MetricCard label="Acquisition Cost" value="—" hint="From lot allocations" />
        <MetricCard label="VDA Income" value="—" hint="Consideration − cost" />
        <MetricCard label="Estimated VDA Tax" value="—" hint="Not final total liability" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            TDS summary
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              ['TDS Already Deducted', '—'],
              ['TDS Expected', '—'],
              ['Difference', '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-[var(--vda-border)] py-2">
                <dt>{k}</dt>
                <dd className="font-mono">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            Quick actions
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <span className="text-[var(--vda-ink-faint)]">View Transaction Breakdown — Phase 5</span>
            </li>
            <li>
              <span className="text-[var(--vda-ink-faint)]">Download Tax Report — Phase 7</span>
            </li>
            <li>
              <span className="text-[var(--vda-ink-faint)]">Generate Schedule VDA — Phase 7</span>
            </li>
            <li>
              <Link to="/tax/simulator" className="font-medium text-[var(--vda-green)]">
                Open What-if Simulator (UI shell)
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-xs text-[var(--vda-ink-muted)]">
            {meta?.disclaimers?.estimatedVdaTax}
          </p>
        </section>
      </div>
    </div>
  );
}
