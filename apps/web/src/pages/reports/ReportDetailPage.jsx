import { useParams } from 'react-router-dom';
import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function ReportDetailPage() {
  const { id } = useParams();
  return (
    <PhasePlaceholder
      title={`Report ${id}`}
      phase="7"
      description="Report payload, transaction audit trail, warnings, and PDF download."
      actions={[{ to: '/reports', label: 'All reports' }]}
    />
  );
}
