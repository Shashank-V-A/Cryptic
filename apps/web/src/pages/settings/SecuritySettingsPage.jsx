import { StatusBadge } from '@vda-ledger/ui';

export function SecuritySettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">Security</h1>
        <StatusBadge tone="success">Session cookies</StatusBadge>
      </div>
      <ul className="space-y-3 text-sm text-[var(--vda-ink-soft)]">
        <li className="scrapbook-panel p-4">
          Authentication uses httpOnly session cookies — tokens are not stored in localStorage.
        </li>
        <li className="scrapbook-panel p-4">
          Exchange API secrets are encrypted with AES-256-GCM using ENCRYPTION_KEY.
        </li>
        <li className="scrapbook-panel p-4">
          Rate limiting, Helmet headers, Zod validation, and audit logging are enabled on the API.
        </li>
        <li className="scrapbook-panel p-4">
          CoinDCX passwords are never stored. Trade/withdraw scopes are never requested.
        </li>
      </ul>
    </div>
  );
}
