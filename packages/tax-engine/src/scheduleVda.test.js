import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScheduleVda,
  validateScheduleVda,
  toItrReadyScheduleVda,
  buildCryptoTaxReport,
  buildItrReadyPackage,
  financialYearToAssessmentYear,
  SCHEDULE_VDA_SCHEMA,
} from './index.js';

describe('Schedule VDA', () => {
  it('maps FY to assessment year', () => {
    const ay = financialYearToAssessmentYear('FY_2025_26');
    assert.equal(ay.code, 'AY_2026_27');
    assert.equal(ay.fyEnd, '2026-03-31');
  });

  it('builds rows with nil income on loss and traces sell txn', () => {
    const schedule = buildScheduleVda([
      {
        sellTransactionId: 'sell-1',
        allocationId: 'alloc-1',
        lotId: 'lot-1',
        assetSymbol: 'BTC',
        dateOfAcquisition: '2025-04-12T09:30:00.000Z',
        dateOfTransfer: '2025-08-10T14:20:00.000Z',
        costOfAcquisitionInr: '48100',
        considerationReceivedInr: '55950',
        quantity: '0.008',
      },
      {
        sellTransactionId: 'sell-2',
        assetSymbol: 'ETH',
        dateOfAcquisition: '2025-06-01T00:00:00.000Z',
        dateOfTransfer: '2025-09-05T00:00:00.000Z',
        costOfAcquisitionInr: '15000',
        considerationReceivedInr: '10000',
      },
    ]);

    assert.equal(schedule.rows.length, 2);
    assert.equal(schedule.rows[0].incomeHead, 'Capital Gain');
    assert.equal(schedule.rows[0].incomeFromTransferInr, '7850.000000000000');
    assert.equal(schedule.rows[1].incomeFromTransferInr, '0.000000000000');
    assert.equal(schedule.totalPositiveIncomeInr, '7850.000000000000');
    assert.equal(schedule.rows[0]._trace.sellTransactionId, 'sell-1');
    assert.equal(schedule.schema.id, SCHEDULE_VDA_SCHEMA.id);
  });

  it('validates transfer-before-acquisition and income formula', () => {
    const bad = buildScheduleVda([
      {
        sellTransactionId: 'x',
        assetSymbol: 'BTC',
        dateOfAcquisition: '2025-08-01',
        dateOfTransfer: '2025-07-01',
        costOfAcquisitionInr: '100',
        considerationReceivedInr: '200',
      },
    ]);
    // Corrupt income to force mismatch
    bad.rows[0].incomeFromTransferInr = '50.000000000000';
    const v = validateScheduleVda(bad, { financialYear: 'FY_2025_26' });
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => e.code === 'TRANSFER_BEFORE_ACQUISITION'));
    assert.ok(v.errors.some((e) => e.code === 'INCOME_MISMATCH'));
  });

  it('produces ITR-ready package with validation and trail', () => {
    const schedule = buildScheduleVda([
      {
        sellTransactionId: 'sell-1',
        assetSymbol: 'BTC',
        dateOfAcquisition: '2025-04-12',
        dateOfTransfer: '2025-08-10',
        costOfAcquisitionInr: '48100',
        considerationReceivedInr: '55950',
      },
    ]);
    const itr = toItrReadyScheduleVda(schedule, { financialYear: 'FY_2025_26' });
    assert.equal(itr.validation.ok, true);
    assert.equal(itr.scheduleVda.rows[0].serialNo, 1);
    assert.equal(itr.transactionTrail[0].sellTransactionId, 'sell-1');
    assert.ok(!('_trace' in itr.scheduleVda.rows[0]));
  });
});

describe('report builders', () => {
  it('builds crypto tax report with matching schedule total', () => {
    const report = buildCryptoTaxReport({
      financialYear: 'FY_2025_26',
      transfers: [
        {
          transactionId: 'sell-1',
          timestamp: '2025-08-10T14:20:00.000Z',
          assetSymbol: 'BTC',
          considerationInr: '55950',
          acquisitionCostInr: '48100',
          financialYear: 'FY_2025_26',
        },
      ],
      scheduleAllocations: [
        {
          sellTransactionId: 'sell-1',
          assetSymbol: 'BTC',
          dateOfAcquisition: '2025-04-12',
          dateOfTransfer: '2025-08-10',
          costOfAcquisitionInr: '48100',
          considerationReceivedInr: '55950',
        },
      ],
    });
    assert.equal(report.scheduleValidation.ok, true);
    assert.equal(report.summary.vdaIncomeInr, report.scheduleVda.totalPositiveIncomeInr);
  });

  it('marks ITR package filingReady false', () => {
    const pkg = buildItrReadyPackage({
      financialYear: 'FY_2025_26',
      transfers: [
        {
          transactionId: 'sell-1',
          timestamp: '2025-08-10T14:20:00.000Z',
          assetSymbol: 'BTC',
          considerationInr: '55950',
          acquisitionCostInr: '48100',
          financialYear: 'FY_2025_26',
        },
      ],
      scheduleAllocations: [
        {
          sellTransactionId: 'sell-1',
          assetSymbol: 'BTC',
          dateOfAcquisition: '2025-04-12',
          dateOfTransfer: '2025-08-10',
          costOfAcquisitionInr: '48100',
          considerationReceivedInr: '55950',
        },
      ],
    });
    assert.equal(pkg.filingReady, false);
    assert.equal(pkg.scheduleCgHint.amountsMatch, true);
  });
});
