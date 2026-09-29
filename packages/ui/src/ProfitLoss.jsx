function moneySign(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    if (Number.isNaN(value) || value === 0) return 0;
    return value > 0 ? 1 : -1;
  }
  const raw = String(value).trim();
  if (!raw || raw === '—') return 0;
  const neg = raw.startsWith('-') || /^\(.*\)$/.test(raw);
  const digits = raw.replace(/[^0-9.]/g, '');
  if (!digits || /^0*\.?0*$/.test(digits)) return 0;
  return neg ? -1 : 1;
}

export function ProfitLoss({ value, formatted, showSign = true }) {
  const sign = moneySign(value);
  const isPositive = sign > 0;
  const isNegative = sign < 0;
  const tone = isPositive
    ? 'text-[var(--vda-positive)]'
    : isNegative
      ? 'text-[var(--vda-negative)]'
      : 'text-[var(--vda-ink-muted)]';
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
