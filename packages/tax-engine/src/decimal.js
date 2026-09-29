import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function toDec(value) {
  if (value instanceof Decimal) return value;
  if (value === null || value === undefined || value === '') {
    throw new Error('Decimal value required');
  }
  return new Decimal(String(value));
}

export function zero() {
  return new Decimal(0);
}

export function decStr(value, places = 12) {
  if (value === null || value === undefined) return null;
  return toDec(value).toFixed(places);
}

export { Decimal };
