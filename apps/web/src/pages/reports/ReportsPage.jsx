import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function ReportsPage() {
  return (
    <PhasePlaceholder
      title="Reports"
      phase="7"
      description="Crypto Tax Report, Portfolio Report, Transaction Ledger, TDS Reconciliation, Schedule VDA Data, and ITR-ready Data — with downloadable PDF."
      actions={[{ to: '/tax', label: 'Tax Center' }]}
    />
  );
}
