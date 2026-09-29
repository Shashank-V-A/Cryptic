/** Sign of a money string without float coercion of the full amount. */
export function moneySign(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    if (Number.isNaN(value) || value === 0) return 0;
    return value > 0 ? 1 : -1;
  }
  const raw = String(value).trim();
  if (!raw || raw === '—' || raw === '-') return 0;
  const neg = raw.startsWith('-') || /^\(.*\)$/.test(raw);
  const digits = raw.replace(/[^0-9.]/g, '');
  if (!digits || /^0*\.?0*$/.test(digits)) return 0;
  return neg ? -1 : 1;
}

export function formatInr(value, { fallback = '—' } = {}) {
  if (value === null || value === undefined || value === '') return fallback;
  const raw = String(value).trim();
  if (!raw || raw === '—') return fallback;

  // Prefer decimal-string path: split integer/fraction to avoid float for display grouping
  const neg = raw.startsWith('-');
  const abs = neg ? raw.slice(1) : raw.replace(/^\+/, '');
  if (!/^-?\d+(\.\d+)?$/.test(neg ? raw : abs) && Number.isNaN(Number(raw))) {
    return fallback;
  }

  const [intPart = '0', frac = ''] = abs.split('.');
  const frac2 = (frac + '00').slice(0, 2);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // Indian grouping via Intl on the integer part only (safe for display-sized ints)
  let indianInt = grouped;
  try {
    const n = Number(intPart);
    if (Number.isSafeInteger(n)) {
      indianInt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
    }
  } catch {
    // keep grouped
  }
  return `${neg ? '-' : ''}₹${indianInt}.${frac2}`;
}

export function formatQty(value, digits = 8) {
  if (value == null || value === '') return '—';
  const s = String(value);
  if (!s.includes('.')) return s;
  const [i, f = ''] = s.split('.');
  const trimmed = f.slice(0, digits).replace(/0+$/, '');
  return trimmed ? `${i}.${trimmed}` : i;
}

export function formatPct(value) {
  if (value == null || value === '') return '—';
  const sign = moneySign(value);
  const raw = String(value).replace(/[^0-9.\-]/g, '');
  const n = Number(raw);
  if (Number.isNaN(n)) return '—';
  const prefix = sign > 0 ? '+' : '';
  return `${prefix}${n.toFixed(2)}%`;
}

export function relativeTime(seconds) {
  if (seconds == null) return 'Prices unavailable';
  if (seconds < 5) return 'Prices updated just now';
  if (seconds < 60) return `Prices updated ${seconds} seconds ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `Prices updated ${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  return `Prices updated ${h} hour${h === 1 ? '' : 's'} ago`;
}

/** Editorial chart palette matching scrapbook design tokens */
export const CHART = {
  green: '#3d5a45',
  greenSoft: '#5a7a62',
  terracotta: '#e57d61',
  ink: '#1a1a1a',
  muted: '#6b7166',
  grid: '#ddd4c5',
  paper: '#f7f4ee',
};
