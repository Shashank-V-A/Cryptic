/** @typedef {'BUY'|'SELL'|'TRANSFER_IN'|'TRANSFER_OUT'|'DEPOSIT'|'WITHDRAWAL'|'FEE'|'REWARD'|'AIRDROP'|'GIFT'|'SWAP'|'UNKNOWN'} TransactionType */

/** @typedef {'Matched'|'PartiallyMatched'|'NotFound'|'NeedsReview'} TdsStatus */

/** @typedef {'Reconciled'|'Mismatch'|'NeedsReview'} ReconciliationStatus */

export const TRANSACTION_TYPES = Object.freeze([
  'BUY',
  'SELL',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'DEPOSIT',
  'WITHDRAWAL',
  'FEE',
  'REWARD',
  'AIRDROP',
  'GIFT',
  'SWAP',
  'UNKNOWN',
]);

export const FINANCIAL_YEARS = Object.freeze([
  { id: 'FY_2024_25', label: 'FY 2024–25', start: '2024-04-01', end: '2025-03-31' },
  { id: 'FY_2025_26', label: 'FY 2025–26', start: '2025-04-01', end: '2026-03-31' },
  { id: 'FY_2026_27', label: 'FY 2026–27', start: '2026-04-01', end: '2027-03-31' },
  { id: 'FY_2027_28', label: 'FY 2027–28', start: '2027-04-01', end: '2028-03-31' },
]);

/**
 * Indian financial year for a given date (IST calendar date).
 * FY starts 1 April.
 * @param {Date|string|number} dateInput
 * @returns {{ id: string, label: string, start: string, end: string }}
 */
export function getFinancialYearForDate(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date for financial year lookup');
  }
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-indexed
  const startYear = month >= 3 ? year : year - 1;
  const id = `FY_${startYear}_${String(startYear + 1).slice(-2)}`;
  const found = FINANCIAL_YEARS.find((fy) => fy.id === id);
  if (found) return found;
  return {
    id,
    label: `FY ${startYear}–${String(startYear + 1).slice(-2)}`,
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
  };
}

export const APP_NAME = 'VDA Ledger';
export const APP_TAGLINE = 'Your Crypto Portfolio. Your Tax Ledger. One Source of Truth.';

export const DISCLAIMERS = Object.freeze({
  estimatedVdaTax:
    'Estimated VDA Tax is a deterministic calculation based on recorded VDA transactions and the selected financial year’s TaxRuleSet. It is not your final total income-tax liability.',
  finalLiability:
    'Final Total Income-Tax Liability depends on other income, deductions, tax regime, surcharge, cess, TDS, and filing choices. Consult a qualified tax professional for filing.',
  taxReserve:
    'Tax Reserve Recommendation is an informational estimate only and is not personalized financial advice.',
  simulator: 'Simulation only. No trade will be executed.',
  demoMode: 'Demo mode uses clearly fictional seed data for product exploration.',
});
