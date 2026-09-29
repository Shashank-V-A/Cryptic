import { useParams } from 'react-router-dom';
import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function ComingSoonPage() {
  const { feature } = useParams();
  return (
    <PhasePlaceholder
      title={feature || 'Coming soon'}
      phase="—"
      description="This feature is planned. It is clearly marked rather than faked."
      actions={[{ to: '/dashboard', label: 'Back to overview' }]}
    />
  );
}
