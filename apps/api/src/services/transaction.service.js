import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { transactionRepository } from '../repositories/transaction.repository.js';
import { AppError } from '../lib/errors.js';
import { toDecimal, zero } from '@vda-ledger/financial-engine';
import { portfolioService } from './portfolio.service.js';

const reviewSchema = z.object({
  transactionType: z.string().optional(),
  status: z.enum(['POSTED', 'PENDING', 'NEEDS_REVIEW', 'IGNORED']).optional(),
  notes: z.string().max(2000).optional(),
});

export const transactionService = {
  async list(userId, query) {
    const take = Math.min(Number(query.limit) || 100, 500);
    const skip = Number(query.offset) || 0;
    const filters = {
      type: query.type,
      assetSymbol: query.asset,
      financialYear: query.financialYear,
      search: query.q,
    };
    const [rows, total] = await Promise.all([
      transactionRepository.listForUser(userId, { ...filters, take, skip }),
      transactionRepository.countForUser(userId, filters),
    ]);

    return {
      total,
      items: rows.map((t) => {
        let realized = null;
        if (t.lotAllocations?.length) {
          realized = t.lotAllocations
            .reduce((s, a) => s.plus(toDecimal(a.realizedPnlInr.toString())), zero())
            .toString();
        }
        return {
          id: t.id,
          timestamp: t.timestamp,
          asset: t.asset.symbol,
          type: t.transactionType,
          quantity: t.quantity.toString(),
          price: t.price?.toString() ?? null,
          grossValue: t.grossValue?.toString() ?? null,
          fee: t.fee?.toString() ?? null,
          netValue: t.netValue?.toString() ?? null,
          realizedPnl: realized,
          source: t.source,
          status: t.status,
          financialYear: t.financialYear,
          externalTransactionId: t.externalTransactionId,
          exchange: t.exchange?.name ?? null,
          needsReview: t.metadata?.needsReview || t.status === 'NEEDS_REVIEW',
          reviewReason: t.metadata?.reviewReason ?? null,
        };
      }),
    };
  },

  async detail(userId, id) {
    const t = await transactionRepository.findByIdForUser(userId, id);
    if (!t) {
      throw new AppError('Transaction not found', { status: 404, code: 'NOT_FOUND' });
    }

    let realized = zero();
    const allocations = (t.lotAllocations || []).map((a) => {
      realized = realized.plus(toDecimal(a.realizedPnlInr.toString()));
      return {
        id: a.id,
        lotId: a.lotId,
        quantity: a.quantity.toString(),
        costBasisInr: a.costBasisInr.toString(),
        proceedsInr: a.proceedsInr.toString(),
        realizedPnlInr: a.realizedPnlInr.toString(),
        lot: a.lot
          ? {
              acquiredAt: a.lot.acquiredAt,
              unitCostInr: a.lot.unitCostInr.toString(),
              sourceTransactionId: a.lot.sourceTransactionId,
            }
          : null,
      };
    });

    return {
      id: t.id,
      original: t.rawData,
      normalized: {
        timestamp: t.timestamp,
        asset: t.asset.symbol,
        type: t.transactionType,
        quantity: t.quantity.toString(),
        price: t.price?.toString() ?? null,
        grossValue: t.grossValue?.toString() ?? null,
        fee: t.fee?.toString() ?? null,
        netValue: t.netValue?.toString() ?? null,
        currency: t.currency,
        financialYear: t.financialYear,
        externalTransactionId: t.externalTransactionId,
        source: t.source,
        status: t.status,
      },
      metadata: t.metadata,
      calculationImpact: {
        realizedPnlInr: allocations.length ? realized.toString() : null,
        lotsCreated: (t.acquisitionLots || []).map((l) => ({
          id: l.id,
          remainingQuantity: l.remainingQuantity.toString(),
          unitCostInr: l.unitCostInr.toString(),
          originalQuantity: l.originalQuantity.toString(),
        })),
        lotAllocations: allocations,
      },
      taxTreatment: {
        note:
          t.transactionType === 'SELL' || t.transactionType === 'SWAP'
            ? 'Transfer may generate VDA income under the applicable TaxRuleSet.'
            : t.transactionType === 'UNKNOWN'
              ? 'Review required — unknown types are never silently classified for tax.'
              : 'Non-sale ledger event; tax treatment depends on classification and FY rules.',
      },
      tds: (t.tdsRecords || []).map((r) => ({
        id: r.id,
        amount: r.tdsAmountInr.toString(),
        status: r.status,
        date: r.date,
      })),
      audit: {
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      },
    };
  },

  async review(userId, id, input) {
    const data = reviewSchema.parse(input);
    const existing = await transactionRepository.findByIdForUser(userId, id);
    if (!existing) {
      throw new AppError('Transaction not found', { status: 404, code: 'NOT_FOUND' });
    }

    const needsReview =
      data.status === 'NEEDS_REVIEW'
        ? true
        : data.status && data.status !== 'NEEDS_REVIEW'
          ? false
          : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id },
        data: {
          ...(data.transactionType ? { transactionType: data.transactionType } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
      });

      const metaUpdate = {};
      if (needsReview !== undefined) metaUpdate.needsReview = needsReview;
      if (data.notes !== undefined && needsReview === false) {
        metaUpdate.reviewReason = null;
      }

      if (Object.keys(metaUpdate).length) {
        await tx.transactionMetadata.upsert({
          where: { transactionId: id },
          update: metaUpdate,
          create: {
            transactionId: id,
            needsReview: metaUpdate.needsReview ?? false,
            reviewReason: null,
          },
        });
      }
    });

    await portfolioService.recalculateAndPersistLots(userId);
    return this.detail(userId, id);
  },
};
