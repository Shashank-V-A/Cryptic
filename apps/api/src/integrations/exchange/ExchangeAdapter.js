/**
 * Exchange adapter abstraction.
 * Only read permissions are supported — never request trade/withdraw access.
 *
 * Live CoinDCX wiring is Phase 8. This Phase 1 stub defines the contract.
 */

export class ExchangeAdapter {
  /** @returns {Promise<void>} */
  async connect() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<void>} */
  async disconnect() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Array>} */
  async getBalances() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Array>} */
  async getTransactions() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Array>} */
  async getOrders() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Array>} */
  async getTrades() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Array>} */
  async getDeposits() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Array>} */
  async getWithdrawals() {
    throw new Error('Not implemented');
  }
}

/**
 * CoinDCX adapter — interface only until read-only credentials + Phase 8 sync.
 * Does not fake live API responses.
 */
export class CoinDCXAdapter extends ExchangeAdapter {
  constructor({ apiKey, apiSecret } = {}) {
    super();
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.connected = false;
  }

  async connect() {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'CoinDCX read-only API credentials are required. Live sync is not available until configured (Phase 8). Use CSV import in the meantime.',
      );
    }
    // Live HTTP client lands in Phase 8 — refuse to pretend connectivity.
    throw new Error(
      'CoinDCX live adapter is not implemented yet. CSV import and demo seed are the supported ingestion paths in early phases.',
    );
  }
}

export class CSVAdapter extends ExchangeAdapter {
  constructor({ rows } = {}) {
    super();
    this.rows = rows || [];
  }

  async connect() {
    return undefined;
  }

  async disconnect() {
    return undefined;
  }

  async getTransactions() {
    return this.rows;
  }
}
