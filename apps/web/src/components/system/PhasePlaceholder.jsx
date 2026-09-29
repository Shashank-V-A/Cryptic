import { EmptyState, StatusBadge } from '@vda-ledger/ui';
import { Link } from 'react-router-dom';

export function PhasePlaceholder({
  title,
  phase,
  description,
  actions = [],
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">{title}</h1>
        <StatusBadge tone="info">Phase {phase}</StatusBadge>
      </div>
      <EmptyState
        title={`${title} foundation is ready`}
        description={description}
        action={
          actions.length ? (
            <div className="flex flex-wrap justify-center gap-2">
              {actions.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="rounded-[var(--vda-radius)] border border-[var(--vda-border-strong)] bg-[var(--vda-surface)] px-3 py-2 text-sm"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          ) : null
        }
      />
      <p className="text-center text-xs text-[var(--vda-ink-muted)]">
        No fabricated financial figures. Buttons either work or are clearly marked for a later phase.
      </p>
    </div>
  );
}
