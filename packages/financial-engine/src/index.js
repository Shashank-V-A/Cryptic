/**
 * Portfolio / lot / P&L financial engine.
 *
 * All monetary and quantity math uses Decimal.js (ROUND_HALF_UP).
 * Never use bare JavaScript floating-point for money or crypto quantities.
 *
 * Lot allocation methodology: FIFO (oldest acquisition lots consumed first).
 * Documented explicitly so tax explainability can cite the method used.
 */

import Decimal from 'decimal.js';
import { getFinancialYearForDate } from '@vda-ledger/shared';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const LOT_METHODOLOGY = 'FIFO';

export function toDecimal(value) {
  if (value instanceof Decimal) return value;
  if (value === null || value === undefined || value === '') {
    throw new Error('Cannot convert empty value to Decimal');
  }
  return new Decimal(value);
}

export function zero() {
  return new Decimal(0);
}

export function formatInr(value, { maximumFractionDigits = 2 } = {}) {
  const d = toDecimal(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits,
  }).format(Number(d.toFixed(maximumFractionDigits)));
}

export function formatQty(value, { maximumFractionDigits = 8 } = {}) {
  const d = toDecimal(value);
  return d.toFixed(maximumFractionDigits).replace(/\.?0+$/, (m) => (m.includes('.') ? m.replace(/0+$/, '').replace(/\.$/, '') : m)) || '0';
}

/**
 * Average acquisition cost (INR per unit) for open lots of one asset.
 * @param {Array<{ remainingQuantity: string|Decimal, unitCostInr: string|Decimal }>} lots
 */
export function calculateAverageCost(lots) {
  let totalQty = zero();
  let totalCost = zero();
  for (const lot of lots) {
    const qty = toDecimal(lot.remainingQuantity);
    if (qty.lte(0)) continue;
    totalQty = totalQty.plus(qty);
    totalCost = totalCost.plus(qty.times(toDecimal(lot.unitCostInr)));
  }
  if (totalQty.isZero()) {
    return { averageCostInr: zero(), totalQuantity: zero(), totalCostInr: zero() };
  }
  return {
    averageCostInr: totalCost.div(totalQty),
    totalQuantity: totalQty,
    totalCostInr: totalCost,
  };
}

/**
 * Allocate a sale across open lots using FIFO.
 * Mutates a working copy of lots (remainingQuantity) — does not mutate inputs.
 *
 * @param {Array} openLots - sorted oldest-first preferred; will be sorted by acquiredAt
 * @param {string|Decimal} sellQuantity
 * @param {string|Decimal} sellProceedsInr - net proceeds for the full sale
 * @returns {{ allocations: Array, realizedPnlInr: Decimal, updatedLots: Array, remainingUnallocated: Decimal }}
 */
export function allocateSaleLots(openLots, sellQuantity, sellProceedsInr) {
  const qtyToSell = toDecimal(sellQuantity);
  const proceeds = toDecimal(sellProceedsInr);

  if (qtyToSell.lte(0)) {
    throw new Error('Sell quantity must be positive');
  }
  if (proceeds.isNeg()) {
    throw new Error('Sale proceeds cannot be negative');
  }

  const working = openLots
    .map((lot) => ({
      ...lot,
      remainingQuantity: toDecimal(lot.remainingQuantity),
      unitCostInr: toDecimal(lot.unitCostInr),
      acquiredAt: lot.acquiredAt,
      id: lot.id,
    }))
    .filter((lot) => lot.remainingQuantity.gt(0))
    .sort((a, b) => new Date(a.acquiredAt) - new Date(b.acquiredAt));

  const totalAvailable = working.reduce((s, l) => s.plus(l.remainingQuantity), zero());
  if (totalAvailable.lt(qtyToSell)) {
    throw new Error(
      `Insufficient lot quantity: need ${qtyToSell.toString()}, available ${totalAvailable.toString()}`,
    );
  }

  const proceedsPerUnit = proceeds.div(qtyToSell);
  const allocations = [];
  let remaining = qtyToSell;
  let realized = zero();

  for (const lot of working) {
    if (remaining.isZero()) break;
    const take = Decimal.min(lot.remainingQuantity, remaining);
    const costBasis = take.times(lot.unitCostInr);
    const portionProceeds = take.times(proceedsPerUnit);
    const pnl = portionProceeds.minus(costBasis);

    allocations.push({
      lotId: lot.id,
      quantity: take,
      costBasisInr: costBasis,
      proceedsInr: portionProceeds,
      realizedPnlInr: pnl,
      unitCostInr: lot.unitCostInr,
      methodology: LOT_METHODOLOGY,
    });

    lot.remainingQuantity = lot.remainingQuantity.minus(take);
    remaining = remaining.minus(take);
    realized = realized.plus(pnl);
  }

  return {
    allocations,
    realizedPnlInr: realized,
    updatedLots: working,
    remainingUnallocated: remaining,
    methodology: LOT_METHODOLOGY,
  };
}

/**
 * Sum realized P&L from allocation records.
 */
export function calculateRealizedPnl(allocations) {
  return (allocations || []).reduce(
    (sum, a) => sum.plus(toDecimal(a.realizedPnlInr)),
    zero(),
  );
}

/**
 * Unrealized P&L for a holding.
 * @param {{ quantity: string|Decimal, averageCostInr: string|Decimal, currentPriceInr: string|Decimal|null }} holding
 */
export function calculateUnrealizedPnl(holding) {
  const qty = toDecimal(holding.quantity);
  if (qty.isZero()) {
    return {
      unrealizedPnlInr: zero(),
      currentValueInr: zero(),
      priceAvailable: true,
    };
  }
  if (holding.currentPriceInr === null || holding.currentPriceInr === undefined || holding.currentPriceInr === '') {
    return {
      unrealizedPnlInr: null,
      currentValueInr: null,
      priceAvailable: false,
    };
  }
  const price = toDecimal(holding.currentPriceInr);
  const avg = toDecimal(holding.averageCostInr);
  const currentValue = qty.times(price);
  const costBasis = qty.times(avg);
  return {
    unrealizedPnlInr: currentValue.minus(costBasis),
    currentValueInr: currentValue,
    priceAvailable: true,
  };
}

/**
 * Build acquisition lots + holdings from a chronologically sorted normalized transaction list.
 * Transaction shape:
 * { id, timestamp, assetSymbol, transactionType, quantity, price, grossValue, fee, netValue, currency }
 *
 * BUY / REWARD / AIRDROP / TRANSFER_IN create lots (TRANSFER_IN / REWARD use price or 0 cost if missing → needs review flag).
 * SELL / TRANSFER_OUT / WITHDRAWAL consume lots (TRANSFER_OUT/WITHDRAWAL use cost basis only; proceeds = cost for transfer out net zero unless fee).
 */
export function buildLedgerState(transactions, { pricesByAsset = {} } = {}) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp) || String(a.id).localeCompare(String(b.id)),
  );

  /** @type {Map<string, Array>} */
  const lotsByAsset = new Map();
  const allocationsBySellId = new Map();
  let realizedPnlTotal = zero();
  const warnings = [];

  function ensureLots(symbol) {
    if (!lotsByAsset.has(symbol)) lotsByAsset.set(symbol, []);
    return lotsByAsset.get(symbol);
  }

  for (const txn of sorted) {
    const type = txn.transactionType;
    const symbol = txn.assetSymbol;
    const qty = toDecimal(txn.quantity);

    if (['BUY', 'REWARD', 'AIRDROP', 'GIFT', 'TRANSFER_IN', 'DEPOSIT'].includes(type)) {
      let unitCost = zero();
      let totalCost = zero();
      if (txn.price !== null && txn.price !== undefined && txn.price !== '') {
        unitCost = toDecimal(txn.price);
        totalCost = unitCost.times(qty);
      } else if (txn.netValue !== null && txn.netValue !== undefined && txn.netValue !== '') {
        totalCost = toDecimal(txn.netValue);
        unitCost = qty.isZero() ? zero() : totalCost.div(qty);
      } else if (['REWARD', 'AIRDROP', 'GIFT', 'TRANSFER_IN'].includes(type)) {
        warnings.push({
          transactionId: txn.id,
          code: 'ZERO_COST_BASIS',
          message: `${type} for ${symbol} recorded with zero acquisition cost — review required for tax.`,
        });
      }

      // Add fee paid in INR into cost basis for buys
      if (type === 'BUY' && txn.fee !== null && txn.fee !== undefined && txn.fee !== '') {
        const fee = toDecimal(txn.fee);
        totalCost = totalCost.plus(fee);
        unitCost = qty.isZero() ? zero() : totalCost.div(qty);
      }

      const fy = getFinancialYearForDate(txn.timestamp);
      ensureLots(symbol).push({
        id: `lot-${txn.id}`,
        sourceTransactionId: txn.id,
        assetSymbol: symbol,
        acquiredAt: txn.timestamp,
        originalQuantity: qty,
        remainingQuantity: qty,
        unitCostInr: unitCost,
        totalCostInr: totalCost,
        financialYear: fy.id,
      });
    } else if (['SELL', 'TRANSFER_OUT', 'WITHDRAWAL', 'FEE'].includes(type)) {
      if (type === 'FEE' && qty.isZero()) continue;

      const lots = ensureLots(symbol);
      let proceeds = zero();
      if (type === 'SELL') {
        if (txn.netValue !== null && txn.netValue !== undefined && txn.netValue !== '') {
          proceeds = toDecimal(txn.netValue);
        } else if (txn.grossValue !== null && txn.grossValue !== undefined) {
          const fee = txn.fee ? toDecimal(txn.fee) : zero();
          proceeds = toDecimal(txn.grossValue).minus(fee);
        } else if (txn.price !== null && txn.price !== undefined) {
          const fee = txn.fee ? toDecimal(txn.fee) : zero();
          proceeds = toDecimal(txn.price).times(qty).minus(fee);
        }
      } else {
        // Transfers out / withdrawals: proceeds = cost basis (no realized gain by default)
        // allocate with temporary proceeds = cost after we know allocations — use price 0 and
        // recompute: allocate with proceeds equal to cost basis by first allocating with 0 then adjusting.
        // Simpler: allocate with proceeds = estimated cost using avg cost * qty
        const avg = calculateAverageCost(lots);
        proceeds = avg.averageCostInr.times(qty);
      }

      try {
        const result = allocateSaleLots(lots, qty, proceeds);
        // Replace lots array contents
        lotsByAsset.set(symbol, result.updatedLots);
        allocationsBySellId.set(txn.id, result.allocations);
        if (type === 'SELL') {
          realizedPnlTotal = realizedPnlTotal.plus(result.realizedPnlInr);
        }
      } catch (err) {
        warnings.push({
          transactionId: txn.id,
          code: 'LOT_ALLOCATION_FAILED',
          message: err.message,
        });
      }
    }
  }

  const holdings = [];
  let totalInvested = zero();
  let currentValue = zero();
  let unrealizedTotal = zero();
  let hasMissingPrice = false;

  for (const [symbol, lots] of lotsByAsset.entries()) {
    const open = lots.filter((l) => toDecimal(l.remainingQuantity).gt(0));
    if (open.length === 0) continue;
    const avg = calculateAverageCost(open);
    const price = pricesByAsset[symbol];
    const ur = calculateUnrealizedPnl({
      quantity: avg.totalQuantity,
      averageCostInr: avg.averageCostInr,
      currentPriceInr: price ?? null,
    });

    totalInvested = totalInvested.plus(avg.totalCostInr);
    if (ur.priceAvailable) {
      currentValue = currentValue.plus(ur.currentValueInr);
      unrealizedTotal = unrealizedTotal.plus(ur.unrealizedPnlInr);
    } else {
      hasMissingPrice = true;
    }

    holdings.push({
      assetSymbol: symbol,
      quantity: avg.totalQuantity,
      averageCostInr: avg.averageCostInr,
      totalCostInr: avg.totalCostInr,
      currentPriceInr: price ?? null,
      currentValueInr: ur.currentValueInr,
      unrealizedPnlInr: ur.unrealizedPnlInr,
      priceAvailable: ur.priceAvailable,
      lots: open.map((l) => ({
        id: l.id,
        sourceTransactionId: l.sourceTransactionId,
        acquiredAt: l.acquiredAt,
        remainingQuantity: l.remainingQuantity,
        unitCostInr: l.unitCostInr,
        financialYear: l.financialYear,
      })),
    });
  }

  holdings.sort((a, b) => a.assetSymbol.localeCompare(b.assetSymbol));

  return {
    methodology: LOT_METHODOLOGY,
    holdings,
    summary: {
      totalInvested,
      currentValue: hasMissingPrice && currentValue.isZero() ? null : currentValue,
      realizedPnl: realizedPnlTotal,
      unrealizedPnl: hasMissingPrice ? null : unrealizedTotal,
      totalReturn:
        hasMissingPrice || currentValue === null
          ? null
          : currentValue.plus(realizedPnlTotal).minus(totalInvested),
      priceAvailable: !hasMissingPrice,
    },
    allocationsBySellId,
    lotsByAsset,
    warnings,
  };
}

export function decimalToString(value, places = 12) {
  if (value === null || value === undefined) return null;
  return toDecimal(value).toFixed(places);
}

export { Decimal };
