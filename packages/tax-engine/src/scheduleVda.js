/**
 * Schedule VDA data preparation + validation.
 *
 * Field definitions verified against Income Tax Department
 * "Instructions to Form ITR-2 (AY 2023-24)" — Schedule VDA:
 *   1 S.No
 *   2 Date of Acquisition
 *   3 Date of Transfer
 *   4 Head under which income to be taxed (Capital Gain)
 *   5 Cost of Acquisition
 *   6 Consideration Received
 *   7 Income from transfer (Col.6 − Col.5; nil if loss)
 * Total = sum of positive incomes in Col.7
 *
 * AY 2026-27 ITR-2 schema change document (v1.2, 13 Aug 2026) does not
 * alter Schedule VDA elements — same column set used for structured export.
 *
 * Sources:
 * - https://www.incometaxindia.gov.in/documents/20117/11038805/Instructions_ITR2_AY_2023_24.pdf
 * - https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-08/ITR%202_Schema%20change%20document_AY2026-27_V1.2.pdf
 *
 * This module prepares data for manual entry / utility import preparation.
 * It does NOT claim certified e-filing or final liability.
 */

import { toDec, zero, decStr } from './decimal.js';

export const SCHEDULE_VDA_SCHEMA = Object.freeze({
  id: 'SCHEDULE_VDA_ITR2_COLUMNS_v1',
  version: '1.0.0',
  assessmentYearBasis: 'ITR-2 Instructions AY 2023-24',
  ay2026_27SchemaChangeNote:
    'ITR-2 Schema Change Document AY 2026-27 v1.2 lists no Schedule VDA field changes.',
  sources: [
    'https://www.incometaxindia.gov.in/documents/20117/11038805/Instructions_ITR2_AY_2023_24.pdf',
    'https://www.incometax.gov.in/iec/foportal/help/FileITR-2Online-FAQ',
  ],
  columns: [
    { no: 1, key: 'serialNo', label: 'S. No' },
    { no: 2, key: 'dateOfAcquisition', label: 'Date of Acquisition' },
    { no: 3, key: 'dateOfTransfer', label: 'Date of Transfer' },
    { no: 4, key: 'incomeHead', label: 'Head under which income to be taxed (Capital Gain)' },
    { no: 5, key: 'costOfAcquisitionInr', label: 'Cost of Acquisition' },
    { no: 6, key: 'considerationReceivedInr', label: 'Consideration Received' },
    {
      no: 7,
      key: 'incomeFromTransferInr',
      label: 'Income from transfer of Virtual Digital Assets (enter nil in case of loss)',
    },
  ],
});

/**
 * Map FY code → Assessment Year label (Indian FY ends 31 Mar; AY is next year).
 * FY_2025_26 → AY 2026-27
 */
export function financialYearToAssessmentYear(financialYear) {
  const m = String(financialYear).match(/^FY_(\d{4})_(\d{2})$/);
  if (!m) throw new Error(`Invalid financial year: ${financialYear}`);
  const start = Number(m[1]);
  const ayStart = start + 1;
  return {
    code: `AY_${ayStart}_${String(ayStart + 1).slice(-2)}`,
    label: `AY ${ayStart}–${String(ayStart + 1).slice(-2)}`,
    fyEnd: `${start + 1}-03-31`,
    fyStart: `${start}-04-01`,
  };
}

function isoDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Build Schedule VDA rows from lot-allocation lines (one row per allocation).
 * Traceability fields are ledger metadata — not part of the official schedule columns.
 *
 * @param {Array<{
 *   allocationId?: string,
 *   lotId?: string,
 *   sellTransactionId: string,
 *   assetSymbol: string,
 *   dateOfAcquisition: string|Date,
 *   dateOfTransfer: string|Date,
 *   costOfAcquisitionInr: string|number,
 *   considerationReceivedInr: string|number,
 *   quantity?: string|number,
 * }>} allocations
 */
export function buildScheduleVda(allocations = []) {
  const rows = [];
  let totalPositiveIncome = zero();
  let serial = 1;

  for (const a of allocations) {
    const cost = toDec(a.costOfAcquisitionInr || 0);
    const consideration = toDec(a.considerationReceivedInr || 0);
    const raw = consideration.minus(cost);
    const income = raw.gt(0) ? raw : zero();
    totalPositiveIncome = totalPositiveIncome.plus(income);

    rows.push({
      serialNo: serial++,
      dateOfAcquisition: isoDate(a.dateOfAcquisition),
      dateOfTransfer: isoDate(a.dateOfTransfer),
      incomeHead: 'Capital Gain',
      costOfAcquisitionInr: decStr(cost),
      considerationReceivedInr: decStr(consideration),
      incomeFromTransferInr: decStr(income),
      // Traceability (not official schedule columns)
      _trace: {
        sellTransactionId: a.sellTransactionId,
        allocationId: a.allocationId || null,
        lotId: a.lotId || null,
        assetSymbol: a.assetSymbol || null,
        quantity: a.quantity != null ? String(a.quantity) : null,
        rawIncomeInr: decStr(raw),
        lossEnteredAsNil: raw.lt(0),
      },
    });
  }

  return {
    schema: SCHEDULE_VDA_SCHEMA,
    rows,
    totalPositiveIncomeInr: decStr(totalPositiveIncome),
    rowCount: rows.length,
  };
}

/**
 * Validate Schedule VDA rows against official instruction rules.
 * @returns {{ ok: boolean, errors: Array, warnings: Array }}
 */
export function validateScheduleVda(schedule, { financialYear } = {}) {
  const errors = [];
  const warnings = [];
  const ay = financialYear ? financialYearToAssessmentYear(financialYear) : null;
  const fyEnd = ay?.fyEnd;
  const fyStart = ay?.fyStart;

  if (!schedule?.rows?.length) {
    warnings.push({
      code: 'EMPTY_SCHEDULE',
      message: 'No VDA transfers to report for this financial year.',
    });
  }

  let recomputedTotal = zero();

  for (const row of schedule.rows || []) {
    const prefix = `Row ${row.serialNo}`;

    if (!row.dateOfAcquisition) {
      errors.push({ code: 'MISSING_ACQUISITION_DATE', message: `${prefix}: Date of Acquisition required`, serialNo: row.serialNo });
    }
    if (!row.dateOfTransfer) {
      errors.push({ code: 'MISSING_TRANSFER_DATE', message: `${prefix}: Date of Transfer required`, serialNo: row.serialNo });
    }

    if (row.dateOfAcquisition && row.dateOfTransfer && row.dateOfTransfer < row.dateOfAcquisition) {
      errors.push({
        code: 'TRANSFER_BEFORE_ACQUISITION',
        message: `${prefix}: Date of Transfer cannot be before Date of Acquisition (ITR-2 Schedule VDA instructions).`,
        serialNo: row.serialNo,
      });
    }

    if (fyEnd && row.dateOfTransfer && row.dateOfTransfer > fyEnd) {
      errors.push({
        code: 'TRANSFER_AFTER_FY',
        message: `${prefix}: Date of Transfer ${row.dateOfTransfer} is after FY end ${fyEnd}.`,
        serialNo: row.serialNo,
      });
    }

    if (fyStart && row.dateOfTransfer && row.dateOfTransfer < fyStart) {
      warnings.push({
        code: 'TRANSFER_BEFORE_FY',
        message: `${prefix}: Date of Transfer ${row.dateOfTransfer} is before FY start ${fyStart}.`,
        serialNo: row.serialNo,
      });
    }

    if (row.incomeHead !== 'Capital Gain') {
      errors.push({
        code: 'INVALID_INCOME_HEAD',
        message: `${prefix}: Head must be Capital Gain per Schedule VDA instructions.`,
        serialNo: row.serialNo,
      });
    }

    try {
      const cost = toDec(row.costOfAcquisitionInr);
      const consideration = toDec(row.considerationReceivedInr);
      const income = toDec(row.incomeFromTransferInr);
      const expected = consideration.minus(cost);
      const expectedNil = expected.gt(0) ? expected : zero();

      if (!income.equals(expectedNil)) {
        errors.push({
          code: 'INCOME_MISMATCH',
          message: `${prefix}: Income must equal max(0, Consideration − Cost). Expected ${decStr(expectedNil)}, got ${decStr(income)}.`,
          serialNo: row.serialNo,
        });
      }

      if (expected.lt(0) && !income.isZero()) {
        errors.push({
          code: 'LOSS_NOT_NIL',
          message: `${prefix}: Loss must be entered as nil (0) in Col.7.`,
          serialNo: row.serialNo,
        });
      }

      recomputedTotal = recomputedTotal.plus(income);
    } catch (err) {
      errors.push({
        code: 'INVALID_AMOUNT',
        message: `${prefix}: ${err.message}`,
        serialNo: row.serialNo,
      });
    }

    if (!row._trace?.sellTransactionId) {
      warnings.push({
        code: 'MISSING_TRACE',
        message: `${prefix}: Missing sell transaction traceability link.`,
        serialNo: row.serialNo,
      });
    }
  }

  if (schedule.totalPositiveIncomeInr != null) {
    try {
      if (!toDec(schedule.totalPositiveIncomeInr).equals(recomputedTotal)) {
        errors.push({
          code: 'TOTAL_MISMATCH',
          message: `Total positive income ${schedule.totalPositiveIncomeInr} does not equal sum of Col.7 (${decStr(recomputedTotal)}).`,
        });
      }
    } catch {
      errors.push({ code: 'TOTAL_INVALID', message: 'totalPositiveIncomeInr is not a valid decimal.' });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    recomputedTotalPositiveIncomeInr: decStr(recomputedTotal),
    schemaId: SCHEDULE_VDA_SCHEMA.id,
  };
}

/**
 * Strip internal _trace for a clean official-column export, keeping a parallel trail map.
 */
export function toItrReadyScheduleVda(schedule, { financialYear } = {}) {
  const ay = financialYear ? financialYearToAssessmentYear(financialYear) : null;
  const validation = validateScheduleVda(schedule, { financialYear });

  return {
    documentType: 'ITR_READY_SCHEDULE_VDA',
    schema: SCHEDULE_VDA_SCHEMA,
    financialYear: financialYear || null,
    assessmentYear: ay,
    disclaimer:
      'Structured Schedule VDA data for preparation / manual entry. Not a certified e-filing package. Not Final Total Income-Tax Liability. Cross-check against the official ITR utility for the assessment year before filing.',
    validation,
    scheduleVda: {
      columns: SCHEDULE_VDA_SCHEMA.columns,
      rows: (schedule.rows || []).map((r) => ({
        serialNo: r.serialNo,
        dateOfAcquisition: r.dateOfAcquisition,
        dateOfTransfer: r.dateOfTransfer,
        incomeHead: r.incomeHead,
        costOfAcquisitionInr: r.costOfAcquisitionInr,
        considerationReceivedInr: r.considerationReceivedInr,
        incomeFromTransferInr: r.incomeFromTransferInr,
      })),
      totalPositiveIncomeInr: schedule.totalPositiveIncomeInr,
    },
    transactionTrail: (schedule.rows || []).map((r) => ({
      serialNo: r.serialNo,
      ...r._trace,
    })),
  };
}
