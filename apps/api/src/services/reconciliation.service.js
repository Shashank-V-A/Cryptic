import { prisma } from '../lib/prisma.js';
import { toDecimal, zero } from '@vda-ledger/financial-engine';
import { portfolioService } from './portfolio.service.js';
import { exchangeService } from './exchange.service.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { AppError } from '../lib/errors.js';
import { CredentialError } from '../integrations/exchange/index.js';

/**
 * Compare exchange balances vs ledger holdings.
 * Never auto-correct mismatches — status only.
 */
export const reconciliationService = {
  async run(userId, { connectionId = null, notes = null } = {}, ipAddress) {
    const portfolio = await portfolioService.calculate(userId);
    const ledgerByAsset = new Map(
      portfolio.holdings.map((h) => [h.assetSymbol, toDecimal(h.quantity)]),
    );

    let exchangeBalances = [];
    let source = 'ledger-only';

    if (connectionId) {
      const connection = await prisma.exchangeConnection.findFirst({
        where: { id: connectionId, userId },
        include: { exchange: true },
      });
      if (!connection) {
        throw new AppError('Connection not found', { status: 404, code: 'NOT_FOUND' });
      }
      try {
        const adapter = await exchangeService.getAdapterForConnection(connection);
        await adapter.connect();
        exchangeBalances = await adapter.getBalances();
        source = connection.exchange.slug;
      } catch (err) {
        if (err instanceof CredentialError) {
          throw new AppError(err.message, { status: 400, code: err.code });
        }
        throw new AppError(`Could not fetch exchange balances: ${err.message}`, {
          status: 502,
          code: 'EXCHANGE_BALANCE_FAILED',
        });
      }
    }

    const exchangeByAsset = new Map();
    for (const b of exchangeBalances) {
      if (!b.currency || b.currency === 'INR') continue;
      const qty = toDecimal(b.balance || 0).plus(toDecimal(b.lockedBalance || 0));
      exchangeByAsset.set(b.currency, qty);
    }

    const symbols = new Set([...ledgerByAsset.keys(), ...exchangeByAsset.keys()]);
    const items = [];

    for (const symbol of [...symbols].sort()) {
      const ledgerQty = ledgerByAsset.get(symbol) || zero();
      const exchangeQty = exchangeByAsset.get(symbol) || zero();
      const difference = exchangeQty.minus(ledgerQty);
      let status = 'RECONCILED';
      if (!connectionId) {
        status = 'NEEDS_REVIEW';
      } else if (difference.abs().gt(toDecimal('0.00000001'))) {
        status = 'MISMATCH';
      }

      items.push({
        assetSymbol: symbol,
        exchangeQuantity: exchangeQty.toFixed(18),
        ledgerQuantity: ledgerQty.toFixed(18),
        difference: difference.toFixed(18),
        status,
      });
    }

    const run = await prisma.reconciliationRun.create({
      data: {
        userId,
        notes:
          notes ||
          (connectionId
            ? `Compared ${source} balances to ledger`
            : 'Ledger holdings snapshot — connect exchange for live balance compare'),
        items: {
          create: items.map((i) => ({
            assetSymbol: i.assetSymbol,
            exchangeQuantity: i.exchangeQuantity,
            ledgerQuantity: i.ledgerQuantity,
            difference: i.difference,
            status: i.status,
          })),
        },
      },
      include: { items: true },
    });

    await auditRepository.create({
      userId,
      action: 'RECONCILIATION_RUN',
      entityType: 'ReconciliationRun',
      entityId: run.id,
      metadata: {
        connectionId,
        source,
        itemCount: items.length,
        mismatches: items.filter((i) => i.status === 'MISMATCH').length,
      },
      ipAddress,
    });

    return serializeRun(run, { source, connectionId });
  },

  async list(userId, { take = 20 } = {}) {
    const rows = await prisma.reconciliationRun.findMany({
      where: { userId },
      orderBy: { ranAt: 'desc' },
      take,
      include: { items: true },
    });
    return { items: rows.map((r) => serializeRun(r)) };
  },

  async get(userId, id) {
    const run = await prisma.reconciliationRun.findFirst({
      where: { id, userId },
      include: { items: true },
    });
    if (!run) throw new AppError('Reconciliation run not found', { status: 404, code: 'NOT_FOUND' });
    return serializeRun(run);
  },

  async updateItemNotes(userId, runId, itemId, investigationNotes) {
    const run = await prisma.reconciliationRun.findFirst({
      where: { id: runId, userId },
    });
    if (!run) throw new AppError('Run not found', { status: 404, code: 'NOT_FOUND' });
    const item = await prisma.reconciliationItem.update({
      where: { id: itemId },
      data: { investigationNotes },
    });
    return {
      id: item.id,
      assetSymbol: item.assetSymbol,
      investigationNotes: item.investigationNotes,
      status: item.status,
    };
  },
};

function serializeRun(run, extra = {}) {
  return {
    id: run.id,
    ranAt: run.ranAt,
    notes: run.notes,
    ...extra,
    items: (run.items || []).map((i) => ({
      id: i.id,
      assetSymbol: i.assetSymbol,
      exchangeQuantity: i.exchangeQuantity.toString(),
      ledgerQuantity: i.ledgerQuantity.toString(),
      difference: i.difference.toString(),
      status: i.status,
      investigationNotes: i.investigationNotes,
    })),
    summary: {
      total: (run.items || []).length,
      mismatches: (run.items || []).filter((i) => i.status === 'MISMATCH').length,
      reconciled: (run.items || []).filter((i) => i.status === 'RECONCILED').length,
      needsReview: (run.items || []).filter((i) => i.status === 'NEEDS_REVIEW').length,
    },
  };
}
