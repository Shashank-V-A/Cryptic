export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-[var(--vda-ink-muted)]" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--vda-border-strong)] border-t-[var(--vda-green)]" />
      {label}
    </div>
  );
}
