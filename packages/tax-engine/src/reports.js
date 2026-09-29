import { calculateVdaTax } from './calculate.js';
import { calculateExpectedTds, reconcileTds } from './tds.js';
import {
  buildScheduleVda,
  validateScheduleVda,
  toItrReadyScheduleVda,
  financialYearToAssessmentYear,
  SCHEDULE_VDA_SCHEMA,
} from './scheduleVda.js';
import { getTaxRuleSet, TAX_ENGINE_VERSION } from './rules.js';
import { decStr, toDec, zero } from './decimal.js';

export const REPORT_ENGINE_VERSION = '1.0.0';

/**
 * Build a full CRYPTO_TAX report payload (deterministic).
 */
export function buildCryptoTaxReport({
  financialYear,
  transfers,
  tdsDeductedInr = '0',
  scheduleAllocations = [],
  tdsEvents = [],
  payerKind = 'specified_person',
  recordedTds = [],
}) {
  const ruleSet = getTaxRuleSet(financialYear);
  const tax = calculateVdaTax({ financialYear, transfers, tdsDeductedInr });
  const schedule = buildScheduleVda(scheduleAllocations);
  const validation = validateScheduleVda(schedule, { financialYear });
  const tdsExpected = calculateExpectedTds({
    financialYear,
    payerKind,
    events: tdsEvents.length
      ? tdsEvents
      : transfers.map((t) => ({
          transactionId: t.transactionId,
          considerationInr: t.considerationInr,
          timestamp: t.timestamp,
        })),
  });
  const tdsRecon = reconcileTds({
    expectedLines: tdsExpected.lines,
    recorded: recordedTds,
  });

  const ay = financialYearToAssessmentYear(financialYear);

  return {
    reportType: 'CRYPTO_TAX',
    reportEngineVersion: REPORT_ENGINE_VERSION,
    taxEngineVersion: TAX_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    financialYear,
    assessmentYear: ay,
    ruleSetId: ruleSet.id,
    ruleSetVersion: ruleSet.version,
    scheduleVdaSchemaId: SCHEDULE_VDA_SCHEMA.id,
    summary: tax.summary,
    methodology: tax.methodology,
    taxLines: tax.lines,
    scheduleVda: schedule,
    scheduleValidation: validation,
    tds: { expected: tdsExpected, reconciliation: tdsRecon },
    disclaimers: {
      ...tax.disclaimers,
      report:
        'This report is Estimated VDA Tax and Schedule VDA preparation data. It is not Final Total Income-Tax Liability and not a certified e-filing submission.',
    },
    sources: ruleSet.verification,
  };
}

export function buildItrReadyPackage({
  financialYear,
  transfers,
  tdsDeductedInr = '0',
  scheduleAllocations = [],
}) {
  const crypto = buildCryptoTaxReport({
    financialYear,
    transfers,
    tdsDeductedInr,
    scheduleAllocations,
  });
  const itrSchedule = toItrReadyScheduleVda(crypto.scheduleVda, { financialYear });

  return {
    documentType: 'ITR_READY',
    reportEngineVersion: REPORT_ENGINE_VERSION,
    taxEngineVersion: TAX_ENGINE_VERSION,
    generatedAt: crypto.generatedAt,
    financialYear,
    assessmentYear: crypto.assessmentYear,
    ruleSetId: crypto.ruleSetId,
    ruleSetVersion: crypto.ruleSetVersion,
    estimatedVdaTax: crypto.summary,
    scheduleVda: itrSchedule.scheduleVda,
    transactionTrail: itrSchedule.transactionTrail,
    validation: itrSchedule.validation,
    scheduleCgHint: {
      note:
        'ITR-2 instructions: Income from transfer of Virtual Digital Assets (sum of Col.7 of Schedule VDA) feeds Schedule CG item for VDA income. Confirm against the official utility for the assessment year.',
      totalPositiveIncomeInr: crypto.scheduleVda.totalPositiveIncomeInr,
      vdaIncomeFromTaxEngineInr: crypto.summary.vdaIncomeInr,
      amountsMatch: toDec(crypto.scheduleVda.totalPositiveIncomeInr).equals(
        toDec(crypto.summary.vdaIncomeInr),
      ),
    },
    disclaimer: itrSchedule.disclaimer,
    filingReady: false,
    filingReadyReason:
      'Structured data is prepared from verified Schedule VDA column definitions. Direct e-filing / utility XSD import is not implemented or certified.',
  };
}

export function assertScheduleMatchesTaxIncome(schedule, taxSummary) {
  const a = toDec(schedule.totalPositiveIncomeInr || 0);
  const b = toDec(taxSummary.vdaIncomeInr || 0);
  return {
    ok: a.equals(b),
    scheduleTotalInr: decStr(a),
    taxEngineIncomeInr: decStr(b),
    differenceInr: decStr(a.minus(b)),
  };
}

export {
  buildScheduleVda,
  validateScheduleVda,
  toItrReadyScheduleVda,
  financialYearToAssessmentYear,
  SCHEDULE_VDA_SCHEMA,
};
