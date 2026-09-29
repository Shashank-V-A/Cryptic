import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFinancialYearForDate, TRANSACTION_TYPES } from './constants.js';

describe('shared constants', () => {
  it('includes UNKNOWN transaction type', () => {
    assert.ok(TRANSACTION_TYPES.includes('UNKNOWN'));
  });

  it('maps April date to correct FY', () => {
    const fy = getFinancialYearForDate('2026-04-15T00:00:00.000Z');
    assert.equal(fy.id, 'FY_2026_27');
  });

  it('maps March date to previous FY start year', () => {
    const fy = getFinancialYearForDate('2026-03-15T00:00:00.000Z');
    assert.equal(fy.id, 'FY_2025_26');
  });
});
