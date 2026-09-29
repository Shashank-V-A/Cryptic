import { prisma } from '../lib/prisma.js';

export const transactionRepository = {
  listForUser(userId, { type, assetSymbol, financialYear, search, take = 100, skip = 0 } = {}) {
    const where = { userId };
    if (type && type !== 'ALL') where.transactionType = type;
    if (financialYear) where.financialYear = financialYear;
    if (assetSymbol) {
      where.asset = { symbol: assetSymbol.toUpperCase() };
    }
    if (search) {
      where.OR = [
        { externalTransactionId: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { asset: { symbol: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return prisma.transaction.findMany({
      where,
      include: {
        asset: true,
        metadata: true,
        lotAllocations: true,
        acquisitionLots: true,
        exchange: true,
      },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take,
      skip,
    });
  },

  countForUser(userId, filters = {}) {
    const where = { userId };
    if (filters.type && filters.type !== 'ALL') where.transactionType = filters.type;
    if (filters.financialYear) where.financialYear = filters.financialYear;
    if (filters.assetSymbol) where.asset = { symbol: filters.assetSymbol.toUpperCase() };
    return prisma.transaction.count({ where });
  },

  findByIdForUser(userId, id) {
    return prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        asset: true,
        metadata: true,
        fees: true,
        lotAllocations: { include: { lot: true } },
        acquisitionLots: true,
        tdsRecords: true,
        exchange: true,
      },
    });
  },

  findExternalIds(userId) {
    return prisma.transaction.findMany({
      where: { userId, externalTransactionId: { not: null } },
      select: { externalTransactionId: true },
    });
  },

  async createManyLedger(userId, rows) {
    const created = [];
    for (const row of rows) {
      const txn = await prisma.transaction.create({
        data: {
          userId,
          exchangeId: row.exchangeId || null,
          externalTransactionId: row.externalTransactionId,
          timestamp: new Date(row.timestamp),
          assetId: row.assetId,
          transactionType: row.transactionType,
          quantity: row.quantity,
          price: row.price,
          grossValue: row.grossValue,
          fee: row.fee,
          netValue: row.netValue,
          currency: row.currency || 'INR',
          source: row.source || 'CSV_IMPORT',
          status: row.status || 'POSTED',
          financialYear: row.financialYear,
          rawData: row.rawData || undefined,
          notes: row.notes || null,
          metadata: row.metadata
            ? {
                create: row.metadata,
              }
            : undefined,
        },
      });
      created.push(txn);
    }
    return created;
  },
};
