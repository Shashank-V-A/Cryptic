export function MetricCard({ label, value, hint, tone = 'default', children }) {
  const toneClass =
    tone === 'positive'
      ? 'text-[var(--vda-positive)]'
      : tone === 'negative'
        ? 'text-[var(--vda-negative)]'
        : 'text-[var(--vda-ink)]';

  return (
    <div className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-5 shadow-[var(--vda-shadow-sm)]">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
        {label}
      </p>
      <p className={`mt-2 font-[family-name:var(--vda-font-display)] text-2xl tracking-tight ${toneClass}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">{hint}</p> : null}
      {children}
    </div>
  );
}
