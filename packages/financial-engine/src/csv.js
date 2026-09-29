/**
 * CSV import: parse → validate → normalize → dedupe.
 * Never destroys original row data; stores raw alongside normalized.
 */

import { TRANSACTION_TYPES, getFinancialYearForDate } from '@vda-ledger/shared';
import { toDecimal } from '@vda-ledger/financial-engine';

const TYPE_ALIASES = {
  BUY: 'BUY',
  BUYING: 'BUY',
  BOUGHT: 'BUY',
  SELL: 'SELL',
  SELLING: 'SELL',
  SOLD: 'SELL',
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  WITHDRAW: 'WITHDRAWAL',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFERIN: 'TRANSFER_IN',
  'TRANSFER IN': 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFEROUT: 'TRANSFER_OUT',
  'TRANSFER OUT': 'TRANSFER_OUT',
  FEE: 'FEE',
  REWARD: 'REWARD',
  AIRDROP: 'AIRDROP',
  GIFT: 'GIFT',
  SWAP: 'SWAP',
  TRADE: null, // ambiguous — needs side
};

/**
 * Minimal CSV parser supporting quoted fields.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  if (!text || !String(text).trim()) {
    throw new Error('CSV content is empty');
  }
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const input = String(text).replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\n') {
      row.push(field.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // skip
    } else {
      field += ch;
    }
  }
  row.push(field.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

function headerIndex(headers) {
  const map = {};
  headers.forEach((h, i) => {
    map[String(h).trim().toLowerCase().replace(/\s+/g, '_')] = i;
  });
  return map;
}

function cell(row, idx, key) {
  const i = idx[key];
  if (i === undefined) return '';
  return row[i] ?? '';
}

/**
 * Map a raw type string to TransactionType or UNKNOWN.
 */
export function classifyTransactionType(rawType, side) {
  const t = String(rawType || '').trim().toUpperCase();
  const s = String(side || '').trim().toUpperCase();
  if (TYPE_ALIASES[t]) return { type: TYPE_ALIASES[t], confidence: 1, needsReview: false };
  if (t === 'TRADE' || t === '') {
    if (s === 'BUY' || s === 'BID') return { type: 'BUY', confidence: 0.9, needsReview: false };
    if (s === 'SELL' || s === 'ASK') return { type: 'SELL', confidence: 0.9, needsReview: false };
  }
  if (TRANSACTION_TYPES.includes(t)) {
    return { type: t, confidence: 1, needsReview: t === 'UNKNOWN' };
  }
  return {
    type: 'UNKNOWN',
    confidence: 0,
    needsReview: true,
    reviewReason: `Unrecognized transaction type: ${rawType || '(empty)'}`,
  };
}

/**
 * Normalize one CSV row into ledger-shaped object (not yet persisted).
 * Supports VDA Ledger generic format and CoinDCX-like trade exports.
 */
export function normalizeRow(row, idx, rowNumber) {
  const raw = {};
  Object.keys(idx).forEach((k) => {
    raw[k] = row[idx[k]];
  });

  const errors = [];
  const timestampRaw =
    cell(row, idx, 'timestamp') ||
    cell(row, idx, 'date') ||
    cell(row, idx, 'time') ||
    cell(row, idx, 'created_at');
  const timestamp = timestampRaw ? new Date(timestampRaw) : null;
  if (!timestamp || Number.isNaN(timestamp.getTime())) {
    errors.push('Invalid or missing timestamp');
  }

  let asset =
    cell(row, idx, 'asset') ||
    cell(row, idx, 'currency') ||
    cell(row, idx, 'coin') ||
    '';
  const market = cell(row, idx, 'market') || cell(row, idx, 'pair') || '';
  if (!asset && market) {
    // BTCINR / BTC_INR / BTC-INR
    asset = market.split(/[-_/]/)[0] || '';
  }
  asset = String(asset).trim().toUpperCase();
  if (!asset) errors.push('Missing asset');

  const classified = classifyTransactionType(
    cell(row, idx, 'type') || cell(row, idx, 'transaction_type'),
    cell(row, idx, 'side'),
  );

  const quantityRaw = cell(row, idx, 'quantity') || cell(row, idx, 'amount') || cell(row, idx, 'qty');
  let quantity;
  try {
    quantity = toDecimal(quantityRaw || '0');
    if (quantity.isNeg()) errors.push('Quantity cannot be negative');
  } catch {
    errors.push('Invalid quantity');
    quantity = null;
  }

  const priceRaw = cell(row, idx, 'price');
  let price = null;
  if (priceRaw !== '') {
    try {
      price = toDecimal(priceRaw);
    } catch {
      errors.push('Invalid price');
    }
  }

  const feeRaw = cell(row, idx, 'fee');
  let fee = null;
  if (feeRaw !== '') {
    try {
      fee = toDecimal(feeRaw);
    } catch {
      errors.push('Invalid fee');
    }
  }

  const grossRaw = cell(row, idx, 'gross_value') || cell(row, idx, 'total') || cell(row, idx, 'gross');
  let grossValue = null;
  if (grossRaw !== '') {
    try {
      grossValue = toDecimal(grossRaw);
    } catch {
      errors.push('Invalid gross value');
    }
  } else if (price && quantity) {
    grossValue = price.times(quantity);
  }

  let netValue = null;
  const netRaw = cell(row, idx, 'net_value') || cell(row, idx, 'net');
  if (netRaw !== '') {
    try {
      netValue = toDecimal(netRaw);
    } catch {
      errors.push('Invalid net value');
    }
  } else if (grossValue) {
    netValue = fee ? grossValue.minus(fee) : grossValue;
  }

  const externalId =
    cell(row, idx, 'external_id') ||
    cell(row, idx, 'external_transaction_id') ||
    cell(row, idx, 'trade_id') ||
    cell(row, idx, 'order_id') ||
    cell(row, idx, 'id') ||
    '';

  const financialYear =
    timestamp && !Number.isNaN(timestamp.getTime())
      ? getFinancialYearForDate(timestamp).id
      : null;

  const status = classified.needsReview || classified.type === 'UNKNOWN' ? 'NEEDS_REVIEW' : 'POSTED';

  return {
    rowNumber,
    status: errors.length ? 'invalid' : classified.needsReview ? 'needs_review' : 'ok',
    errors,
    raw,
    normalized: {
      externalTransactionId: externalId || `csv-row-${rowNumber}`,
      timestamp: timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp.toISOString() : null,
      assetSymbol: asset || null,
      transactionType: classified.type,
      quantity: quantity ? quantity.toString() : null,
      price: price ? price.toString() : null,
      fee: fee ? fee.toString() : null,
      feeAsset: cell(row, idx, 'fee_asset') || 'INR',
      grossValue: grossValue ? grossValue.toString() : null,
      netValue: netValue ? netValue.toString() : null,
      currency: cell(row, idx, 'currency') || 'INR',
      financialYear,
      classificationConfidence: classified.confidence,
      needsReview: classified.needsReview || classified.type === 'UNKNOWN',
      reviewReason: classified.reviewReason || null,
      source: 'CSV_IMPORT',
    },
  };
}

/**
 * Detect duplicates against existing external IDs and within the batch.
 */
export function detectDuplicates(normalizedItems, existingExternalIds = new Set()) {
  const seen = new Set();
  return normalizedItems.map((item) => {
    if (item.status === 'invalid') return { ...item, duplicate: false };
    const ext = item.normalized.externalTransactionId;
    const dupInBatch = seen.has(ext);
    const dupExisting = existingExternalIds.has(ext);
    seen.add(ext);
    if (dupInBatch || dupExisting) {
      return {
        ...item,
        status: 'duplicate',
        duplicate: true,
        duplicateReason: dupExisting ? 'exists_in_ledger' : 'duplicate_in_file',
      };
    }
    return { ...item, duplicate: false };
  });
}

/**
 * Full pipeline for a CSV string.
 */
export function processCsvImport(csvText, { existingExternalIds = new Set() } = {}) {
  const table = parseCsv(csvText);
  if (table.length < 2) {
    throw new Error('CSV must include a header row and at least one data row');
  }
  const headers = table[0];
  const idx = headerIndex(headers);
  const items = [];
  for (let i = 1; i < table.length; i += 1) {
    items.push(normalizeRow(table[i], idx, i + 1));
  }
  const withDupes = detectDuplicates(items, existingExternalIds);

  const summary = {
    totalRows: withDupes.length,
    imported: withDupes.filter((r) => r.status === 'ok').length,
    duplicates: withDupes.filter((r) => r.status === 'duplicate').length,
    invalid: withDupes.filter((r) => r.status === 'invalid').length,
    needsReview: withDupes.filter((r) => r.status === 'needs_review').length,
    unknownTypes: withDupes.filter((r) => r.normalized?.transactionType === 'UNKNOWN').length,
  };

  return { headers, items: withDupes, summary };
}

export const CSV_FORMAT_DOCS = `
VDA Ledger CSV (recommended headers):
timestamp,asset,type,quantity,price,fee,fee_asset,gross_value,net_value,external_id,currency

CoinDCX-like trade export also accepted:
date,market,side,amount,price,fee,total,trade_id
`;
