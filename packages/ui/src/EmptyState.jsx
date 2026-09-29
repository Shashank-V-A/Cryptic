export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--vda-radius-lg)] border border-dashed border-[var(--vda-border-strong)] bg-[var(--vda-paper)] px-6 py-14 text-center">
      <h3 className="font-[family-name:var(--vda-font-display)] text-xl text-[var(--vda-ink)]">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-[var(--vda-ink-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
