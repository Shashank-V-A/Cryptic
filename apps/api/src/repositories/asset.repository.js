import { prisma } from '../lib/prisma.js';

export const assetRepository = {
  findBySymbol(symbol) {
    return prisma.asset.findUnique({ where: { symbol: symbol.toUpperCase() } });
  },

  async ensureAsset(symbol, name) {
    const s = symbol.toUpperCase();
    return prisma.asset.upsert({
      where: { symbol: s },
      update: {},
      create: {
        symbol: s,
        name: name || s,
        decimals: 8,
      },
    });
  },

  listAll() {
    return prisma.asset.findMany({ orderBy: { symbol: 'asc' } });
  },
};
