export function formatInr(value, { fallback = '—' } = {}) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
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
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
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
