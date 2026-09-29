import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Decimal,
  toDecimal,
  calculateAverageCost,
  allocateSaleLots,
  calculateRealizedPnl,
  calculateUnrealizedPnl,
  buildLedgerState,
  LOT_METHODOLOGY,
} from './index.js';

describe('toDecimal', () => {
  it('rejects empty values', () => {
    assert.throws(() => toDecimal(null), /empty/);
    assert.throws(() => toDecimal(''), /empty/);
  });

  it('preserves decimal precision without float drift', () => {
    const a = toDecimal('0.1').plus(toDecimal('0.2'));
    assert.equal(a.toString(), '0.3');
    assert.notEqual(0.1 + 0.2, 0.3); // documents why we avoid JS float
  });
});

describe('calculateAverageCost', () => {
  it('computes weighted average across lots', () => {
    const result = calculateAverageCost([
      { remainingQuantity: '0.01', unitCostInr: '6000000' },
      { remainingQuantity: '0.005', unitCostInr: '6500000' },
      { remainingQuantity: '0.002', unitCostInr: '5800000' },
    ]);
    // (0.01*6e6 + 0.005*6.5e6 + 0.002*5.8e6) / 0.017 = 104100 / 0.017
    assert.equal(result.totalQuantity.toString(), '0.017');
    assert.equal(result.totalCostInr.toString(), '104100');
    assert.equal(result.averageCostInr.toFixed(8), '6123529.41176471');
  });

  it('returns zero average when no remaining quantity', () => {
    const result = calculateAverageCost([{ remainingQuantity: '0', unitCostInr: '100' }]);
    assert.equal(result.averageCostInr.toString(), '0');
  });
});

describe('allocateSaleLots FIFO', () => {
  it('allocates partial sell across oldest lots first', () => {
    const lots = [
      { id: 'a', acquiredAt: '2025-01-01', remainingQuantity: '0.01', unitCostInr: '6000000' },
      { id: 'b', acquiredAt: '2025-02-01', remainingQuantity: '0.005', unitCostInr: '6500000' },
      { id: 'c', acquiredAt: '2025-03-01', remainingQuantity: '0.002', unitCostInr: '5800000' },
    ];
    // sell 0.008 BTC for 52000 INR net
    const result = allocateSaleLots(lots, '0.008', '52000');
    assert.equal(result.methodology, LOT_METHODOLOGY);
    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].lotId, 'a');
    assert.equal(result.allocations[0].quantity.toString(), '0.008');
    // cost = 0.008 * 6000000 = 48000; pnl = 52000 - 48000 = 4000
    assert.equal(result.allocations[0].costBasisInr.toString(), '48000');
    assert.equal(result.realizedPnlInr.toString(), '4000');
    assert.equal(result.updatedLots.find((l) => l.id === 'a').remainingQuantity.toString(), '0.002');
  });

  it('spans multiple lots when sell exceeds first lot', () => {
    const lots = [
      { id: 'a', acquiredAt: '2025-01-01', remainingQuantity: '0.01', unitCostInr: '100' },
      { id: 'b', acquiredAt: '2025-02-01', remainingQuantity: '0.01', unitCostInr: '200' },
    ];
    const result = allocateSaleLots(lots, '0.015', '3000');
    assert.equal(result.allocations.length, 2);
    assert.equal(result.allocations[0].quantity.toString(), '0.01');
    assert.equal(result.allocations[1].quantity.toString(), '0.005');
    // cost = 0.01*100 + 0.005*200 = 1 + 1 = 2; wait unit costs are 100 and 200 INR per unit
    // cost = 1 + 1 = 2? 0.01*100=1, 0.005*200=1, total cost=2, proceeds=3000, pnl=2998
    assert.equal(result.allocations[0].costBasisInr.toString(), '1');
    assert.equal(result.allocations[1].costBasisInr.toString(), '1');
    assert.equal(result.realizedPnlInr.toString(), '2998');
  });

  it('throws when insufficient quantity', () => {
    assert.throws(
      () =>
        allocateSaleLots(
          [{ id: 'a', acquiredAt: '2025-01-01', remainingQuantity: '0.001', unitCostInr: '1' }],
          '1',
          '100',
        ),
      /Insufficient/,
    );
  });

  it('does not mutate original lot objects', () => {
    const lots = [
      { id: 'a', acquiredAt: '2025-01-01', remainingQuantity: '1', unitCostInr: '10' },
    ];
    allocateSaleLots(lots, '0.5', '6');
    assert.equal(lots[0].remainingQuantity, '1');
  });
});

describe('calculateRealizedPnl', () => {
  it('sums allocation pnl with Decimal', () => {
    const total = calculateRealizedPnl([
      { realizedPnlInr: '100.50' },
      { realizedPnlInr: '-20.25' },
    ]);
    assert.equal(total.toString(), '80.25');
  });
});

describe('calculateUnrealizedPnl', () => {
  it('computes unrealized separately from realized', () => {
    const result = calculateUnrealizedPnl({
      quantity: '2',
      averageCostInr: '100',
      currentPriceInr: '150',
    });
    assert.equal(result.unrealizedPnlInr.toString(), '100');
    assert.equal(result.currentValueInr.toString(), '300');
    assert.equal(result.priceAvailable, true);
  });

  it('returns null pnl when price unavailable (never invents 0)', () => {
    const result = calculateUnrealizedPnl({
      quantity: '2',
      averageCostInr: '100',
      currentPriceInr: null,
    });
    assert.equal(result.unrealizedPnlInr, null);
    assert.equal(result.currentValueInr, null);
    assert.equal(result.priceAvailable, false);
  });
});

describe('buildLedgerState', () => {
  it('tracks buys, partial sell, remaining lots and separate P&L', () => {
    const state = buildLedgerState(
      [
        {
          id: '1',
          timestamp: '2025-04-10T10:00:00Z',
          assetSymbol: 'BTC',
          transactionType: 'BUY',
          quantity: '0.01',
          price: '6000000',
          fee: '100',
          netValue: '600100',
        },
        {
          id: '2',
          timestamp: '2025-05-10T10:00:00Z',
          assetSymbol: 'BTC',
          transactionType: 'BUY',
          quantity: '0.005',
          price: '6500000',
          fee: '0',
          netValue: '32500',
        },
        {
          id: '3',
          timestamp: '2025-06-10T10:00:00Z',
          assetSymbol: 'BTC',
          transactionType: 'SELL',
          quantity: '0.008',
          price: '7000000',
          fee: '50',
          grossValue: '56000',
          netValue: '55950',
        },
      ],
      { pricesByAsset: { BTC: '7200000' } },
    );

    assert.equal(state.holdings.length, 1);
    assert.equal(state.holdings[0].quantity.toString(), '0.007');
    assert.ok(state.summary.realizedPnl instanceof Decimal);
    assert.ok(state.summary.unrealizedPnl instanceof Decimal);
    assert.notEqual(
      state.summary.realizedPnl.toString(),
      state.summary.unrealizedPnl.toString(),
    );
    assert.equal(state.allocationsBySellId.get('3').length, 1);
  });

  it('flags unknown zero-cost rewards for review', () => {
    const state = buildLedgerState([
      {
        id: 'r1',
        timestamp: '2025-07-01T00:00:00Z',
        assetSymbol: 'SOL',
        transactionType: 'REWARD',
        quantity: '1',
        price: null,
        fee: null,
        netValue: null,
      },
    ]);
    assert.equal(state.warnings[0].code, 'ZERO_COST_BASIS');
    assert.equal(state.holdings[0].averageCostInr.toString(), '0');
  });

  it('handles same-day transactions deterministically by id', () => {
    const state = buildLedgerState([
      {
        id: 'b',
        timestamp: '2025-08-01T12:00:00Z',
        assetSymbol: 'ETH',
        transactionType: 'BUY',
        quantity: '1',
        price: '200000',
        fee: '0',
      },
      {
        id: 'a',
        timestamp: '2025-08-01T12:00:00Z',
        assetSymbol: 'ETH',
        transactionType: 'BUY',
        quantity: '1',
        price: '100000',
        fee: '0',
      },
    ]);
    // sorted by id when timestamps equal: a then b → avg = 150000
    assert.equal(state.holdings[0].averageCostInr.toString(), '150000');
  });
});
