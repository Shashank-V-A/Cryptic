export function ProfitLoss({ value, formatted, showSign = true }) {
  const numeric = typeof value === 'number' ? value : Number(value);
  const isPositive = numeric > 0;
  const isNegative = numeric < 0;
  const tone = isPositive ? 'text-[var(--vda-positive)]' : isNegative ? 'text-[var(--vda-negative)]' : 'text-[var(--vda-ink-muted)]';
  const arrow = isPositive ? '▲' : isNegative ? '▼' : '•';
  const prefix = showSign && isPositive ? '+' : '';

  return (
    <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${tone}`}>
      <span aria-hidden="true">{arrow}</span>
      <span>
        {prefix}
        {formatted ?? value}
      </span>
      <span className="sr-only">{isPositive ? 'profit' : isNegative ? 'loss' : 'unchanged'}</span>
    </span>
  );
}
