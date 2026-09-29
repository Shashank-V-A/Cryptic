import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider.jsx';

export function SettingsPage() {
  const { user, meta } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">Settings</h1>
      <section className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Account
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-[var(--vda-border)] py-2">
            <dt>Name</dt>
            <dd>{user?.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--vda-border)] py-2">
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt>Demo mode</dt>
            <dd>{meta?.app?.demoMode || user?.demoMode ? 'On' : 'Off'}</dd>
          </div>
        </dl>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/settings/exchanges"
          className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 hover:border-[var(--vda-border-strong)]"
        >
          <p className="font-medium">Exchanges</p>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">Read-only connections & CSV</p>
        </Link>
        <Link
          to="/settings/security"
          className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 hover:border-[var(--vda-border-strong)]"
        >
          <p className="font-medium">Security</p>
          <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">Sessions & credential policy</p>
        </Link>
      </div>
    </div>
  );
}
