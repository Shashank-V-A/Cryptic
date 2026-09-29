import { prisma } from '../lib/prisma.js';
import {
  buildLedgerState,
  decimalToString,
  toDecimal,
  zero,
} from '@vda-ledger/financial-engine';
import { createPriceProvider } from '../integrations/prices/PriceProvider.js';
import { getRedis } from '../lib/redis.js';
import { loadApiConfig } from '@vda-ledger/config';

const config = loadApiConfig();

let priceProvider;
function getPriceProvider() {
  if (!priceProvider) {
    let redis = null;
    try {
      redis = getRedis(config.redisUrl);
    } catch {
      redis = null;
    }
    priceProvider = createPriceProvider({ redis, demoMode: config.demoMode });
  }
  return priceProvider;
}

function serializeHolding(h, totalValue) {
  let allocationPct = null;
  if (
    h.priceAvailable &&
    h.currentValueInr != null &&
    totalValue &&
    toDecimal(totalValue).gt(0)
  ) {
    allocationPct = toDecimal(h.currentValueInr)
      .div(toDecimal(totalValue))
      .times(100)
      .toFixed(4);
  }

  let pnlPct = null;
  if (h.priceAvailable && h.unrealizedPnlInr != null && toDecimal(h.totalCostInr).gt(0)) {
    pnlPct = toDecimal(h.unrealizedPnlInr).div(toDecimal(h.totalCostInr)).times(100).toFixed(4);
  }

  return {
    assetSymbol: h.assetSymbol,
    quantity: decimalToString(h.quantity, 18),
    averageCostInr: decimalToString(h.averageCostInr, 12),
    totalCostInr: decimalToString(h.totalCostInr, 12),
    currentPriceInr: h.currentPriceInr != null ? decimalToString(h.currentPriceInr, 12) : null,
    currentValueInr: h.currentValueInr != null ? decimalToString(h.currentValueInr, 12) : null,
    unrealizedPnlInr: h.unrealizedPnlInr != null ? decimalToString(h.unrealizedPnlInr, 12) : null,
    unrealizedPnlPct: pnlPct,
    allocationPct,
    priceAvailable: h.priceAvailable,
    lots: h.lots.map((l) => ({
      id: l.id,
      sourceTransactionId: l.sourceTransactionId,
      acquiredAt: l.acquiredAt,
      remainingQuantity: decimalToString(l.remainingQuantity, 18),
      unitCostInr: decimalToString(l.unitCostInr, 12),
      financialYear: l.financialYear,
    })),
  };
}

function secondsAgo(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

export const portfolioService = {
  async getPrices(symbols) {
    const provider = getPriceProvider();
    const quotes = await provider.getPrices(symbols);
    const pricesByAsset = {};
    let asOf = new Date().toISOString();
    let source = 'price-provider';
    for (const [symbol, q] of Object.entries(quotes)) {
      pricesByAsset[symbol] = q.priceInr;
      asOf = q.asOf;
      source = q.source;
    }
    return { pricesByAsset, asOf, source, quotes };
  },

  async persistAssetPrices(quotes) {
    for (const q of Object.values(quotes)) {
      const asset = await prisma.asset.findUnique({ where: { symbol: q.symbol } });
      if (!asset) continue;
      const asOf = new Date(q.asOf);
      try {
        await prisma.assetPrice.upsert({
          where: {
            assetId_asOf_source: {
              assetId: asset.id,
              asOf,
              source: q.source,
            },
          },
          update: { priceInr: q.priceInr },
          create: {
            assetId: asset.id,
            priceInr: q.priceInr,
            source: q.source,
            asOf,
          },
        });
      } catch {
        // unique race — ignore
      }
    }
  },

  async loadNormalizedTransactions(userId) {
    const rows = await prisma.transaction.findMany({
      where: { userId, status: { in: ['POSTED', 'NEEDS_REVIEW'] } },
      include: { asset: true },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });
    return rows.map((t) => ({
      id: t.id,
      timestamp: t.timestamp.toISOString(),
      assetSymbol: t.asset.symbol,
      transactionType: t.transactionType,
      quantity: t.quantity.toString(),
      price: t.price?.toString() ?? null,
      fee: t.fee?.toString() ?? null,
      grossValue: t.grossValue?.toString() ?? null,
      netValue: t.netValue?.toString() ?? null,
      currency: t.currency,
      financialYear: t.financialYear,
    }));
  },

  async calculate(userId, { persistSnapshot = false } = {}) {
    const txns = await this.loadNormalizedTransactions(userId);
    const symbols = [...new Set(txns.map((t) => t.assetSymbol))];
    const { pricesByAsset, asOf, source, quotes } = await this.getPrices(symbols);
    await this.persistAssetPrices(quotes).catch(() => {});

    const state = buildLedgerState(txns, { pricesByAsset });
    const totalValue =
      state.summary.currentValue != null ? state.summary.currentValue : zero();

    const holdings = state.holdings.map((h) => serializeHolding(h, totalValue));
    holdings.sort((a, b) => {
      const av = a.currentValueInr ? toDecimal(a.currentValueInr) : zero();
      const bv = b.currentValueInr ? toDecimal(b.currentValueInr) : zero();
      return bv.cmp(av);
    });

    const allocation = holdings
      .filter((h) => h.allocationPct != null)
      .map((h) => ({
        assetSymbol: h.assetSymbol,
        valueInr: h.currentValueInr,
        allocationPct: h.allocationPct,
      }));

    const result = {
      asOf,
      priceSource: source,
      pricesUpdatedSecondsAgo: secondsAgo(asOf),
      methodology: state.methodology,
      summary: {
        totalInvested: decimalToString(state.summary.totalInvested, 12),
        currentValue:
          state.summary.currentValue != null
            ? decimalToString(state.summary.currentValue, 12)
            : null,
        realizedPnl: decimalToString(state.summary.realizedPnl, 12),
        unrealizedPnl:
          state.summary.unrealizedPnl != null
            ? decimalToString(state.summary.unrealizedPnl, 12)
            : null,
        totalReturn:
          state.summary.totalReturn != null
            ? decimalToString(state.summary.totalReturn, 12)
            : null,
        priceAvailable: state.summary.priceAvailable,
      },
      holdings,
      allocation,
      warnings: state.warnings,
      transactionCount: txns.length,
    };

    if (persistSnapshot) {
      await this.saveSnapshot(userId, result);
    }

    return result;
  },

  async saveSnapshot(userId, portfolio) {
    const asOf = new Date(portfolio.asOf || Date.now());
    // Never invent 0 for missing mark-to-market fields — store null when prices unavailable.
    const snapshot = await prisma.portfolioSnapshot.create({
      data: {
        userId,
        asOf,
        totalInvested: portfolio.summary.totalInvested ?? '0',
        currentValue: portfolio.summary.currentValue,
        realizedPnl: portfolio.summary.realizedPnl ?? '0',
        unrealizedPnl: portfolio.summary.unrealizedPnl,
        holdings: {
          create: portfolio.holdings.map((h) => ({
            asset: { connect: { symbol: h.assetSymbol } },
            quantity: h.quantity,
            averageCostInr: h.averageCostInr,
            currentPriceInr: h.currentPriceInr,
            currentValueInr: h.currentValueInr,
            unrealizedPnlInr: h.unrealizedPnlInr,
          })),
        },
      },
    });
    return snapshot;
  },

  async listSnapshots(userId, { take = 90 } = {}) {
    const rows = await prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { asOf: 'asc' },
      take,
      include: { holdings: { include: { asset: true } } },
    });
    return rows.map((s) => ({
      id: s.id,
      asOf: s.asOf.toISOString(),
      totalInvested: s.totalInvested.toString(),
      currentValue: s.currentValue?.toString() ?? null,
      realizedPnl: s.realizedPnl.toString(),
      unrealizedPnl: s.unrealizedPnl?.toString() ?? null,
    }));
  },

  /**
   * Performance series: mark portfolio at each transaction date (+ today)
   * using historical prices from PriceProvider. Deterministic for demo provider.
   */
  async performanceSeries(userId, { days = 90 } = {}) {
    const txns = await this.loadNormalizedTransactions(userId);
    if (!txns.length) {
      return { points: [], rangeDays: days };
    }

    const provider = getPriceProvider();
    const symbols = [...new Set(txns.map((t) => t.assetSymbol))];
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const firstTxn = new Date(txns[0].timestamp);
    const from = firstTxn > start ? firstTxn : start;

    /** @type {Record<string, Array<{asOf:string,priceInr:string}>>} */
    const hist = {};
    for (const symbol of symbols) {
      hist[symbol] = await provider.getHistoricalPrices(symbol, {
        from,
        to: end,
        interval: 'day',
      });
    }

    // Sample dates = unique txn calendar days + end
    const dateKeys = new Set();
    for (const t of txns) {
      dateKeys.add(t.timestamp.slice(0, 10));
    }
    dateKeys.add(end.toISOString().slice(0, 10));
    const dates = [...dateKeys].sort();

    function priceOn(symbol, day) {
      const series = hist[symbol] || [];
      let best = null;
      for (const p of series) {
        if (p.asOf.slice(0, 10) <= day) best = p;
      }
      return best?.priceInr ?? null;
    }

    const points = [];
    for (const day of dates) {
      const subset = txns.filter((t) => t.timestamp.slice(0, 10) <= day);
      const pricesByAsset = {};
      for (const symbol of symbols) {
        const p = priceOn(symbol, day);
        if (p) pricesByAsset[symbol] = p;
      }
      const state = buildLedgerState(subset, { pricesByAsset });
      points.push({
        date: day,
        invested: decimalToString(state.summary.totalInvested, 12),
        value:
          state.summary.currentValue != null
            ? decimalToString(state.summary.currentValue, 12)
            : null,
        realizedPnl: decimalToString(state.summary.realizedPnl, 12),
        unrealizedPnl:
          state.summary.unrealizedPnl != null
            ? decimalToString(state.summary.unrealizedPnl, 12)
            : null,
      });
    }

    // Merge DB snapshots if present
    const snapshots = await this.listSnapshots(userId, { take: 120 });
    return {
      points,
      snapshots: snapshots.map((s) => ({
        date: s.asOf.slice(0, 10),
        invested: s.totalInvested,
        value: s.currentValue,
        realizedPnl: s.realizedPnl,
        unrealizedPnl: s.unrealizedPnl,
      })),
      rangeDays: days,
      methodology: 'FIFO mark-to-market on transaction dates',
    };
  },

  async assetDetail(userId, symbol) {
    const upper = symbol.toUpperCase();
    const txns = await this.loadNormalizedTransactions(userId);
    const symbols = [...new Set(txns.map((t) => t.assetSymbol))];
    const { pricesByAsset, asOf, source } = await this.getPrices(symbols);
    const state = buildLedgerState(txns, { pricesByAsset });
    const holdingRaw = state.holdings.find((h) => h.assetSymbol === upper);
    if (!holdingRaw) return null;

    const totalValue =
      state.summary.currentValue != null ? state.summary.currentValue : zero();
    const holding = serializeHolding(holdingRaw, totalValue);

    // Per-asset realized P&L from sell allocations for this symbol only
    let realizedAsset = zero();
    for (const [sellId, allocations] of state.allocationsBySellId.entries()) {
      const sellTxn = txns.find((t) => t.id === sellId);
      if (!sellTxn || sellTxn.assetSymbol !== upper || sellTxn.transactionType !== 'SELL') {
        continue;
      }
      for (const a of allocations) {
        realizedAsset = realizedAsset.plus(toDecimal(a.realizedPnlInr));
      }
    }

    const provider = getPriceProvider();
    const to = new Date();
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const priceHistory = await provider.getHistoricalPrices(upper, {
      from,
      to,
      interval: 'day',
    });

    const assetTxns = await prisma.transaction.findMany({
      where: {
        userId,
        asset: { symbol: upper },
      },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        timestamp: true,
        transactionType: true,
        quantity: true,
        price: true,
        netValue: true,
        status: true,
      },
    });

    return {
      ...holding,
      methodology: state.methodology,
      asOf,
      priceSource: source,
      pricesUpdatedSecondsAgo: secondsAgo(asOf),
      priceHistory: priceHistory.map((p) => ({
        date: p.asOf.slice(0, 10),
        priceInr: p.priceInr,
      })),
      transactions: assetTxns.map((t) => ({
        id: t.id,
        timestamp: t.timestamp,
        type: t.transactionType,
        quantity: t.quantity.toString(),
        price: t.price?.toString() ?? null,
        netValue: t.netValue?.toString() ?? null,
        status: t.status,
      })),
      realizedPnlInr: decimalToString(realizedAsset, 12),
      warnings: state.warnings.filter(
        (w) =>
          assetTxns.some((t) => t.id === w.transactionId) ||
          String(w.message || '').includes(upper),
      ),
    };
  },

  async recalculateAndPersistLots(userId) {
    const txns = await this.loadNormalizedTransactions(userId);
    const symbols = [...new Set(txns.map((t) => t.assetSymbol))];
    const { pricesByAsset } = await this.getPrices(symbols);
    const state = buildLedgerState(txns, { pricesByAsset });

    await prisma.$transaction(async (tx) => {
      await tx.lotAllocation.deleteMany({
        where: { sellTransaction: { userId } },
      });
      await tx.acquisitionLot.deleteMany({ where: { userId } });

      const assetCache = new Map();
      async function assetId(sym) {
        if (assetCache.has(sym)) return assetCache.get(sym);
        const a = await tx.asset.findUnique({ where: { symbol: sym } });
        if (!a) throw new Error(`Asset missing: ${sym}`);
        assetCache.set(sym, a.id);
        return a.id;
      }

      const lotIdMap = new Map();

      for (const [, lots] of state.lotsByAsset.entries()) {
        for (const lot of lots) {
          const created = await tx.acquisitionLot.create({
            data: {
              userId,
              assetId: await assetId(lot.assetSymbol),
              sourceTransactionId: lot.sourceTransactionId,
              acquiredAt: new Date(lot.acquiredAt),
              originalQuantity: lot.originalQuantity.toString(),
              remainingQuantity: lot.remainingQuantity.toString(),
              unitCostInr: lot.unitCostInr.toString(),
              totalCostInr: lot.totalCostInr.toString(),
              financialYear: lot.financialYear,
            },
          });
          lotIdMap.set(lot.id, created.id);
        }
      }

      for (const [sellId, allocations] of state.allocationsBySellId.entries()) {
        for (const alloc of allocations) {
          const dbLotId = lotIdMap.get(alloc.lotId);
          if (!dbLotId) continue;
          await tx.lotAllocation.create({
            data: {
              lotId: dbLotId,
              sellTransactionId: sellId,
              quantity: alloc.quantity.toString(),
              costBasisInr: alloc.costBasisInr.toString(),
              proceedsInr: alloc.proceedsInr.toString(),
              realizedPnlInr: alloc.realizedPnlInr.toString(),
            },
          });
        }
      }
    });

    return this.calculate(userId, { persistSnapshot: true });
  },
};
