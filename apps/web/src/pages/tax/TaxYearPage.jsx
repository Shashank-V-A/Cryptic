import { useParams } from 'react-router-dom';
import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function TaxYearPage() {
  const { financialYear } = useParams();
  return (
    <PhasePlaceholder
      title={`Tax · ${financialYear}`}
      phase="5"
      description="FY-scoped tax position, asset-wise taxable income, and explainable calculation trails."
      actions={[{ to: '/tax', label: 'Tax Center' }]}
    />
  );
}
