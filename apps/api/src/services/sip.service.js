import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { assetRepository } from '../repositories/asset.repository.js';
import { portfolioService } from './portfolio.service.js';
import { getFinancialYearForDate } from '@vda-ledger/shared';
import { toDecimal } from '@vda-ledger/financial-engine';
import { notify } from './notification.service.js';

const createSchema = z.object({
  assetSymbol: z.string().min(1).max(20),
  frequency: z.enum(['WEEKLY', 'MONTHLY']),
  amountInr: z.union([z.string(), z.number()]),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  label: z.string().max(120).optional(),
});

function serializePlan(plan) {
  return {
    id: plan.id,
    assetSymbol: plan.asset.symbol,
    frequency: plan.frequency,
    amountInr: plan.amountInr.toString(),
    startDate: plan.startDate.toISOString(),
    endDate: plan.endDate?.toISOString() ?? null,
    isActive: plan.isActive,
    label: plan.label,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    recentExecutions: (plan.sipTransactions || []).map((st) => ({
      id: st.id,
      executedAt: st.executedAt.toISOString(),
      amountInr: st.amountInr.toString(),
      quantity: st.quantity?.toString() ?? null,
      priceInr: st.priceInr?.toString() ?? null,
      ledgerTxnId: st.ledgerTxnId,
    })),
  };
}

export const sipService = {
  async list(userId) {
    const rows = await prisma.sipPlan.findMany({
      where: { userId },
      include: {
        asset: true,
        sipTransactions: { orderBy: { executedAt: 'desc' }, take: 5 },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return { items: rows.map(serializePlan) };
  },

  async create(userId, input) {
    const data = createSchema.parse(input);
    const asset = await assetRepository.ensureAsset(data.assetSymbol);
    const startDate = new Date(data.startDate);
    const plan = await prisma.sipPlan.create({
      data: {
        userId,
        assetId: asset.id,
        frequency: data.frequency,
        amountInr: String(data.amountInr),
        startDate,
        label: data.label || null,
        isActive: true,
      },
      include: {
        asset: true,
        sipTransactions: true,
      },
    });
    await notify(userId, 'SIP plan created', `${plan.asset.symbol} · ₹${plan.amountInr} ${plan.frequency}`).catch(
      () => {},
    );
    return serializePlan(plan);
  },

  async setActive(userId, id, isActive) {
    const plan = await prisma.sipPlan.findFirst({ where: { id, userId } });
    if (!plan) {
      throw new AppError('SIP plan not found', { status: 404, code: 'NOT_FOUND' });
    }
    const updated = await prisma.sipPlan.update({
      where: { id },
      data: { isActive },
      include: {
        asset: true,
        sipTransactions: { orderBy: { executedAt: 'desc' }, take: 5 },
      },
    });
    return serializePlan(updated);
  },

  async executeNext(userId, planId) {
    const plan = await prisma.sipPlan.findFirst({
      where: { id: planId, userId },
      include: { asset: true },
    });
    if (!plan) {
      throw new AppError('SIP plan not found', { status: 404, code: 'NOT_FOUND' });
    }
    if (!plan.isActive) {
      throw new AppError('SIP plan is paused', { status: 400, code: 'SIP_PAUSED' });
    }

    const symbol = plan.asset.symbol;
    const { quotes } = await portfolioService.getPrices([symbol]);
    const quote = quotes[symbol];
    if (!quote?.priceInr) {
      throw new AppError('Price unavailable for SIP asset', {
        status: 503,
        code: 'PRICE_UNAVAILABLE',
      });
    }

    const priceInr = toDecimal(quote.priceInr);
    const amountInr = toDecimal(plan.amountInr.toString());
    if (priceInr.lte(0)) {
      throw new AppError('Invalid price for SIP execution', { status: 503, code: 'PRICE_INVALID' });
    }
    const quantity = amountInr.div(priceInr);
    const executedAt = new Date();
    const fy = getFinancialYearForDate(executedAt).id;

    const result = await prisma.$transaction(async (tx) => {
      const ledgerTxn = await tx.transaction.create({
        data: {
          userId,
          timestamp: executedAt,
          assetId: plan.assetId,
          transactionType: 'BUY',
          quantity: quantity.toString(),
          price: priceInr.toString(),
          grossValue: amountInr.toString(),
          netValue: amountInr.toString(),
          currency: 'INR',
          source: 'MANUAL',
          status: 'POSTED',
          financialYear: fy,
          notes: plan.label ? `SIP: ${plan.label}` : `SIP ${plan.frequency}`,
          metadata: {
            create: {
              needsReview: false,
              normalizedPayload: { sipPlanId: plan.id, manualSip: true },
            },
          },
        },
      });

      const sipTxn = await tx.sipTransaction.create({
        data: {
          sipPlanId: plan.id,
          executedAt,
          amountInr: amountInr.toString(),
          quantity: quantity.toString(),
          priceInr: priceInr.toString(),
          ledgerTxnId: ledgerTxn.id,
        },
      });

      return { ledgerTxn, sipTxn };
    });

    await portfolioService.recalculateAndPersistLots(userId).catch(() => {});
    await notify(
      userId,
      'SIP executed',
      `${symbol} · ${quantity.toString()} @ ₹${priceInr.toString()}`,
    ).catch(() => {});

    return {
      sipTransactionId: result.sipTxn.id,
      ledgerTransactionId: result.ledgerTxn.id,
      assetSymbol: symbol,
      quantity: quantity.toString(),
      priceInr: priceInr.toString(),
      amountInr: amountInr.toString(),
      executedAt: executedAt.toISOString(),
    };
  },
};
