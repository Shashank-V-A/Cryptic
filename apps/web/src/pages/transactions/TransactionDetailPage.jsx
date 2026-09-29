import { useParams } from 'react-router-dom';
import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function TransactionDetailPage() {
  const { id } = useParams();
  return (
    <PhasePlaceholder
      title="Transaction detail"
      phase="2"
      description={`Detail view for ${id}: original + normalized payload, lot impact, tax treatment, TDS, and audit history.`}
      actions={[{ to: '/transactions', label: 'All transactions' }]}
    />
  );
}
