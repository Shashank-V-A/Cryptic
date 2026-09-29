import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function PortfolioPage() {
  return (
    <PhasePlaceholder
      title="Portfolio"
      phase="3"
      description="Holdings table, allocation chart, realized/unrealized P&L, and average acquisition cost will appear once the portfolio engine and price cache are implemented."
      actions={[
        { to: '/transactions', label: 'Transactions' },
        { to: '/dashboard', label: 'Overview' },
      ]}
    />
  );
}
