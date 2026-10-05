/**
 * PriceProvider abstraction.
 * Portfolio valuation must never call third-party APIs on every React render —
 * fetch through this layer + cache (memory / Redis).
 */

import { toDecimal } from '@vda-ledger/financial-engine';

/** @typedef {{ symbol: string, priceInr: string, asOf: string, source: string }} PriceQuote */

export class PriceProvider {
  /** @param {string} asset @returns {Promise<PriceQuote|null>} */
  async getPrice(_asset) {
    throw new Error('Not implemented');
  }

  /** @param {string[]} assets @returns {Promise<Record<string, PriceQuote>>} */
  async getPrices(_assets) {
    throw new Error('Not implemented');
  }

  /**
   * @param {string} asset
   * @param {{ from: Date, to: Date, interval?: 'day'|'hour' }} range
   * @returns {Promise<Array<{ asOf: string, priceInr: string }>>}
   */
  async getHistoricalPrices(_asset, _range) {
    throw new Error('Not implemented');
  }
}

/** Fictional but stable demo quotes for offline development — clearly labeled. */
const DEMO_BASE = {
  BTC: '7200000',
  ETH: '285000',
  SOL: '14500',
  USDT: '84.5',
};

const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDT: 'tether',
};

export class DemoPriceProvider extends PriceProvider {
  constructor(base = DEMO_BASE) {
    super();
    this.base = { ...base };
    this.source = 'demo-provider';
  }

  async getPrice(asset) {
    const symbol = String(asset).toUpperCase();
    const price = this.base[symbol];
    if (!price) return null;
    return {
      symbol,
      priceInr: toDecimal(price).toFixed(12),
      asOf: new Date().toISOString(),
      source: this.source,
    };
  }

  async getPrices(assets) {
    const out = {};
    for (const a of assets) {
      const q = await this.getPrice(a);
      if (q) out[q.symbol] = q;
    }
    return out;
  }

  async getHistoricalPrices(asset, { from, to, interval = 'day' } = {}) {
    const symbol = String(asset).toUpperCase();
    const base = this.base[symbol];
    if (!base) return [];

    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return [];
    }

    const points = [];
    const stepMs = interval === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const baseDec = toDecimal(base);
    let cursor = new Date(start);

    while (cursor <= end) {
      const day = Math.floor(cursor.getTime() / stepMs);
      const wobble = ((day % 17) - 8) * 0.004;
      const price = baseDec.times(toDecimal(1).plus(wobble));
      points.push({
        asOf: cursor.toISOString(),
        priceInr: price.toFixed(12),
      });
      cursor = new Date(cursor.getTime() + stepMs);
    }

    if (points.length) {
      points[points.length - 1] = {
        asOf: end.toISOString(),
        priceInr: baseDec.toFixed(12),
      };
    }

    return points;
  }
}

/**
 * Live CoinGecko market data (INR). Requires PRICE_API_KEY for higher rate limits;
 * public demo endpoint works without a key at low volume.
 */
export class CoinGeckoPriceProvider extends PriceProvider {
  /**
   * @param {{ apiKey?: string, fetchImpl?: typeof fetch }} opts
   */
  constructor({ apiKey = '', fetchImpl = globalThis.fetch } = {}) {
    super();
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.source = apiKey ? 'coingecko' : 'coingecko-public';
    this.baseUrl = 'https://api.coingecko.com/api/v3';
  }

  #headers() {
    const h = { Accept: 'application/json' };
    if (this.apiKey) h['x-cg-demo-api-key'] = this.apiKey;
    return h;
  }

  #id(symbol) {
    return COINGECKO_IDS[String(symbol).toUpperCase()] || null;
  }

  async getPrice(asset) {
    const map = await this.getPrices([asset]);
    return map[String(asset).toUpperCase()] || null;
  }

  async getPrices(assets) {
    const symbols = [...new Set(assets.map((a) => String(a).toUpperCase()))];
    const ids = symbols.map((s) => this.#id(s)).filter(Boolean);
    if (!ids.length) return {};

    const url = new URL(`${this.baseUrl}/simple/price`);
    url.searchParams.set('ids', ids.join(','));
    url.searchParams.set('vs_currencies', 'inr');

    const res = await this.fetchImpl(url, { headers: this.#headers() });
    if (!res.ok) {
      throw new Error(`CoinGecko price fetch failed (${res.status})`);
    }
    const data = await res.json();
    const out = {};
    const asOf = new Date().toISOString();
    for (const symbol of symbols) {
      const id = this.#id(symbol);
      const inr = id ? data?.[id]?.inr : null;
      if (inr == null) continue;
      out[symbol] = {
        symbol,
        priceInr: toDecimal(String(inr)).toFixed(12),
        asOf,
        source: this.source,
      };
    }
    return out;
  }

  async getHistoricalPrices(asset, { from, to } = {}) {
    const id = this.#id(asset);
    if (!id) return [];
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/coins/${id}/market_chart/range`);
    url.searchParams.set('vs_currency', 'inr');
    url.searchParams.set('from', String(Math.floor(start.getTime() / 1000)));
    url.searchParams.set('to', String(Math.floor(end.getTime() / 1000)));

    const res = await this.fetchImpl(url, { headers: this.#headers() });
    if (!res.ok) {
      throw new Error(`CoinGecko history fetch failed (${res.status})`);
    }
    const data = await res.json();
    const prices = Array.isArray(data?.prices) ? data.prices : [];
    return prices.map(([ms, price]) => ({
      asOf: new Date(ms).toISOString(),
      priceInr: toDecimal(String(price)).toFixed(12),
    }));
  }
}

/**
 * In-memory TTL cache wrapping any PriceProvider.
 * Optional Redis client can be injected for shared cache.
 */
export class CachedPriceProvider extends PriceProvider {
  constructor(inner, { ttlMs = 30_000, redis = null } = {}) {
    super();
    this.inner = inner;
    this.ttlMs = ttlMs;
    this.redis = redis;
    /** @type {Map<string, { expires: number, value: any }>} */
    this.memory = new Map();
  }

  #memGet(key) {
    const hit = this.memory.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expires) {
      this.memory.delete(key);
      return null;
    }
    return hit.value;
  }

  #memSet(key, value) {
    this.memory.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  async #redisGet(key) {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async #redisSet(key, value) {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'PX', this.ttlMs);
    } catch {
      // ignore cache write failures
    }
  }

  async getPrice(asset) {
    const key = `price:${String(asset).toUpperCase()}`;
    const mem = this.#memGet(key);
    if (mem) return mem;
    const redisHit = await this.#redisGet(key);
    if (redisHit) {
      this.#memSet(key, redisHit);
      return redisHit;
    }
    const quote = await this.inner.getPrice(asset);
    if (quote) {
      this.#memSet(key, quote);
      await this.#redisSet(key, quote);
    }
    return quote;
  }

  async getPrices(assets) {
    const unique = [...new Set(assets.map((a) => String(a).toUpperCase()))];
    const out = {};
    const missing = [];
    for (const symbol of unique) {
      const key = `price:${symbol}`;
      const mem = this.#memGet(key);
      if (mem) {
        out[symbol] = mem;
        continue;
      }
      const redisHit = await this.#redisGet(key);
      if (redisHit) {
        this.#memSet(key, redisHit);
        out[symbol] = redisHit;
        continue;
      }
      missing.push(symbol);
    }
    if (missing.length) {
      const fetched = await this.inner.getPrices(missing);
      for (const [symbol, quote] of Object.entries(fetched)) {
        out[symbol] = quote;
        this.#memSet(`price:${symbol}`, quote);
        await this.#redisSet(`price:${symbol}`, quote);
      }
    }
    return out;
  }

  async getHistoricalPrices(asset, range) {
    const from = range?.from?.toISOString?.() || range?.from;
    const to = range?.to?.toISOString?.() || range?.to;
    const key = `hist:${String(asset).toUpperCase()}:${from}:${to}:${range?.interval || 'day'}`;
    const mem = this.#memGet(key);
    if (mem) return mem;
    const points = await this.inner.getHistoricalPrices(asset, range);
    this.#memSet(key, points);
    return points;
  }
}

/**
 * Prefer live CoinGecko when PRICE_PROVIDER=coingecko (default) and network is available.
 * Falls back to demo quotes when live fetch fails or provider=demo.
 */
export function createPriceProvider({
  redis = null,
  demoMode = true,
  priceApiKey = '',
  priceProvider = 'coingecko',
} = {}) {
  const preferLive = priceProvider !== 'demo' && (!demoMode || priceApiKey || priceProvider === 'coingecko');
  let inner;
  if (preferLive && priceProvider !== 'demo') {
    const live = new CoinGeckoPriceProvider({ apiKey: priceApiKey });
    const demo = new DemoPriceProvider();
    inner = {
      async getPrice(asset) {
        try {
          return await live.getPrice(asset);
        } catch {
          return demo.getPrice(asset);
        }
      },
      async getPrices(assets) {
        try {
          const quotes = await live.getPrices(assets);
          if (Object.keys(quotes).length) return quotes;
        } catch {
          // fall through
        }
        return demo.getPrices(assets);
      },
      async getHistoricalPrices(asset, range) {
        try {
          const points = await live.getHistoricalPrices(asset, range);
          if (points.length) return points;
        } catch {
          // fall through
        }
        return demo.getHistoricalPrices(asset, range);
      },
    };
  } else {
    inner = new DemoPriceProvider();
  }
  return new CachedPriceProvider(inner, { ttlMs: 30_000, redis });
}

export { DEMO_BASE, COINGECKO_IDS };
