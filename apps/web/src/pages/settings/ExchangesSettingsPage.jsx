import { StatusBadge } from '@vda-ledger/ui';
import { Link } from 'react-router-dom';

export function ExchangesSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">Exchanges</h1>
        <StatusBadge tone="info">Read-only</StatusBadge>
      </div>
      <p className="text-sm text-[var(--vda-ink-muted)]">
        VDA Ledger never requests withdrawal or trading permissions. API credentials are encrypted at rest.
      </p>

      <div className="space-y-3">
        {[
          { name: 'CoinDCX', status: 'Adapter ready · live sync Phase 8', tone: 'warning' },
          { name: 'CSV Import', status: 'Pipeline Phase 2', tone: 'info' },
          { name: 'Binance', status: 'Planned', tone: 'default' },
          { name: 'Kraken', status: 'Planned', tone: 'default' },
          { name: 'CoinSwitch', status: 'Planned', tone: 'default' },
        ].map((ex) => (
          <div
            key={ex.name}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-4 py-4"
          >
            <div>
              <p className="font-medium">{ex.name}</p>
              <p className="text-xs text-[var(--vda-ink-muted)]">{ex.status}</p>
            </div>
            <StatusBadge tone={ex.tone}>{ex.tone === 'default' ? 'Coming soon' : 'Not connected'}</StatusBadge>
          </div>
        ))}
      </div>

      <p className="text-sm">
        <Link to="/transactions" className="text-[var(--vda-green)]">
          CSV import UI arrives with the Transactions ledger (Phase 2)
        </Link>
      </p>
    </div>
  );
}
