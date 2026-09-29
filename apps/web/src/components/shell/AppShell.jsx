import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  CalendarClock,
  Landmark,
  Receipt,
  Scale,
  FileText,
  FlaskConical,
  Settings,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { useUiStore } from '../../stores/uiStore.js';

const MOBILE_NAV = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/transactions', label: 'Txns', icon: ArrowLeftRight },
  { to: '/tax', label: 'Tax', icon: Landmark },
  { to: '/settings', label: 'More', icon: Settings },
];

export function AppShell() {
  const { sidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useUiStore();

  return (
    <div className="min-h-screen bg-[var(--vda-cream)] paper-texture">
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <div
          className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ${
            sidebarCollapsed ? 'lg:ml-[var(--vda-sidebar-collapsed)]' : 'lg:ml-[var(--vda-sidebar-width)]'
          }`}
        >
          <Topbar onOpenMobile={() => setMobileNavOpen(true)} />
          <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--vda-border)] bg-[var(--vda-surface)]/95 backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-1 py-2 text-[10px] ${
                    isActive ? 'text-[var(--vda-green)]' : 'text-[var(--vda-ink-muted)]'
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
    </div>
  );
}

export { Menu, X };
