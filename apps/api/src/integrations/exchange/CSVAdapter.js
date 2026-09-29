/**
 * CSV exchange adapter — full read path without live API credentials.
 * Uses financial-engine CSV normalize/dedupe pipeline.
 */

import { processCsvImport } from '@vda-ledger/financial-engine/csv';
import { ExchangeAdapter } from './ExchangeAdapter.js';

export class CSVAdapter extends ExchangeAdapter {
  /**
   * @param {{ csvText?: string, rows?: Array, existingExternalIds?: Set<string>|string[] }} opts
   */
  constructor({ csvText = '', rows = null, existingExternalIds = [] } = {}) {
    super();
    this.csvText = csvText;
    this.preparsedRows = rows;
    this.existingExternalIds = existingExternalIds;
    this.connected = false;
    this.lastImportResult = null;
  }

  get slug() {
    return 'CSV';
  }

  get capabilities() {
    return { readOnly: true, liveHttp: false, csv: true };
  }

  async connect() {
    if (!this.csvText && !this.preparsedRows) {
      throw new Error('CSVAdapter requires csvText or rows');
    }
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
  }

  async getBalances() {
    // CSV path has no live balances — empty is honest, not fabricated.
    return [];
  }

  async getTrades() {
    return this.getTransactions();
  }

  async getOrders() {
    return [];
  }

  async getTransactions() {
    if (this.preparsedRows) {
      return this.preparsedRows;
    }
    const existing = new Set(
      Array.isArray(this.existingExternalIds)
        ? this.existingExternalIds
        : [...this.existingExternalIds],
    );
    const result = processCsvImport(this.csvText, { existingExternalIds: existing });
    this.lastImportResult = result;
    return result.items
      .filter((i) => i.status === 'ok' || i.status === 'needs_review')
      .map((i) => {
        const n = i.normalized;
        return {
          externalId: n.externalTransactionId,
          timestamp: n.timestamp,
          assetSymbol: n.assetSymbol,
          transactionType: n.transactionType,
          quantity: n.quantity,
          price: n.price,
          fee: n.fee,
          grossValue: n.grossValue,
          netValue: n.netValue,
          currency: n.currency || 'INR',
          financialYear: n.financialYear,
          needsReview: n.needsReview,
          reviewReason: n.reviewReason,
          raw: i.raw,
          importStatus: i.status,
          duplicate: i.status === 'duplicate',
        };
      });
  }

  getImportSummary() {
    return this.lastImportResult?.summary || null;
  }
}
