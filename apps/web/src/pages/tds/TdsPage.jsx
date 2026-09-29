import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function TdsPage() {
  return (
    <PhasePlaceholder
      title="TDS"
      phase="6"
      description="Match exchange TDS to ledger sales. Statuses: Matched, Partially Matched, Not Found, Needs Review. Never silently correct mismatches."
      actions={[{ to: '/tax', label: 'Tax Center' }, { to: '/reconciliation', label: 'Reconciliation' }]}
    />
  );
}
