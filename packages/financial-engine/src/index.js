/**
 * Portfolio / lot / P&L financial engine.
 *
 * Phase 1: Decimal helpers + interfaces only.
 * Realized/unrealized P&L, lot allocation, and average cost land in Phase 3.
 * Never use bare JS floating-point for money or crypto quantities.
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value) {
  if (value instanceof Decimal) return value;
  if (value === null || value === undefined || value === '') {
    throw new Error('Cannot convert empty value to Decimal');
  }
  return new Decimal(value);
}

export function formatInr(value, { maximumFractionDigits = 2 } = {}) {
  const d = toDecimal(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits,
  }).format(d.toNumber());
}

/**
 * Phase 1 stubs — throw rather than return invented portfolio numbers.
 */
export function calculateRealizedPnl() {
  throw new Error('Portfolio P&L engine not implemented yet (Phase 3).');
}

export function calculateUnrealizedPnl() {
  throw new Error('Portfolio P&L engine not implemented yet (Phase 3).');
}

export function allocateSaleLots() {
  throw new Error('Acquisition lot allocation not implemented yet (Phase 3).');
}

export { Decimal };
