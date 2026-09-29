/**
 * Versioned Indian VDA tax-rule engine.
 *
 * IMPORTANT:
 * - Never hard-code tax rates in React components.
 * - Never use an LLM to determine tax amounts.
 * - All calculations must be deterministic and versioned by TaxRuleSet.
 * - Production rates must be verified against official Income Tax Department sources
 *   for the selected financial year before treating results as filing-ready.
 *
 * Phase 1: rule-set registry + interfaces only.
 * Calculation implementations land in Phase 5.
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * @typedef {Object} TaxRuleSet
 * @property {string} id
 * @property {string} financialYear
 * @property {string} effectiveFrom
 * @property {string} effectiveTo
 * @property {string} version
 * @property {{ rate: string, source: string, notes: string }} vdaTax
 * @property {{ rate: string, source: string }} cess
 * @property {{ rate: string, thresholdInr: string, source: string }} tds
 * @property {{ lossOffsetAllowed: boolean, notes: string }} lossTreatment
 * @property {{ schedule: string, notes: string }} itrReporting
 * @property {string} officialSourceNotes
 */

/** @type {TaxRuleSet[]} */
export const TAX_RULE_SETS = [
  {
    id: 'FY_2025_26_v1',
    financialYear: 'FY_2025_26',
    effectiveFrom: '2025-04-01',
    effectiveTo: '2026-03-31',
    version: '1.0.0',
    vdaTax: {
      // Placeholder pending official verification for FY 2025-26 — do not treat as filing authority.
      rate: '0.30',
      source: 'Pending verification against Income Tax Department / Finance Act for FY 2025-26',
      notes: 'Flat VDA special rate historically applied under Income-tax Act provisions for VDAs. VERIFY before production use.',
    },
    cess: {
      rate: '0.04',
      source: 'Pending verification — Health & Education Cess typically applied on tax; confirm for selected FY',
    },
    tds: {
      rate: '0.01',
      thresholdInr: '10000',
      source: 'Pending verification of Section 194S parameters for selected FY',
    },
    lossTreatment: {
      lossOffsetAllowed: false,
      notes: 'Loss treatment for VDAs must be verified per FY; historically restricted. Do not assume carry-forward.',
    },
    itrReporting: {
      schedule: 'Schedule VDA',
      notes: 'Schema must be verified against current ITR utilities before export implementation.',
    },
    officialSourceNotes:
      'Rules registered as draft. Confirm against https://www.incometax.gov.in and applicable Finance Act before using for filings.',
  },
  {
    id: 'FY_2026_27_v1',
    financialYear: 'FY_2026_27',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    version: '1.0.0',
    vdaTax: {
      rate: '0.30',
      source: 'Pending verification against Income Tax Department / Finance Act for FY 2026-27',
      notes: 'Draft rule set — VERIFY official rates before production tax calculations.',
    },
    cess: {
      rate: '0.04',
      source: 'Pending verification for FY 2026-27',
    },
    tds: {
      rate: '0.01',
      thresholdInr: '10000',
      source: 'Pending verification of Section 194S for FY 2026-27',
    },
    lossTreatment: {
      lossOffsetAllowed: false,
      notes: 'Verify loss treatment for FY 2026-27 before production use.',
    },
    itrReporting: {
      schedule: 'Schedule VDA',
      notes: 'Verify ITR schema for AY corresponding to FY 2026-27.',
    },
    officialSourceNotes:
      'Draft TaxRuleSet for FY 2026-27. Official source verification required before production.',
  },
];

/**
 * @param {string} financialYear
 * @returns {TaxRuleSet}
 */
export function getTaxRuleSet(financialYear) {
  const rule = TAX_RULE_SETS.find((r) => r.financialYear === financialYear);
  if (!rule) {
    throw new Error(`No TaxRuleSet registered for financial year: ${financialYear}`);
  }
  return rule;
}

/**
 * Phase 1 stub — real calculation engine arrives in Phase 5.
 * Intentionally throws so callers cannot silently invent tax numbers.
 */
export function calculateVdaTax() {
  throw new Error(
    'Tax calculation engine is not implemented yet (Phase 5). Do not invent tax amounts.',
  );
}

export { Decimal };
