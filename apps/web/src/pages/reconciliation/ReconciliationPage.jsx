import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function ReconciliationPage() {
  return (
    <PhasePlaceholder
      title="Reconciliation"
      phase="6"
      description="Compare exchange balances vs ledger quantities per asset. Mismatches open an investigation panel — never auto-corrected."
      actions={[{ to: '/transactions', label: 'Transactions' }]}
    />
  );
}
