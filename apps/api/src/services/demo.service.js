import { prisma } from '../lib/prisma.js';
import { portfolioService } from './portfolio.service.js';

/** Fictional but realistic demo ledger — clearly DEMO sourced. */
export const DEMO_TRANSACTIONS = [
  {
    externalTransactionId: 'demo-btc-buy-1',
    timestamp: '2025-04-12T09:30:00.000Z',
    asset: 'BTC',
    type: 'BUY',
    quantity: '0.01000000',
    price: '6000000',
    fee: '120',
    grossValue: '60000',
    netValue: '60120',
    fy: 'FY_2025_26',
  },
  {
    externalTransactionId: 'demo-btc-buy-2',
    timestamp: '2025-05-20T11:00:00.000Z',
    asset: 'BTC',
    type: 'BUY',
    quantity: '0.00500000',
    price: '6500000',
    fee: '65',
    grossValue: '32500',
    netValue: '32565',
    fy: 'FY_2025_26',
  },
  {
    externalTransactionId: 'demo-eth-buy-1',
    timestamp: '2025-06-01T08:15:00.000Z',
    asset: 'ETH',
    type: 'BUY',
    quantity: '0.50000000',
    price: '250000',
    fee: '80',
    grossValue: '125000',
    netValue: '125080',
    fy: 'FY_2025_26',
  },
  {
    externalTransactionId: 'demo-sol-sip-1',
    timestamp: '2025-06-15T07:00:00.000Z',
    asset: 'SOL',
    type: 'BUY',
    quantity: '2.00000000',
    price: '12000',
    fee: '20',
    grossValue: '24000',
    netValue: '24020',
    fy: 'FY_2025_26',
  },
  {
    externalTransactionId: 'demo-btc-sell-1',
    timestamp: '2025-08-10T14:20:00.000Z',
    asset: 'BTC',
    type: 'SELL',
    quantity: '0.00800000',
    price: '7000000',
    fee: '50',
    grossValue: '56000',
    netValue: '55950',
    fy: 'FY_2025_26',
  },
  {
    externalTransactionId: 'demo-eth-sell-1',
    timestamp: '2025-09-05T16:00:00.000Z',
    asset: 'ETH',
    type: 'SELL',
    quantity: '0.20000000',
    price: '280000',
    fee: '40',
    grossValue: '56000',
    netValue: '55960',
    fy: 'FY_2025_26',
  },
  {
    externalTransactionId: 'demo-usdt-buy-1',
    timestamp: '2025-10-01T10:00:00.000Z',
    asset: 'USDT',
    type: 'BUY',
    quantity: '500.000000',
    price: '84',
    fee: '10',
    grossValue: '42000',
    netValue: '42010',
    fy: 'FY_2025_26',
  },
  {
    externalTransactionId: 'demo-btc-fee-1',
    timestamp: '2025-10-12T12:00:00.000Z',
    asset: 'BTC',
    type: 'FEE',
    quantity: '0.00001000',
    price: '7100000',
    fee: null,
    grossValue: '71',
    netValue: '71',
    fy: 'FY_2025_26',
  },
  {
    externalTransactionId: 'demo-sol-transfer-in',
    timestamp: '2025-11-01T09:00:00.000Z',
    asset: 'SOL',
    type: 'TRANSFER_IN',
    quantity: '1.00000000',
    price: null,
    fee: null,
    grossValue: null,
    netValue: null,
    fy: 'FY_2025_26',
    needsReview: true,
    reviewReason: 'Transfer in without acquisition cost — review required',
  },
  {
    externalTransactionId: 'demo-unknown-1',
    timestamp: '2025-12-01T18:00:00.000Z',
    asset: 'ETH',
    type: 'UNKNOWN',
    quantity: '0.01000000',
    price: '290000',
    fee: '0',
    grossValue: '2900',
    netValue: '2900',
    fy: 'FY_2025_26',
    needsReview: true,
    reviewReason: 'Unrecognized exchange event — never silently classified',
  },
  {
    externalTransactionId: 'demo-btc-buy-fy26',
    timestamp: '2026-04-05T10:00:00.000Z',
    asset: 'BTC',
    type: 'BUY',
    quantity: '0.00200000',
    price: '6800000',
    fee: '40',
    grossValue: '13600',
    netValue: '13640',
    fy: 'FY_2026_27',
  },
];

async function clearUserLedger(userId) {
  await prisma.lotAllocation.deleteMany({ where: { sellTransaction: { userId } } });
  await prisma.acquisitionLot.deleteMany({ where: { userId } });
  await prisma.portfolioHoldingSnapshot.deleteMany({
    where: { snapshot: { userId } },
  });
  await prisma.portfolioSnapshot.deleteMany({ where: { userId } });
  await prisma.importBatchItem.deleteMany({ where: { batch: { userId } } });
  await prisma.importBatch.deleteMany({ where: { userId } });
  await prisma.transactionMetadata.deleteMany({
    where: { transaction: { userId } },
  });
  await prisma.transactionFee.deleteMany({ where: { transaction: { userId } } });
  await prisma.transaction.deleteMany({ where: { userId } });
}

/**
 * Load fictional demo ledger into the authenticated user's workspace.
 * Replaces existing ledger rows so dashboard/portfolio are immediately populated.
 */
export async function loadDemoLedgerForUser(userId) {
  const csvExchange = await prisma.exchange.findUnique({ where: { slug: 'CSV' } });
  const assetMap = Object.fromEntries(
    (await prisma.asset.findMany()).map((a) => [a.symbol, a.id]),
  );

  for (const symbol of ['BTC', 'ETH', 'SOL', 'USDT']) {
    if (!assetMap[symbol]) {
      throw new Error(`Required asset ${symbol} missing — run npm run db:seed first`);
    }
  }

  await clearUserLedger(userId);

  for (const d of DEMO_TRANSACTIONS) {
    await prisma.transaction.create({
      data: {
        userId,
        exchangeId: csvExchange?.id || null,
        externalTransactionId: d.externalTransactionId,
        timestamp: new Date(d.timestamp),
        assetId: assetMap[d.asset],
        transactionType: d.type,
        quantity: d.quantity,
        price: d.price,
        grossValue: d.grossValue,
        fee: d.fee,
        netValue: d.netValue,
        currency: 'INR',
        source: 'DEMO',
        status: d.needsReview ? 'NEEDS_REVIEW' : 'POSTED',
        financialYear: d.fy,
        rawData: { demo: true, ...d },
        notes: 'Demo seed — fictional data',
        metadata: {
          create: {
            needsReview: Boolean(d.needsReview),
            reviewReason: d.reviewReason || null,
            classificationConfidence: d.type === 'UNKNOWN' ? 0 : 1,
            originalPayload: d,
            normalizedPayload: d,
          },
        },
      },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { demoMode: true },
  });

  const portfolio = await portfolioService.recalculateAndPersistLots(userId);

  return {
    transactionCount: DEMO_TRANSACTIONS.length,
    holdings: portfolio.holdings.map((h) => h.assetSymbol),
    summary: portfolio.summary,
    disclaimer: 'Demo mode uses clearly fictional seed data for product exploration.',
  };
}

export const demoService = {
  loadDemoLedgerForUser,
  DEMO_TRANSACTIONS,
};
