import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsv,
  classifyTransactionType,
  normalizeRow,
  detectDuplicates,
  processCsvImport,
} from './csv.js';

describe('parseCsv', () => {
  it('parses quoted commas', () => {
    const rows = parseCsv('a,b\n"1,2",3\n');
    assert.deepEqual(rows[0], ['a', 'b']);
    assert.deepEqual(rows[1], ['1,2', '3']);
  });

  it('rejects empty csv', () => {
    assert.throws(() => parseCsv('  '), /empty/);
  });
});

describe('classifyTransactionType', () => {
  it('maps aliases and trade sides', () => {
    assert.equal(classifyTransactionType('BUY').type, 'BUY');
    assert.equal(classifyTransactionType('TRADE', 'SELL').type, 'SELL');
    assert.equal(classifyTransactionType('weird').type, 'UNKNOWN');
    assert.equal(classifyTransactionType('weird').needsReview, true);
  });
});

describe('normalize + dedupe', () => {
  it('normalizes generic ledger CSV row', () => {
    const headers = [
      'timestamp',
      'asset',
      'type',
      'quantity',
      'price',
      'fee',
      'external_id',
    ];
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const row = ['2025-06-01T10:00:00Z', 'BTC', 'BUY', '0.01', '6000000', '100', 'cdc-1'];
    const result = normalizeRow(row, idx, 2);
    assert.equal(result.status, 'ok');
    assert.equal(result.normalized.transactionType, 'BUY');
    assert.equal(result.normalized.quantity, '0.01');
    assert.equal(result.normalized.financialYear, 'FY_2025_26');
    assert.equal(result.raw.asset, 'BTC');
  });

  it('marks unknown types as needs_review without silent classification', () => {
    const headers = ['timestamp', 'asset', 'type', 'quantity', 'external_id'];
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const result = normalizeRow(
      ['2025-06-01T10:00:00Z', 'ETH', 'MYSTERY', '1', 'x1'],
      idx,
      2,
    );
    assert.equal(result.normalized.transactionType, 'UNKNOWN');
    assert.equal(result.status, 'needs_review');
    assert.equal(result.normalized.needsReview, true);
  });

  it('detects duplicates in file and against ledger', () => {
    const items = [
      {
        status: 'ok',
        normalized: { externalTransactionId: 'a' },
      },
      {
        status: 'ok',
        normalized: { externalTransactionId: 'a' },
      },
      {
        status: 'ok',
        normalized: { externalTransactionId: 'b' },
      },
    ];
    const out = detectDuplicates(items, new Set(['b']));
    assert.equal(out[1].status, 'duplicate');
    assert.equal(out[2].status, 'duplicate');
    assert.equal(out[2].duplicateReason, 'exists_in_ledger');
  });

  it('processCsvImport returns summary buckets', () => {
    const csv = [
      'timestamp,asset,type,quantity,price,fee,external_id',
      '2025-06-01T10:00:00Z,BTC,BUY,0.01,6000000,100,cdc-1',
      '2025-06-01T10:00:00Z,BTC,BUY,0.01,6000000,100,cdc-1',
      '2025-06-02T10:00:00Z,ETH,WEIRD,1,100,0,cdc-2',
      'not-a-date,BTC,BUY,1,1,0,cdc-3',
    ].join('\n');
    const result = processCsvImport(csv);
    assert.equal(result.summary.imported, 1);
    assert.equal(result.summary.duplicates, 1);
    assert.equal(result.summary.needsReview, 1);
    assert.equal(result.summary.invalid, 1);
  });
});
