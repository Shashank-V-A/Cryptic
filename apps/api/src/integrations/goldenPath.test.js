import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { processCsvImport } from '@vda-ledger/financial-engine/csv';
import { buildLedgerState } from '@vda-ledger/financial-engine';
import {
  calculateVdaTax,
  buildScheduleVda,
  buildCryptoTaxReport,
  assertScheduleMatchesTaxIncome,
} from '@vda-ledger/tax-engine';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleCsv = readFileSync(
  path.resolve(__dirname, '../../fixtures/sample-coindcx-like.csv'),
  'utf8',
);

function csvItemsToLedgerTransactions(items) {
  return items
    .filter((i) => i.status === 'ok' || i.status === 'needs_review')
    .map((item, idx) => {
      const n = item.normalized;
      return {
        id: n.externalTransactionId || `csv-row-${item.rowNumber || idx}`,
        timestamp: n.timestamp,
        assetSymbol: n.assetSymbol,
        transactionType: n.transactionType,
        quantity: n.quantity,
        price: n.price,
        grossValue: n.grossValue,
        fee: n.fee,
        netValue: n.netValue,
        currency: n.currency || 'INR',
      };
    });
}

describe('golden path (CSV → FIFO → tax → Schedule VDA)', () => {
  it('runs without database', () => {
    const parsed = processCsvImport(sampleCsv, { existingExternalIds: new Set() });
    assert.ok(parsed.summary.imported >= 1, 'expected at least one importable row');

    const txns = csvItemsToLedgerTransactions(parsed.items);
    const state = buildLedgerState(txns, { pricesByAsset: {} });
    assert.ok(state.holdings.length >= 1);
    assert.equal(state.methodology, 'FIFO');

    const sells = txns.filter((t) => t.transactionType === 'SELL');
    const transfers = [];
    const scheduleAllocations = [];

    for (const sell of sells) {
      const allocs = state.allocationsBySellId.get(sell.id) || [];
      if (!allocs.length) continue;

      let cost = 0;
      let proceeds = 0;
      for (const a of allocs) {
        const costStr = a.costBasisInr?.toString?.() ?? String(a.costBasisInr);
        const proceedsStr = a.proceedsInr?.toString?.() ?? String(a.proceedsInr);
        cost += Number(costStr);
        proceeds += Number(proceedsStr);

        const lot = [...state.lotsByAsset.values()]
          .flat()
          .find((l) => l.id === a.lotId || l.sourceTransactionId === a.lotId);

        scheduleAllocations.push({
          sellTransactionId: sell.id,
          lotId: a.lotId,
          assetSymbol: sell.assetSymbol,
          dateOfAcquisition: lot?.acquiredAt || sell.timestamp,
          dateOfTransfer: sell.timestamp,
          costOfAcquisitionInr: costStr,
          considerationReceivedInr: proceedsStr,
          quantity: a.quantity?.toString?.() ?? String(a.quantity),
        });
      }

      transfers.push({
        transactionId: sell.id,
        timestamp: sell.timestamp,
        assetSymbol: sell.assetSymbol,
        considerationInr: String(proceeds),
        acquisitionCostInr: String(cost),
        financialYear: 'FY_2025_26',
      });
    }

    assert.ok(transfers.length >= 1, 'sample CSV should include a taxable sell');

    const tax = calculateVdaTax({
      financialYear: 'FY_2025_26',
      transfers,
      tdsDeductedInr: '0',
    });
    assert.ok(Number(tax.summary.vdaIncomeInr) >= 0);

    const schedule = buildScheduleVda(scheduleAllocations);
    assert.ok(schedule.rows.length >= 1);
    assert.equal(assertScheduleMatchesTaxIncome(schedule, tax.summary).ok, true);

    const report = buildCryptoTaxReport({
      financialYear: 'FY_2025_26',
      transfers,
      scheduleAllocations,
      tdsDeductedInr: '0',
    });
    assert.equal(report.reportType, 'CRYPTO_TAX');
    assert.ok(report.scheduleVda?.rows?.length >= 1);
    assert.equal(report.ruleSetId, 'FY_2025_26_v1');
  });
});
