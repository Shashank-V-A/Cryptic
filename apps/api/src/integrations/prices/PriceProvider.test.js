import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DemoPriceProvider, CachedPriceProvider } from './PriceProvider.js';

describe('DemoPriceProvider', () => {
  it('returns Decimal-string quotes for known assets', async () => {
    const p = new DemoPriceProvider();
    const btc = await p.getPrice('btc');
    assert.equal(btc.symbol, 'BTC');
    assert.ok(btc.priceInr.includes('.'));
    assert.equal(btc.source, 'demo-provider');
  });

  it('returns null for unknown assets (never invents 0)', async () => {
    const p = new DemoPriceProvider();
    assert.equal(await p.getPrice('DOGE'), null);
  });

  it('builds deterministic historical series', async () => {
    const p = new DemoPriceProvider();
    const from = new Date('2025-06-01T00:00:00Z');
    const to = new Date('2025-06-05T00:00:00Z');
    const a = await p.getHistoricalPrices('ETH', { from, to });
    const b = await p.getHistoricalPrices('ETH', { from, to });
    assert.equal(a.length, b.length);
    assert.deepEqual(a, b);
    assert.ok(a.length >= 4);
  });
});

describe('CachedPriceProvider', () => {
  it('serves second getPrice from memory cache', async () => {
    let calls = 0;
    const inner = {
      async getPrice(asset) {
        calls += 1;
        return {
          symbol: asset.toUpperCase(),
          priceInr: '100.000000000000',
          asOf: new Date().toISOString(),
          source: 'test',
        };
      },
      async getPrices() {
        return {};
      },
      async getHistoricalPrices() {
        return [];
      },
    };
    const cached = new CachedPriceProvider(inner, { ttlMs: 60_000 });
    await cached.getPrice('BTC');
    await cached.getPrice('BTC');
    assert.equal(calls, 1);
  });
});
