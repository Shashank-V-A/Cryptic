/**
 * Exchange adapter architecture — read-only only.
 * Never request trade / withdraw / transfer permissions.
 *
 * Live HTTP is only used when credentials are present.
 * Missing credentials → clear CredentialError (no fabricated balances/trades).
 */

export class ExchangeError extends Error {
  constructor(message, { code = 'EXCHANGE_ERROR', status = 500, details = null } = {}) {
    super(message);
    this.name = 'ExchangeError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class CredentialError extends ExchangeError {
  constructor(message, details = null) {
    super(message, { code: 'CREDENTIALS_REQUIRED', status: 400, details });
    this.name = 'CredentialError';
  }
}

export class UnsupportedReadError extends ExchangeError {
  constructor(message, details = null) {
    super(message, { code: 'UNSUPPORTED_READ', status: 501, details });
    this.name = 'UnsupportedReadError';
  }
}

/**
 * Normalized ledger-ready trade event produced by adapters.
 * @typedef {{
 *   externalId: string,
 *   timestamp: string,
 *   assetSymbol: string,
 *   transactionType: 'BUY'|'SELL'|string,
 *   quantity: string,
 *   price: string|null,
 *   fee: string|null,
 *   grossValue: string|null,
 *   netValue: string|null,
 *   currency: string,
 *   raw: object,
 * }} NormalizedExchangeTxn
 */

export class ExchangeAdapter {
  /** @returns {string} */
  get slug() {
    throw new Error('slug not implemented');
  }

  /** @returns {{ readOnly: boolean, liveHttp: boolean, csv: boolean }} */
  get capabilities() {
    return { readOnly: true, liveHttp: false, csv: false };
  }

  /** @returns {Promise<void>} */
  async connect() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<void>} */
  async disconnect() {
    this.connected = false;
  }

  /** @returns {Promise<Array<{ currency: string, balance: string, lockedBalance?: string }>>} */
  async getBalances() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<NormalizedExchangeTxn[]>} */
  async getTransactions(_opts = {}) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Array>} */
  async getOrders(_opts = {}) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Array>} */
  async getTrades(_opts = {}) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Array>} */
  async getDeposits(_opts = {}) {
    throw new UnsupportedReadError(
      `${this.slug}: deposits endpoint not wired — use CSV import for deposit history.`,
    );
  }

  /** @returns {Promise<Array>} */
  async getWithdrawals(_opts = {}) {
    throw new UnsupportedReadError(
      `${this.slug}: withdrawals endpoint not wired — use CSV import for withdrawal history.`,
    );
  }
}

export { normalizeCoinDcxTrade, parseCoinDcxMarket } from './coindcxNormalize.js';
