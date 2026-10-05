import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingState } from '@vda-ledger/ui';
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx';
import { AppShell } from '../components/shell/AppShell.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';

const LandingPage = lazy(() =>
  import('../pages/landing/LandingPage.jsx').then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() =>
  import('../pages/auth/LoginPage.jsx').then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import('../pages/auth/SignupPage.jsx').then((m) => ({ default: m.SignupPage })),
);
const DashboardPage = lazy(() =>
  import('../pages/dashboard/DashboardPage.jsx').then((m) => ({ default: m.DashboardPage })),
);
const PortfolioPage = lazy(() =>
  import('../pages/portfolio/PortfolioPage.jsx').then((m) => ({ default: m.PortfolioPage })),
);
const PortfolioAssetPage = lazy(() =>
  import('../pages/portfolio/PortfolioAssetPage.jsx').then((m) => ({
    default: m.PortfolioAssetPage,
  })),
);
const TransactionsPage = lazy(() =>
  import('../pages/transactions/TransactionsPage.jsx').then((m) => ({
    default: m.TransactionsPage,
  })),
);
const TransactionDetailPage = lazy(() =>
  import('../pages/transactions/TransactionDetailPage.jsx').then((m) => ({
    default: m.TransactionDetailPage,
  })),
);
const SipsPage = lazy(() =>
  import('../pages/sips/SipsPage.jsx').then((m) => ({ default: m.SipsPage })),
);
const TaxCenterPage = lazy(() =>
  import('../pages/tax/TaxCenterPage.jsx').then((m) => ({ default: m.TaxCenterPage })),
);
const TaxYearPage = lazy(() =>
  import('../pages/tax/TaxYearPage.jsx').then((m) => ({ default: m.TaxYearPage })),
);
const TaxSimulatorPage = lazy(() =>
  import('../pages/tax/TaxSimulatorPage.jsx').then((m) => ({ default: m.TaxSimulatorPage })),
);
const TaxWhyPage = lazy(() =>
  import('../pages/tax/TaxWhyPage.jsx').then((m) => ({ default: m.TaxWhyPage })),
);
const TdsPage = lazy(() =>
  import('../pages/tds/TdsPage.jsx').then((m) => ({ default: m.TdsPage })),
);
const ReconciliationPage = lazy(() =>
  import('../pages/reconciliation/ReconciliationPage.jsx').then((m) => ({
    default: m.ReconciliationPage,
  })),
);
const ReportsPage = lazy(() =>
  import('../pages/reports/ReportsPage.jsx').then((m) => ({ default: m.ReportsPage })),
);
const ReportDetailPage = lazy(() =>
  import('../pages/reports/ReportDetailPage.jsx').then((m) => ({ default: m.ReportDetailPage })),
);
const SettingsPage = lazy(() =>
  import('../pages/settings/SettingsPage.jsx').then((m) => ({ default: m.SettingsPage })),
);
const ExchangesSettingsPage = lazy(() =>
  import('../pages/settings/ExchangesSettingsPage.jsx').then((m) => ({
    default: m.ExchangesSettingsPage,
  })),
);
const SecuritySettingsPage = lazy(() =>
  import('../pages/settings/SecuritySettingsPage.jsx').then((m) => ({
    default: m.SecuritySettingsPage,
  })),
);
const ComingSoonPage = lazy(() =>
  import('../pages/system/ComingSoonPage.jsx').then((m) => ({ default: m.ComingSoonPage })),
);

function CatchAllRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />;
}

function PageFallback() {
  return <LoadingState label="Loading page…" />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/:asset" element={<PortfolioAssetPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transactions/:id" element={<TransactionDetailPage />} />
            <Route path="/sips" element={<SipsPage />} />
            <Route path="/tax" element={<TaxCenterPage />} />
            <Route path="/tax/simulator" element={<TaxSimulatorPage />} />
            <Route path="/tax/why/:transactionId" element={<TaxWhyPage />} />
            <Route path="/tax/:financialYear" element={<TaxYearPage />} />
            <Route path="/tds" element={<TdsPage />} />
            <Route path="/reconciliation" element={<ReconciliationPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/:id" element={<ReportDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/exchanges" element={<ExchangesSettingsPage />} />
            <Route path="/settings/security" element={<SecuritySettingsPage />} />
            <Route path="/coming-soon/:feature" element={<ComingSoonPage />} />
          </Route>
        </Route>

        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </Suspense>
  );
}
