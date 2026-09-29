/**
 * Versioned Indian VDA TaxRuleSets.
 *
 * Sources verified before encoding rates (do not invent):
 * - s.115BBH Income-tax Act, 1961 — https://www.incometaxindia.gov.in/w/section-115bbh
 *   Flat 30% on income from transfer of VDA; only cost of acquisition deductible;
 *   no set-off of any loss in computing that income; VDA loss not set off / carried forward.
 * - s.194S — https://www.incometaxindia.gov.in/w/section-194s-4
 *   TDS 1% of consideration; threshold ₹50,000 (specified person) / ₹10,000 (others).
 * - Health & Education Cess 4% on income-tax + surcharge —
 *   https://www.incometaxindia.gov.in/w/tax-rates (ITD tax rates page).
 *
 * Estimated VDA Tax in this product = tax @ 30% + HEC @ 4% on that tax.
 * Surcharge is NOT applied here (requires total income outside this ledger) —
 * therefore Estimated VDA Tax ≠ Final Total Income-Tax Liability.
 *
 * Schedule VDA export schemas are NOT verified here — filingReady remains false.
 */

/** @typedef {import('./types.js').TaxRuleSet} TaxRuleSet */

const VERIFICATION = {
  verifiedAt: '2026-09-29',
  sections: {
    '115BBH': 'https://www.incometaxindia.gov.in/w/section-115bbh',
    '194S': 'https://www.incometaxindia.gov.in/w/section-194s-4',
    cess: 'https://www.incometaxindia.gov.in/w/tax-rates',
    circular23_2022:
      'https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-23-2022.pdf',
  },
  notes:
    'Core statutory rates verified against Income Tax Department published section text. No Finance Act amendment changing the 30%/1% parameters was found for FY 2025-26 / 2026-27. Surcharge excluded from Estimated VDA Tax. Schedule VDA columns verified against ITR-2 instructions (AY 2023-24); structured export enabled for preparation. Certified e-filing / utility XSD import remains disabled.',
};

function buildRuleSet({ id, financialYear, effectiveFrom, effectiveTo }) {
  return {
    id,
    financialYear,
    effectiveFrom,
    effectiveTo,
    version: '1.1.0',
    isDraft: false,
    filingReady: false,
    calculationScope: 'estimated_vda_tax_excluding_surcharge',
    verification: VERIFICATION,
    vdaTax: {
      rate: '0.30',
      section: '115BBH(1)(a)',
      source: VERIFICATION.sections['115BBH'],
      notes:
        'Income-tax calculated on income from transfer of VDA at the rate of thirty per cent (s.115BBH).',
    },
    cess: {
      rate: '0.04',
      name: 'Health and Education Cess',
      source: VERIFICATION.sections.cess,
      notes:
        'HEC levied at 4% on income-tax plus surcharge. This engine applies 4% on the s.115BBH tax only because surcharge is out of scope.',
    },
    surcharge: {
      included: false,
      reason:
        'Surcharge depends on total income under the Act. Not computed from the VDA ledger alone.',
    },
    tds: {
      rate: '0.01',
      section: '194S(1)',
      source: VERIFICATION.sections['194S'],
      thresholdSpecifiedPersonInr: '50000',
      thresholdOtherPersonInr: '10000',
      notes:
        'Deduct 1% of consideration for transfer of VDA to a resident. No deduction where aggregate consideration in the FY does not exceed ₹50,000 (specified person) or ₹10,000 (other persons) — s.194S(3).',
    },
    lossTreatment: {
      lossOffsetAllowed: false,
      carryForwardAllowed: false,
      section: '115BBH(2)',
      source: VERIFICATION.sections['115BBH'],
      notes:
        'No deduction other than cost of acquisition; no set-off of any loss in computing VDA transfer income; loss from VDA transfer cannot be set off against any income under the Act and cannot be carried forward — s.115BBH(2). Engine taxes only positive per-transfer income (consideration − cost of acquisition).',
    },
    deductions: {
      costOfAcquisitionAllowed: true,
      otherExpenditureAllowed: false,
      section: '115BBH(2)(a)',
      notes:
        'Only cost of acquisition is allowed. Exchange fees and other expenditure are not deducted when computing VDA income under s.115BBH.',
    },
    itrReporting: {
      schedule: 'Schedule VDA',
      schemaId: 'SCHEDULE_VDA_ITR2_COLUMNS_v1',
      notes:
        'Columns verified against ITD Instructions to Form ITR-2 (AY 2023-24). AY 2026-27 schema change doc v1.2 does not alter Schedule VDA. Structured export available; certified e-filing/utility XSD import remains disabled (filingReady=false).',
    },
    officialSourceNotes: VERIFICATION.notes,
  };
}

/** @type {TaxRuleSet[]} */
export const TAX_RULE_SETS = [
  buildRuleSet({
    id: 'FY_2024_25_v1',
    financialYear: 'FY_2024_25',
    effectiveFrom: '2024-04-01',
    effectiveTo: '2025-03-31',
  }),
  buildRuleSet({
    id: 'FY_2025_26_v1',
    financialYear: 'FY_2025_26',
    effectiveFrom: '2025-04-01',
    effectiveTo: '2026-03-31',
  }),
  buildRuleSet({
    id: 'FY_2026_27_v1',
    financialYear: 'FY_2026_27',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
  }),
  buildRuleSet({
    id: 'FY_2027_28_v1',
    financialYear: 'FY_2027_28',
    effectiveFrom: '2027-04-01',
    effectiveTo: '2028-03-31',
  }),
];

export const TAX_ENGINE_VERSION = '1.1.0';

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

export function listTaxRuleSets() {
  return TAX_RULE_SETS.map((r) => ({
    id: r.id,
    financialYear: r.financialYear,
    version: r.version,
    isDraft: r.isDraft,
    filingReady: r.filingReady,
    calculationScope: r.calculationScope,
    officialSourceNotes: r.officialSourceNotes,
  }));
}
