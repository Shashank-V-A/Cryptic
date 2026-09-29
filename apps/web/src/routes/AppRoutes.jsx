import { Navigate, Route, Routes } from 'react-router-dom';
import { LandingPage } from '../pages/landing/LandingPage.jsx';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { SignupPage } from '../pages/auth/SignupPage.jsx';
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx';
import { AppShell } from '../components/shell/AppShell.jsx';
import { DashboardPage } from '../pages/dashboard/DashboardPage.jsx';
import { PortfolioPage } from '../pages/portfolio/PortfolioPage.jsx';
import { PortfolioAssetPage } from '../pages/portfolio/PortfolioAssetPage.jsx';
import { TransactionsPage } from '../pages/transactions/TransactionsPage.jsx';
import { TransactionDetailPage } from '../pages/transactions/TransactionDetailPage.jsx';
import { SipsPage } from '../pages/sips/SipsPage.jsx';
import { TaxCenterPage } from '../pages/tax/TaxCenterPage.jsx';
import { TaxYearPage } from '../pages/tax/TaxYearPage.jsx';
import { TaxSimulatorPage } from '../pages/tax/TaxSimulatorPage.jsx';
import { TdsPage } from '../pages/tds/TdsPage.jsx';
import { ReconciliationPage } from '../pages/reconciliation/ReconciliationPage.jsx';
import { ReportsPage } from '../pages/reports/ReportsPage.jsx';
import { ReportDetailPage } from '../pages/reports/ReportDetailPage.jsx';
import { SettingsPage } from '../pages/settings/SettingsPage.jsx';
import { ExchangesSettingsPage } from '../pages/settings/ExchangesSettingsPage.jsx';
import { SecuritySettingsPage } from '../pages/settings/SecuritySettingsPage.jsx';
import { ComingSoonPage } from '../pages/system/ComingSoonPage.jsx';

export function AppRoutes() {
  return (
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
          <Route path="/tax/:financialYear" element={<TaxYearPage />} />
          <Route path="/tds" element={<TdsPage />} />
          <Route path="/reconciliation" element={<ReconciliationPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/exchanges" element={<ExchangesSettingsPage />} />
          <Route path="/settings/security" element={<SecuritySettingsPage />} />
          <Route
            path="/coming-soon/:feature"
            element={<ComingSoonPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
