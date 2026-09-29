import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getTaxRuleSet, calculateVdaTax, TAX_RULE_SETS } from './index.js';

describe('tax-engine registry', () => {
  it('registers FY rule sets as drafts', () => {
    assert.ok(TAX_RULE_SETS.length >= 2);
    const rule = getTaxRuleSet('FY_2026_27');
    assert.equal(rule.financialYear, 'FY_2026_27');
    assert.ok(rule.officialSourceNotes.includes('verification'));
  });

  it('refuses to invent tax amounts before Phase 5', () => {
    assert.throws(() => calculateVdaTax(), /not implemented/);
  });
});
