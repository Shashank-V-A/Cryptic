import { Link } from 'react-router-dom';
import {
  Briefcase,
  ArrowLeftRight,
  CalendarClock,
  Landmark,
  Receipt,
  FileText,
  FlaskConical,
  Scale,
  Shield,
  Cable,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthProvider.jsx';

const LINKS = [
  {
    to: '/settings/exchanges',
    label: 'Exchanges',
    blurb: 'Read-only CoinDCX sync & CSV',
    icon: Cable,
  },
  {
    to: '/settings/security',
    label: 'Security',
    blurb: 'Sessions & credential policy',
    icon: Shield,
  },
  { to: '/reports', label: 'Reports', blurb: 'PDF, Schedule VDA, ITR-ready', icon: FileText },
  { to: '/reconciliation', label: 'Reconciliation', blurb: 'Balances vs ledger', icon: Scale },
  { to: '/tds', label: 'TDS', blurb: 's.194S expected vs recorded', icon: Receipt },
  { to: '/sips', label: 'SIPs', blurb: 'Recurring plans', icon: CalendarClock },
  { to: '/tax/simulator', label: 'Tax simulator', blurb: 'What-if shell', icon: FlaskConical },
  { to: '/portfolio', label: 'Portfolio', blurb: 'Holdings & allocation', icon: Briefcase },
  { to: '/transactions', label: 'Transactions', blurb: 'Unified ledger', icon: ArrowLeftRight },
  { to: '/tax', label: 'Tax Center', blurb: 'Estimated VDA Tax', icon: Landmark },
];

export function SettingsPage() {
  const { user, meta, logout } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
          Account, connections, and mobile shortcuts to the rest of the app.
        </p>
      </div>

      <section className="scrapbook-panel p-5">
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
            <dd className="break-all">{user?.email}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt>Demo mode</dt>
            <dd>{meta?.app?.demoMode || user?.demoMode ? 'On' : 'Off'}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={logout}
          className="mt-4 rounded-[var(--vda-radius-pill)] border border-[var(--vda-border)] px-4 py-2 text-sm"
        >
          Sign out
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Navigate
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {LINKS.map(({ to, label, blurb, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="scrapbook-panel flex items-start gap-3 p-4 transition hover:border-[var(--vda-border-strong)]"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--vda-green)]" aria-hidden />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="mt-0.5 block text-sm text-[var(--vda-ink-muted)]">{blurb}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
