import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Menu } from 'lucide-react';
import { FinancialYearSelector } from '../forms/FinancialYearSelector.jsx';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useUiStore } from '../../stores/uiStore.js';
import { apiFetch } from '../../lib/api.js';

export function Topbar({ onOpenMobile }) {
  const { user, meta, refresh } = useAuth();
  const { financialYear, setFinancialYear } = useUiStore();
  const years = meta?.financialYears || [];
  const queryClient = useQueryClient();
  const [demoStatus, setDemoStatus] = useState('idle'); // idle | loading | done | error
  const [demoMessage, setDemoMessage] = useState('');

  const demoEnabled = Boolean(meta?.app?.demoMode || user?.demoMode);

  async function handleLoadDemo() {
    if (demoStatus === 'loading') return;
    setDemoStatus('loading');
    setDemoMessage('');
    try {
      const result = await apiFetch('/api/demo/load', { method: 'POST' });
      await refresh();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio-performance'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio-asset'] }),
        queryClient.invalidateQueries({ queryKey: ['tax-center'] }),
        queryClient.invalidateQueries({ queryKey: ['tds'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
      ]);
      setDemoStatus('done');
      setDemoMessage(
        `Loaded ${result.transactionCount} fictional txs · ${result.holdings?.join(', ') || 'holdings'}`,
      );
      window.setTimeout(() => {
        setDemoStatus('idle');
        setDemoMessage('');
      }, 4000);
    } catch (err) {
      setDemoStatus('error');
      setDemoMessage(err.message || 'Could not load demo ledger');
      window.setTimeout(() => {
        setDemoStatus('idle');
        setDemoMessage('');
      }, 5000);
    }
  }

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
        {demoEnabled ? (
          <div className="relative">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={demoStatus === 'loading'}
              title="Load fictional demo portfolio into this workspace"
              className="rounded border border-[var(--vda-border-strong)] bg-[var(--vda-surface)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--vda-warning)] transition hover:bg-[var(--vda-paper)] disabled:opacity-60"
            >
              {demoStatus === 'loading'
                ? 'Loading…'
                : demoStatus === 'done'
                  ? 'Demo loaded'
                  : demoStatus === 'error'
                    ? 'Demo failed'
                    : 'Demo mode'}
            </button>
            {demoMessage ? (
              <p
                role="status"
                className="absolute right-0 top-full z-30 mt-1 w-56 rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2 py-1.5 text-[10px] font-normal normal-case tracking-normal text-[var(--vda-ink-soft)] shadow-[var(--vda-shadow-sm)]"
              >
                {demoMessage}
              </p>
            ) : null}
          </div>
        ) : null}
        <FinancialYearSelector
          value={financialYear}
          options={years}
          onChange={setFinancialYear}
        />
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-md border border-[var(--vda-border)] bg-[var(--vda-surface)] p-2 text-[var(--vda-ink-faint)] opacity-60"
          aria-label="Notifications unavailable"
          title="Notifications — coming in a later phase"
        >
          <Bell className="h-4 w-4" aria-hidden />
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
