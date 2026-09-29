import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  CalendarClock,
  Landmark,
  Receipt,
  FileText,
  FlaskConical,
  Settings,
  Shield,
  Scale,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useUiStore } from '../../stores/uiStore.js';
import { BrandMark } from '../brand/BrandMark.jsx';

const PRIMARY = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/sips', label: 'SIPs', icon: CalendarClock },
  { to: '/tax', label: 'Tax Center', icon: Landmark },
  { to: '/tds', label: 'TDS', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/tax/simulator', label: 'Simulator', icon: FlaskConical },
];

const SECONDARY = [
  { to: '/reconciliation', label: 'Reconciliation', icon: Scale },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/settings/security', label: 'Security', icon: Shield },
];

function NavItem({ to, label, icon: Icon, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-[var(--vda-sidebar-active)] text-white'
            : 'text-[var(--vda-sidebar-text)] hover:bg-[var(--vda-sidebar-hover)]'
        } ${collapsed ? 'justify-center px-2' : ''}`
      }
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      {!collapsed ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </NavLink>
  );
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const panel = (
    <aside
      className={`flex h-full flex-col bg-[var(--vda-sidebar)] text-[var(--vda-sidebar-text)] ${
        collapsed ? 'w-[var(--vda-sidebar-collapsed)]' : 'w-[var(--vda-sidebar-width)]'
      }`}
    >
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center px-2' : ''}`}>
        <BrandMark size={28} invert />
        {!collapsed ? (
          <div>
            <p className="font-[family-name:var(--vda-font-display)] text-lg leading-none text-white">
              VDA Ledger
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--vda-sidebar-muted)]">
              Tax · Portfolio
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 pb-4" aria-label="Primary">
        <div className="space-y-1">
          {PRIMARY.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={onCloseMobile} />
          ))}
        </div>
        <div className="editorial-rule mx-3 opacity-30" />
        <div className="space-y-1">
          {SECONDARY.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={onCloseMobile} />
          ))}
        </div>
      </nav>

      <div className={`border-t border-white/10 p-3 ${collapsed ? 'px-2' : ''}`}>
        <button
          type="button"
          onClick={toggleSidebar}
          className="mb-3 hidden w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-xs text-[var(--vda-sidebar-muted)] hover:bg-[var(--vda-sidebar-hover)] lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed ? <span>Collapse</span> : null}
        </button>

        <div className={`flex items-center gap-3 rounded-md bg-white/5 p-2 ${collapsed ? 'justify-center' : ''}`}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--vda-green)] text-sm font-semibold text-white"
            aria-hidden
          >
            {(user?.fullName || 'U').slice(0, 1).toUpperCase()}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{user?.fullName}</p>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-[var(--vda-sidebar-muted)] hover:text-white"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{panel}</div>
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {panel}
      </div>
    </>
  );
}
