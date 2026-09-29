export function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section
      className={`scrapbook-panel relative overflow-hidden p-4 sm:p-5 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-[var(--vda-ink-faint)]">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
