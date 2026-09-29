/**
 * Versioned Indian VDA tax-rule engine.
 *
 * - Never hard-code tax rates in React components.
 * - Never use an LLM to determine tax amounts.
 * - All calculations are deterministic and versioned by TaxRuleSet.
 * - Rates encoded only after verification against official ITD section text.
 */

export {
  TAX_RULE_SETS,
  TAX_ENGINE_VERSION,
  getTaxRuleSet,
  listTaxRuleSets,
} from './rules.js';
export { calculateVdaTax } from './calculate.js';
export { calculateExpectedTds, reconcileTds } from './tds.js';
export { explainWhyPaying } from './explain.js';
export {
  buildScheduleVda,
  validateScheduleVda,
  toItrReadyScheduleVda,
  financialYearToAssessmentYear,
  SCHEDULE_VDA_SCHEMA,
  buildCryptoTaxReport,
  buildItrReadyPackage,
  assertScheduleMatchesTaxIncome,
  REPORT_ENGINE_VERSION,
} from './reports.js';
export { Decimal, toDec, zero, decStr } from './decimal.js';

