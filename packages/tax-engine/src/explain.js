import { getTaxRuleSet } from './rules.js';
import { toDec } from './decimal.js';

/**
 * "Why am I paying this?" — explainable trail for one taxable transfer line.
 * AI must never invent figures; this returns deterministic citations from the TaxRuleSet.
 *
 * @param {{ line: object, financialYear: string }} input
 */
export function explainWhyPaying(input) {
  const ruleSet = getTaxRuleSet(input.financialYear);
  const line = input.line;
  if (!line) throw new Error('line is required');

  const taxable = toDec(line.taxableIncomeInr || 0);
  const steps = [];

  steps.push({
    id: 'transfer',
    title: 'Transfer identified',
    detail: `Transaction ${line.transactionId} (${line.assetSymbol}) is treated as a transfer of a virtual digital asset for s.115BBH / s.2(47) purposes.`,
    citation: 's.115BBH(3) read with s.2(47)',
    source: ruleSet.verification.sections['115BBH'],
  });

  steps.push({
    id: 'consideration',
    title: 'Sale consideration',
    detail: `Consideration for the transfer is ₹${line.considerationInr}.`,
    amountInr: line.considerationInr,
    citation: 's.115BBH(1) — income from transfer',
    source: ruleSet.verification.sections['115BBH'],
  });

  steps.push({
    id: 'cost',
    title: 'Cost of acquisition only',
    detail: `Cost of acquisition allowed is ₹${line.acquisitionCostInr}. No other expenditure (including exchange fees${line.feesExcludedInr ? ` of ₹${line.feesExcludedInr}` : ''}) is deducted.`,
    amountInr: line.acquisitionCostInr,
    citation: ruleSet.deductions.section,
    source: ruleSet.verification.sections['115BBH'],
  });

  if (toDec(line.disallowedLossInr || 0).gt(0)) {
    steps.push({
      id: 'loss',
      title: 'Loss not set off',
      detail: `This transfer produced a loss of ₹${line.disallowedLossInr}. Under s.115BBH(2) that loss is not set off against other income (including other VDA gains) and is not carried forward. Taxable income on this line is ₹0.`,
      amountInr: '0',
      citation: ruleSet.lossTreatment.section,
      source: ruleSet.verification.sections['115BBH'],
    });
  } else {
    steps.push({
      id: 'income',
      title: 'VDA income on this transfer',
      detail: `Taxable income = consideration − cost of acquisition = ₹${line.taxableIncomeInr}.`,
      amountInr: line.taxableIncomeInr,
      citation: 's.115BBH(1)–(2)',
      source: ruleSet.verification.sections['115BBH'],
    });
  }

  steps.push({
    id: 'tax',
    title: 'Special rate of thirty per cent',
    detail: taxable.gt(0)
      ? `Income-tax = ₹${line.taxableIncomeInr} × 30% = ₹${line.taxInr}.`
      : 'No income-tax on this line because taxable income is zero.',
    amountInr: line.taxInr,
    citation: ruleSet.vdaTax.section,
    source: ruleSet.vdaTax.source,
  });

  steps.push({
    id: 'cess',
    title: 'Health and Education Cess',
    detail: `HEC at 4% on the income-tax (surcharge excluded from this estimate) = ₹${line.cessInr}.`,
    amountInr: line.cessInr,
    citation: 'Finance Act / ITD tax rates — Health and Education Cess 4%',
    source: ruleSet.cess.source,
  });

  steps.push({
    id: 'total',
    title: 'Estimated tax on this transfer',
    detail: `Estimated VDA Tax on this line = tax + cess = ₹${line.estimatedTaxInr}. This is not Final Total Income-Tax Liability.`,
    amountInr: line.estimatedTaxInr,
    citation: ruleSet.calculationScope,
    source: ruleSet.officialSourceNotes,
  });

  return {
    transactionId: line.transactionId,
    financialYear: input.financialYear,
    ruleSetId: ruleSet.id,
    ruleSetVersion: ruleSet.version,
    headline: taxable.gt(0)
      ? `You are estimated to pay ₹${line.estimatedTaxInr} on this VDA transfer under s.115BBH.`
      : 'No Estimated VDA Tax on this transfer — taxable income is zero (loss not set off).',
    steps,
    disclaimers: {
      estimatedVdaTax:
        'Estimated VDA Tax is not Final Total Income-Tax Liability. Surcharge and other income are out of scope.',
      notAdvice: 'This explanation is informational and not professional tax advice.',
    },
  };
}
