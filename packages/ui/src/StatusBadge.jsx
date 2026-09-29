const STYLES = {
  default: 'bg-[var(--vda-surface-muted)] text-[var(--vda-ink-soft)]',
  success: 'bg-[var(--vda-green-muted)] text-[var(--vda-green)]',
  warning: 'bg-[#f3e6cf] text-[var(--vda-warning)]',
  danger: 'bg-[var(--vda-terracotta-muted)] text-[var(--vda-terracotta)]',
  info: 'bg-[#d9e4ea] text-[var(--vda-info)]',
  review: 'bg-[#f3e6cf] text-[var(--vda-warning)]',
};

export function StatusBadge({ children, tone = 'default' }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STYLES[tone] || STYLES.default}`}
    >
      {children}
    </span>
  );
}
