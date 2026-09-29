import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CoinDCXAdapter,
  CSVAdapter,
  CredentialError,
  createExchangeAdapter,
  normalizeCoinDcxTrade,
  parseCoinDcxMarket,
} from './index.js';

describe('parseCoinDcxMarket', () => {
  it('splits INR and crypto quote markets', () => {
    assert.deepEqual(parseCoinDcxMarket('BTCINR'), { base: 'BTC', quote: 'INR', raw: 'BTCINR' });
    assert.deepEqual(parseCoinDcxMarket('ETHBTC'), { base: 'ETH', quote: 'BTC', raw: 'ETHBTC' });
  });
});

describe('normalizeCoinDcxTrade', () => {
  it('normalizes buy trade without inventing fields', () => {
    const n = normalizeCoinDcxTrade({
      id: 99,
      order_id: '1',
      side: 'buy',
      fee_amount: 10,
      quantity: 0.01,
      price: 6000000,
      symbol: 'BTCINR',
      timestamp: Date.parse('2025-04-12T09:30:00.000Z'),
    });
    assert.equal(n.externalId, '99');
    assert.equal(n.assetSymbol, 'BTC');
    assert.equal(n.transactionType, 'BUY');
    assert.equal(n.needsReview, false);
    assert.ok(n.grossValue);
    assert.ok(n.netValue);
  });
});

describe('CoinDCXAdapter without credentials', () => {
  it('refuses connect without fabricating data', async () => {
    const adapter = new CoinDCXAdapter({});
    await assert.rejects(() => adapter.connect(), CredentialError);
    await assert.rejects(() => adapter.getBalances(), CredentialError);
  });

  it('capabilities.liveHttp is false without keys', () => {
    const adapter = createExchangeAdapter('COINDCX', {});
    assert.equal(adapter.capabilities.liveHttp, false);
    assert.equal(adapter.capabilities.readOnly, true);
  });
});

describe('CoinDCXAdapter with mocked fetch', () => {
  it('signs and returns balances from official shape', async () => {
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, opts });
      assert.ok(opts.headers['X-AUTH-APIKEY']);
      assert.ok(opts.headers['X-AUTH-SIGNATURE']);
      if (url.endsWith('/users/info')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ coindcx_id: 'x', email: 'a@b.c' }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([{ currency: 'BTC', balance: 1.5, locked_balance: 0.1 }]),
      };
    };
    const adapter = new CoinDCXAdapter({
      apiKey: 'key',
      apiSecret: 'secret',
      fetchImpl,
    });
    await adapter.connect();
    const balances = await adapter.getBalances();
    assert.equal(balances[0].currency, 'BTC');
    assert.equal(balances[0].balance, '1.5');
    assert.equal(calls.length, 2);
  });

  it('normalizes trade_history into ledger transactions', async () => {
    const fetchImpl = async (url) => {
      if (url.endsWith('/trade_history')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: 1,
                order_id: 'o1',
                side: 'sell',
                fee_amount: 5,
                quantity: 0.1,
                price: 7000000,
                symbol: 'BTCINR',
                timestamp: Date.parse('2025-08-10T00:00:00.000Z'),
              },
            ]),
        };
      }
      return { ok: true, status: 200, text: async () => '[]' };
    };
    const adapter = new CoinDCXAdapter({ apiKey: 'k', apiSecret: 's', fetchImpl });
    const txns = await adapter.getTransactions();
    assert.equal(txns.length, 1);
    assert.equal(txns[0].transactionType, 'SELL');
    assert.equal(txns[0].assetSymbol, 'BTC');
  });
});

describe('CSVAdapter', () => {
  it('parses CoinDCX-like CSV without live credentials', async () => {
    const csv = `date,market,side,amount,price,fee,total,trade_id
2025-04-12T09:30:00.000Z,BTCINR,buy,0.01,6000000,120,60120,csv-1
2025-04-12T09:30:00.000Z,BTCINR,buy,0.01,6000000,120,60120,csv-1
`;
    const adapter = new CSVAdapter({ csvText: csv, existingExternalIds: [] });
    await adapter.connect();
    const txns = await adapter.getTransactions();
    assert.ok(txns.length >= 1);
    const summary = adapter.getImportSummary();
    assert.ok(summary);
    assert.ok(summary.duplicates >= 1 || summary.imported >= 1);
  });
});
