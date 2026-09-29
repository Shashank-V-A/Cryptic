import { useParams } from 'react-router-dom';
import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function PortfolioAssetPage() {
  const { asset } = useParams();
  return (
    <PhasePlaceholder
      title={`${(asset || 'Asset').toUpperCase()} detail`}
      phase="3"
      description="Price chart, acquisition lots, buy/sell history, and P&L for this asset will be calculated from the ledger — never hard-coded."
      actions={[{ to: '/portfolio', label: 'All holdings' }]}
    />
  );
}
