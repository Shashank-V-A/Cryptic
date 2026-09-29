import { toDec, zero, decStr } from './decimal.js';
import { TAX_ENGINE_VERSION, getTaxRuleSet } from './rules.js';

/**
 * @typedef {{
 *   transactionId: string,
 *   timestamp: string,
 *   assetSymbol: string,
 *   considerationInr: string|number,
 *   acquisitionCostInr: string|number,
 *   financialYear: string,
 *   feesExcludedInr?: string|number|null,
 * }} TaxableTransfer
 */

/**
 * Compute Estimated VDA Tax for transfers in a financial year.
 * Deterministic. Uses only cost of acquisition as deduction (s.115BBH(2)(a)).
 * Positive per-transfer income only — losses are recorded but not set off (s.115BBH(2)).
 *
 * @param {{ transfers: TaxableTransfer[], financialYear: string, ruleSetId?: string, tdsDeductedInr?: string|number }} input
 */
export function calculateVdaTax(input) {
  if (!input || !input.financialYear) {
    throw new Error('financialYear is required');
  }
  const ruleSet = getTaxRuleSet(input.financialYear);
  if (input.ruleSetId && input.ruleSetId !== ruleSet.id) {
    throw new Error(`TaxRuleSet mismatch: requested ${input.ruleSetId}, registered ${ruleSet.id}`);
  }

  const taxRate = toDec(ruleSet.vdaTax.rate);
  const cessRate = toDec(ruleSet.cess.rate);
  const transfers = Array.isArray(input.transfers) ? input.transfers : [];

  const lines = [];
  let saleConsideration = zero();
  let acquisitionCostAllowed = zero();
  let vdaIncome = zero();
  let disallowedLoss = zero();
  let taxOnIncome = zero();

  for (const t of transfers) {
    if (t.financialYear && t.financialYear !== input.financialYear) continue;

    const consideration = toDec(t.considerationInr);
    const cost = toDec(t.acquisitionCostInr);
    const rawIncome = consideration.minus(cost);
    const taxableIncome = DecimalMax(rawIncome, zero());
    const loss = rawIncome.isNeg() ? rawIncome.abs() : zero();
    const lineTax = taxableIncome.times(taxRate);
    const lineCess = lineTax.times(cessRate);
    const lineTotal = lineTax.plus(lineCess);

    saleConsideration = saleConsideration.plus(consideration);
    acquisitionCostAllowed = acquisitionCostAllowed.plus(cost);
    vdaIncome = vdaIncome.plus(taxableIncome);
    disallowedLoss = disallowedLoss.plus(loss);
    taxOnIncome = taxOnIncome.plus(lineTax);

    lines.push({
      transactionId: t.transactionId,
      timestamp: t.timestamp,
      assetSymbol: t.assetSymbol,
      considerationInr: decStr(consideration),
      acquisitionCostInr: decStr(cost),
      rawIncomeInr: decStr(rawIncome),
      taxableIncomeInr: decStr(taxableIncome),
      disallowedLossInr: decStr(loss),
      taxInr: decStr(lineTax),
      cessInr: decStr(lineCess),
      estimatedTaxInr: decStr(lineTotal),
      feesExcludedInr: t.feesExcludedInr != null ? decStr(t.feesExcludedInr) : null,
      ruleCitations: [
        ruleSet.vdaTax.section,
        ruleSet.deductions.section,
        ruleSet.lossTreatment.section,
      ],
    });
  }

  const cess = taxOnIncome.times(cessRate);
  const estimatedTax = taxOnIncome.plus(cess);
  const tdsDeducted = input.tdsDeductedInr != null ? toDec(input.tdsDeductedInr) : zero();
  const estimatedRemaining = estimatedTax.minus(tdsDeducted);

  return {
    engineVersion: TAX_ENGINE_VERSION,
    ruleSetId: ruleSet.id,
    ruleSetVersion: ruleSet.version,
    financialYear: input.financialYear,
    isDraft: ruleSet.isDraft,
    filingReady: ruleSet.filingReady,
    calculationScope: ruleSet.calculationScope,
    methodology: {
      income:
        'Per transfer: taxable income = max(0, consideration − cost of acquisition). Fees and other expenditure excluded from deduction (s.115BBH(2)(a)).',
      tax: `Income-tax @ ${ruleSet.vdaTax.rate} (s.115BBH(1)(a)).`,
      cess: `Health & Education Cess @ ${ruleSet.cess.rate} on income-tax (surcharge excluded from this estimate).`,
      losses:
        'Per-transfer losses are not set off against other VDA gains or any other income and are not carried forward (s.115BBH(2)).',
    },
    summary: {
      saleConsiderationInr: decStr(saleConsideration),
      acquisitionCostInr: decStr(acquisitionCostAllowed),
      vdaIncomeInr: decStr(vdaIncome),
      disallowedLossInr: decStr(disallowedLoss),
      taxInr: decStr(taxOnIncome),
      cessInr: decStr(cess),
      estimatedVdaTaxInr: decStr(estimatedTax),
      tdsDeductedInr: decStr(tdsDeducted),
      estimatedRemainingInr: decStr(estimatedRemaining),
      surchargeIncluded: false,
    },
    lines,
    disclaimers: {
      estimatedVdaTax:
        'Estimated VDA Tax is computed from ledger transfers and the versioned TaxRuleSet. It is not your Final Total Income-Tax Liability.',
      surcharge:
        'Surcharge is not included because it depends on total income under the Act outside this ledger.',
      filing:
        'Schedule VDA structured data is prepared from verified ITR-2 column definitions. Certified e-filing / utility XSD import is not enabled (filingReady=false).',
    },
    sources: ruleSet.verification,
  };
}

function DecimalMax(a, b) {
  return a.gte(b) ? a : b;
}
