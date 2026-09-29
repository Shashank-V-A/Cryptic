import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTaxRuleSet,
  calculateVdaTax,
  calculateExpectedTds,
  reconcileTds,
  explainWhyPaying,
  TAX_RULE_SETS,
  TAX_ENGINE_VERSION,
} from './index.js';

describe('tax-engine registry', () => {
  it('registers verified FY rule sets with official citations', () => {
    assert.ok(TAX_RULE_SETS.length >= 3);
    const rule = getTaxRuleSet('FY_2026_27');
    assert.equal(rule.vdaTax.rate, '0.30');
    assert.equal(rule.tds.rate, '0.01');
    assert.equal(rule.cess.rate, '0.04');
    assert.equal(rule.tds.thresholdSpecifiedPersonInr, '50000');
    assert.equal(rule.tds.thresholdOtherPersonInr, '10000');
    assert.equal(rule.lossTreatment.lossOffsetAllowed, false);
    assert.equal(rule.filingReady, false);
    assert.ok(rule.verification.sections['115BBH'].includes('incometaxindia.gov.in'));
    assert.ok(rule.verification.sections['194S'].includes('incometaxindia.gov.in'));
  });

  it('refuses unknown financial years', () => {
    assert.throws(() => getTaxRuleSet('FY_2099_00'), /No TaxRuleSet/);
  });
});

describe('calculateVdaTax', () => {
  it('taxes only positive income at 30% + 4% cess without inventing floats', () => {
    const result = calculateVdaTax({
      financialYear: 'FY_2025_26',
      transfers: [
        {
          transactionId: 's1',
          timestamp: '2025-08-10T00:00:00.000Z',
          assetSymbol: 'BTC',
          considerationInr: '55950',
          acquisitionCostInr: '48100',
          financialYear: 'FY_2025_26',
          feesExcludedInr: '50',
        },
        {
          transactionId: 's2',
          timestamp: '2025-09-05T00:00:00.000Z',
          assetSymbol: 'ETH',
          considerationInr: '10000',
          acquisitionCostInr: '15000',
          financialYear: 'FY_2025_26',
        },
      ],
      tdsDeductedInr: '100',
    });

    assert.equal(result.engineVersion, TAX_ENGINE_VERSION);
    assert.equal(result.summary.vdaIncomeInr, '7850.000000000000');
    // tax = 7850 * 0.30 = 2355; cess = 2355 * 0.04 = 94.2; total = 2449.2
    assert.equal(result.summary.taxInr, '2355.000000000000');
    assert.equal(result.summary.cessInr, '94.200000000000');
    assert.equal(result.summary.estimatedVdaTaxInr, '2449.200000000000');
    assert.equal(result.summary.disallowedLossInr, '5000.000000000000');
    assert.equal(result.summary.surchargeIncluded, false);
    assert.equal(result.lines[1].taxableIncomeInr, '0.000000000000');
    assert.equal(result.lines.length, 2);
  });

  it('is deterministic across repeated calls', () => {
    const input = {
      financialYear: 'FY_2026_27',
      transfers: [
        {
          transactionId: 'a',
          timestamp: '2026-05-01T00:00:00.000Z',
          assetSymbol: 'BTC',
          considerationInr: '100000',
          acquisitionCostInr: '80000',
          financialYear: 'FY_2026_27',
        },
      ],
    };
    const a = calculateVdaTax(input);
    const b = calculateVdaTax(input);
    assert.deepEqual(a.summary, b.summary);
    assert.deepEqual(a.lines, b.lines);
  });
});

describe('TDS engine', () => {
  it('applies 1% after specified-person threshold with catch-up', () => {
    const result = calculateExpectedTds({
      financialYear: 'FY_2025_26',
      payerKind: 'specified_person',
      events: [
        { transactionId: 't1', considerationInr: '40000', timestamp: '2025-05-01' },
        { transactionId: 't2', considerationInr: '20000', timestamp: '2025-06-01' },
      ],
    });
    assert.equal(result.thresholdInr, '50000.000000000000');
    assert.equal(result.lines[0].expectedTdsInr, '0.000000000000');
    // catch-up 40000*1% + 20000*1% = 600
    assert.equal(result.lines[1].expectedTdsInr, '600.000000000000');
    assert.equal(result.totalExpectedTdsInr, '600.000000000000');
  });

  it('reconciles recorded vs expected without silent correction', () => {
    const expected = calculateExpectedTds({
      financialYear: 'FY_2025_26',
      payerKind: 'other_person',
      events: [{ transactionId: 'x', considerationInr: '20000', timestamp: '2025-07-01' }],
    });
    const rec = reconcileTds({
      expectedLines: expected.lines,
      recorded: [{ transactionId: 'x', tdsAmountInr: '200' }],
    });
    assert.equal(rec.items[0].status, 'MATCHED');
  });
});

describe('explainWhyPaying', () => {
  it('returns citation trail for a taxable line', () => {
    const calc = calculateVdaTax({
      financialYear: 'FY_2025_26',
      transfers: [
        {
          transactionId: 'why1',
          timestamp: '2025-08-10T00:00:00.000Z',
          assetSymbol: 'BTC',
          considerationInr: '55950',
          acquisitionCostInr: '48100',
          financialYear: 'FY_2025_26',
        },
      ],
    });
    const why = explainWhyPaying({ financialYear: 'FY_2025_26', line: calc.lines[0] });
    assert.ok(why.steps.length >= 5);
    assert.ok(why.headline.includes('115BBH'));
    assert.equal(why.ruleSetId, 'FY_2025_26_v1');
  });
});
