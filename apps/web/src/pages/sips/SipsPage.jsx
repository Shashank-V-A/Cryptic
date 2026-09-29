import { PhasePlaceholder } from '../../components/system/PhasePlaceholder.jsx';

export function SipsPage() {
  return (
    <PhasePlaceholder
      title="SIPs"
      phase="4"
      description="Define weekly/monthly SIP plans, investment calendar, and performance — kept separate from taxable VDA income."
      actions={[{ to: '/portfolio', label: 'Portfolio' }]}
    />
  );
}
