import { prisma } from '../lib/prisma.js';
import {
  buildLedgerState,
  decimalToString,
  allocateSaleLots,
  toDecimal,
} from '@vda-ledger/financial-engine';
import { getFinancialYearForDate } from '@vda-ledger/shared';

const DEMO_PRICES = {
  BTC: '7200000',
  ETH: '285000',
  SOL: '14500',
  USDT: '84.5',
};

function serializeHolding(h) {
  return {
    assetSymbol: h.assetSymbol,
    quantity: decimalToString(h.quantity, 18),
    averageCostInr: decimalToString(h.averageCostInr, 12),
    totalCostInr: decimalToString(h.totalCostInr, 12),
    currentPriceInr: h.currentPriceInr != null ? decimalToString(h.currentPriceInr, 12) : null,
    currentValueInr: h.currentValueInr != null ? decimalToString(h.currentValueInr, 12) : null,
    unrealizedPnlInr: h.unrealizedPnlInr != null ? decimalToString(h.unrealizedPnlInr, 12) : null,
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

export const portfolioService = {
  async getPrices() {
    // Phase 3: Redis/cache + PriceProvider. Demo prices for valuation until live provider.
    return { ...DEMO_PRICES, asOf: new Date().toISOString(), source: 'demo-seed' };
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

  async calculate(userId) {
    const txns = await this.loadNormalizedTransactions(userId);
    const prices = await this.getPrices();
    const { asOf, source, ...pricesByAsset } = prices;
    const state = buildLedgerState(txns, { pricesByAsset });

    return {
      asOf,
      priceSource: source,
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
      holdings: state.holdings.map(serializeHolding),
      warnings: state.warnings,
      transactionCount: txns.length,
    };
  },

  async recalculateAndPersistLots(userId) {
    const txns = await this.loadNormalizedTransactions(userId);
    const state = buildLedgerState(txns, { pricesByAsset: DEMO_PRICES });

    await prisma.$transaction(async (tx) => {
      await tx.lotAllocation.deleteMany({
        where: { sellTransaction: { userId } },
      });
      await tx.acquisitionLot.deleteMany({ where: { userId } });

      const assetCache = new Map();
      async function assetId(symbol) {
        if (assetCache.has(symbol)) return assetCache.get(symbol);
        const a = await tx.asset.findUnique({ where: { symbol } });
        if (!a) throw new Error(`Asset missing: ${symbol}`);
        assetCache.set(symbol, a.id);
        return a.id;
      }

      /** Map engine lot id (lot-{txnId}) → db lot id */
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

    return this.calculate(userId);
  },
};

export { DEMO_PRICES, allocateSaleLots, toDecimal, getFinancialYearForDate };
