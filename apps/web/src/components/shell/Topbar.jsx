import { Bell, Menu } from 'lucide-react';
import { FinancialYearSelector } from '../forms/FinancialYearSelector.jsx';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useUiStore } from '../../stores/uiStore.js';

export function Topbar({ onOpenMobile }) {
  const { user, meta } = useAuth();
  const { financialYear, setFinancialYear } = useUiStore();
  const years = meta?.financialYears || [];

  return (
    <header className="sticky top-0 z-20 flex h-[var(--vda-topbar-height)] items-center justify-between gap-3 border-b border-[var(--vda-border)] bg-[var(--vda-cream)]/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-[var(--vda-border)] bg-[var(--vda-surface)] p-2 lg:hidden"
          onClick={onOpenMobile}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--vda-ink-muted)]">Workspace</p>
          <p className="text-sm font-medium text-[var(--vda-ink)]">India · INR</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {(meta?.app?.demoMode || user?.demoMode) && (
          <span className="rounded border border-[var(--vda-border-strong)] bg-[var(--vda-surface)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--vda-warning)]">
            Demo mode
          </span>
        )}
        <FinancialYearSelector
          value={financialYear}
          options={years}
          onChange={setFinancialYear}
        />
        <button
          type="button"
          className="rounded-md border border-[var(--vda-border)] bg-[var(--vda-surface)] p-2 text-[var(--vda-ink-muted)]"
          aria-label="Notifications"
          title="Notifications — coming in a later phase"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-[var(--vda-ink)] text-sm font-semibold text-[var(--vda-cream)] sm:flex"
          aria-hidden
        >
          {(user?.fullName || 'U').slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
