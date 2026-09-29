export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-terracotta-muted)] bg-[var(--vda-terracotta-muted)]/40 px-5 py-6"
    >
      <h3 className="font-medium text-[var(--vda-negative)]">{title}</h3>
      {description ? <p className="mt-1 text-sm text-[var(--vda-ink-soft)]">{description}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-3 py-1.5 text-sm text-[var(--vda-cream)]"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
