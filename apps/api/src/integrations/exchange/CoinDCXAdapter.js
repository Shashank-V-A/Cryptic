/**
 * CoinDCX read-only adapter.
 *
 * Official endpoints (https://docs.coindcx.com/):
 * - POST /exchange/v1/users/balances
 * - POST /exchange/v1/users/info
 * - POST /exchange/v1/orders/trade_history
 * - POST /exchange/v1/orders/active_orders
 *
 * Auth: HMAC-SHA256 of JSON body with API secret; headers X-AUTH-APIKEY / X-AUTH-SIGNATURE.
 * Without credentials: CredentialError — never invents balances or trades.
 */

import crypto from 'node:crypto';
import { ExchangeAdapter, CredentialError, ExchangeError } from './ExchangeAdapter.js';
import { normalizeCoinDcxTrade } from './coindcxNormalize.js';

const BASE_URL = 'https://api.coindcx.com';

export class CoinDCXAdapter extends ExchangeAdapter {
  constructor({ apiKey, apiSecret, fetchImpl = fetch } = {}) {
    super();
    this.apiKey = apiKey ? String(apiKey).trim() : '';
    this.apiSecret = apiSecret ? String(apiSecret).trim() : '';
    this.fetchImpl = fetchImpl;
    this.connected = false;
    this.userInfo = null;
  }

  get slug() {
    return 'COINDCX';
  }

  get capabilities() {
    return {
      readOnly: true,
      liveHttp: Boolean(this.apiKey && this.apiSecret),
      csv: false,
      endpoints: {
        balances: '/exchange/v1/users/balances',
        info: '/exchange/v1/users/info',
        trades: '/exchange/v1/orders/trade_history',
        activeOrders: '/exchange/v1/orders/active_orders',
        deposits: '/exchange/v1/transfers/deposits',
        withdrawals: '/exchange/v1/transfers/withdrawals',
      },
    };
  }

  #assertCredentials() {
    if (!this.apiKey || !this.apiSecret) {
      throw new CredentialError(
        'CoinDCX read-only API key and secret are required. Create a read-only key on CoinDCX, or use CSV import. Live responses are never fabricated.',
      );
    }
  }

  #sign(body) {
    const payload = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', this.apiSecret).update(payload).digest('hex');
    return { payload, signature };
  }

  async #signedPost(path, bodyExtra = {}) {
    this.#assertCredentials();
    const body = {
      ...bodyExtra,
      timestamp: Date.now(),
    };
    const { payload, signature } = this.#sign(body);

    let res;
    try {
      res = await this.fetchImpl(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-APIKEY': this.apiKey,
          'X-AUTH-SIGNATURE': signature,
        },
        body: payload,
      });
    } catch (err) {
      throw new ExchangeError(`CoinDCX network error: ${err.message}`, {
        code: 'NETWORK_ERROR',
        status: 502,
      });
    }

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new ExchangeError('CoinDCX returned non-JSON response', {
        code: 'BAD_RESPONSE',
        status: 502,
        details: { status: res.status, preview: text.slice(0, 200) },
      });
    }

    if (!res.ok) {
      throw new ExchangeError(
        data?.message || data?.error || `CoinDCX HTTP ${res.status}`,
        {
          code: 'HTTP_ERROR',
          status: res.status >= 400 && res.status < 600 ? res.status : 502,
          details: data,
        },
      );
    }

    return data;
  }

  async connect() {
    this.#assertCredentials();
    this.userInfo = await this.#signedPost('/exchange/v1/users/info');
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
    this.userInfo = null;
  }

  async getBalances() {
    const data = await this.#signedPost('/exchange/v1/users/balances');
    if (!Array.isArray(data)) {
      throw new ExchangeError('Unexpected balances payload from CoinDCX', {
        code: 'BAD_RESPONSE',
        details: data,
      });
    }
    return data.map((row) => ({
      currency: String(row.currency || '').toUpperCase(),
      balance: String(row.balance ?? '0'),
      lockedBalance: String(row.locked_balance ?? '0'),
      raw: row,
    }));
  }

  async getTrades({ fromId, limit = 500, fromTimestamp, toTimestamp, symbol } = {}) {
    const body = { limit: Math.min(Number(limit) || 500, 500), sort: 'asc' };
    if (fromId != null && fromId !== '') {
      const n = Number(fromId);
      body.from_id = Number.isSafeInteger(n) ? n : fromId;
    }
    if (fromTimestamp != null) body.from_timestamp = Number(fromTimestamp);
    if (toTimestamp != null) body.to_timestamp = Number(toTimestamp);
    if (symbol) body.symbol = symbol;

    const data = await this.#signedPost('/exchange/v1/orders/trade_history', body);
    if (!Array.isArray(data)) {
      throw new ExchangeError('Unexpected trade_history payload from CoinDCX', {
        code: 'BAD_RESPONSE',
        details: data,
      });
    }
    return data;
  }

  async getOrders() {
    const data = await this.#signedPost('/exchange/v1/orders/active_orders');
    return Array.isArray(data) ? data : data?.orders || [];
  }

  /**
   * Ledger-oriented sync: pull trades and normalize. Paginates via from_id.
   */
  async getTransactions({ fromId = null, maxPages = 20 } = {}) {
    const all = [];
    let cursor = fromId;
    for (let page = 0; page < maxPages; page += 1) {
      const batch = await this.getTrades({ fromId: cursor, limit: 500 });
      if (!batch.length) break;
      all.push(...batch);
      const lastId = batch[batch.length - 1]?.id;
      if (lastId == null || batch.length < 500) break;
      cursor = lastId;
    }
    return all.map(normalizeCoinDcxTrade);
  }

  /**
   * @returns {Promise<Array & { warning?: string }>}
   */
  async #fetchTransferList(path, kind) {
    const empty = [];
    try {
      const data = await this.#signedPost(path, { limit: 500 });
      const rows = Array.isArray(data) ? data : data?.deposits || data?.withdrawals || data?.data;
      if (!Array.isArray(rows)) {
        empty.warning = `CoinDCX ${kind} response was not a list — import ${kind} via CSV if needed.`;
        return empty;
      }
      return rows;
    } catch (err) {
      empty.warning =
        err.message ||
        `CoinDCX ${kind} history unavailable — sync covers trades only; import ${kind} via CSV.`;
      return empty;
    }
  }

  async getDeposits() {
    return this.#fetchTransferList('/exchange/v1/transfers/deposits', 'deposit');
  }

  async getWithdrawals() {
    return this.#fetchTransferList('/exchange/v1/transfers/withdrawals', 'withdrawal');
  }
}
