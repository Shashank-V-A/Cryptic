import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function TransactionsPage() {
  return (
    <PhasePlaceholder
      title="Transactions"
      phase="2"
      description="Serious financial ledger table with filters, CSV import pipeline (upload → parse → validate → normalize → dedupe → preview → confirm), and Review Required for unknown types."
      actions={[
        { to: '/settings/exchanges', label: 'Exchange settings' },
        { to: '/dashboard', label: 'Overview' },
      ]}
    />
  );
}
