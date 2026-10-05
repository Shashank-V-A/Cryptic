import { prisma } from '../lib/prisma.js';
import {
  calculateVdaTax,
  calculateExpectedTds,
  reconcileTds,
  explainWhyPaying,
  getTaxRuleSet,
  listTaxRuleSets,
  TAX_ENGINE_VERSION,
  toDec,
  zero,
} from '@vda-ledger/tax-engine';
import {
  allocateSaleLots,
  buildLedgerState,
  toDecimal,
  zero as feZero,
} from '@vda-ledger/financial-engine';
import { auditRepository } from '../repositories/audit.repository.js';
import { AppError } from '../lib/errors.js';
import { portfolioService } from './portfolio.service.js';

async function ensureTaxRule(financialYear) {
  const ruleSet = getTaxRuleSet(financialYear);
  let taxYear = await prisma.taxYear.findUnique({ where: { code: financialYear } });
  if (!taxYear) {
    taxYear = await prisma.taxYear.create({
      data: {
        code: financialYear,
        label: financialYear.replace('FY_', 'FY ').replace('_', '–'),
        startDate: new Date(ruleSet.effectiveFrom),
        endDate: new Date(ruleSet.effectiveTo),
      },
    });
  }

  return prisma.taxRule.upsert({
    where: { ruleSetId: ruleSet.id },
    update: {
      version: ruleSet.version,
      payload: ruleSet,
      officialSource: ruleSet.officialSourceNotes,
      isDraft: ruleSet.isDraft,
      effectiveFrom: new Date(ruleSet.effectiveFrom),
      effectiveTo: new Date(ruleSet.effectiveTo),
    },
    create: {
      taxYearId: taxYear.id,
      version: ruleSet.version,
      ruleSetId: ruleSet.id,
      payload: ruleSet,
      officialSource: ruleSet.officialSourceNotes,
      isDraft: ruleSet.isDraft,
      effectiveFrom: new Date(ruleSet.effectiveFrom),
      effectiveTo: new Date(ruleSet.effectiveTo),
    },
  });
}

async function loadTransfersForFy(userId, financialYear) {
  // Ensure lots are current
  await portfolioService.recalculateAndPersistLots(userId).catch(() => {});

  const sells = await prisma.transaction.findMany({
    where: {
      userId,
      financialYear,
      transactionType: { in: ['SELL', 'SWAP'] },
      status: { in: ['POSTED', 'NEEDS_REVIEW'] },
    },
    include: {
      asset: true,
      lotAllocations: true,
    },
    orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
  });

  // Fallback: rebuild from ledger if allocations missing
  let allocationsBySell = null;
  if (sells.some((s) => !s.lotAllocations?.length)) {
    const txns = await portfolioService.loadNormalizedTransactions(userId);
    const state = buildLedgerState(txns, { pricesByAsset: {} });
    allocationsBySell = state.allocationsBySellId;
  }

  const transfers = [];
  for (const s of sells) {
    let cost = zero();
    let proceeds = zero();
    const allocs = s.lotAllocations?.length
      ? s.lotAllocations
      : allocationsBySell?.get(s.id) || [];

    for (const a of allocs) {
      cost = cost.plus(toDec(a.costBasisInr?.toString?.() ?? a.costBasisInr));
      proceeds = proceeds.plus(toDec(a.proceedsInr?.toString?.() ?? a.proceedsInr));
    }

    if (!allocs.length) {
      // Cannot invent cost — mark for review via zero income with note
      const consideration =
        s.netValue?.toString() ??
        s.grossValue?.toString() ??
        (s.price ? toDec(s.price.toString()).times(toDec(s.quantity.toString())).toString() : '0');
      transfers.push({
        transactionId: s.id,
        timestamp: s.timestamp.toISOString(),
        assetSymbol: s.asset.symbol,
        considerationInr: consideration,
        acquisitionCostInr: '0',
        financialYear,
        feesExcludedInr: s.fee?.toString() ?? null,
        missingCostBasis: true,
      });
      continue;
    }

    const consideration = proceeds.gt(0)
      ? proceeds
      : toDec(
          s.netValue?.toString() ??
            s.grossValue?.toString() ??
            '0',
        );

    transfers.push({
      transactionId: s.id,
      timestamp: s.timestamp.toISOString(),
      assetSymbol: s.asset.symbol,
      considerationInr: consideration.toString(),
      acquisitionCostInr: cost.toString(),
      financialYear,
      feesExcludedInr: s.fee?.toString() ?? null,
      missingCostBasis: false,
    });
  }

  return transfers;
}

async function tdsDeductedForFy(userId, financialYear) {
  const start = getTaxRuleSet(financialYear).effectiveFrom;
  const end = getTaxRuleSet(financialYear).effectiveTo;
  const rows = await prisma.tdsRecord.findMany({
    where: {
      userId,
      date: {
        gte: new Date(start),
        lte: new Date(`${end}T23:59:59.999Z`),
      },
      status: { in: ['MATCHED', 'PARTIALLY_MATCHED', 'NEEDS_REVIEW'] },
    },
  });
  return rows.reduce((s, r) => s.plus(toDec(r.tdsAmountInr.toString())), zero());
}

export const taxService = {
  listRuleSets() {
    return listTaxRuleSets();
  },

  async getCenter(userId, financialYear) {
    const latest = await prisma.taxCalculation.findFirst({
      where: { userId, financialYear },
      orderBy: { calculationTimestamp: 'desc' },
      include: { taxRule: true, taxTransactions: { include: { transaction: { include: { asset: true } } } } },
    });

    const ruleSet = getTaxRuleSet(financialYear);
    const tdsSum = await tdsDeductedForFy(userId, financialYear);

    const currentSells = await prisma.transaction.findMany({
      where: {
        userId,
        financialYear,
        transactionType: { in: ['SELL', 'SWAP'] },
        status: { in: ['POSTED', 'NEEDS_REVIEW'] },
      },
      select: { id: true },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });
    const currentIds = currentSells.map((s) => s.id);
    const savedIds = Array.isArray(latest?.inputTransactionIds)
      ? latest.inputTransactionIds
      : [];
    const stale =
      Boolean(latest) &&
      (savedIds.length !== currentIds.length ||
        savedIds.some((id, i) => id !== currentIds[i]));

    return {
      financialYear,
      ruleSet: {
        id: ruleSet.id,
        version: ruleSet.version,
        isDraft: ruleSet.isDraft,
        filingReady: ruleSet.filingReady,
        calculationScope: ruleSet.calculationScope,
        officialSourceNotes: ruleSet.officialSourceNotes,
        sources: ruleSet.verification,
      },
      latestCalculation: latest
        ? { ...serializeCalculation(latest), stale }
        : null,
      calculationStale: stale,
      tdsDeductedInr: tdsSum.toFixed(12),
      engineVersion: TAX_ENGINE_VERSION,
    };
  },

  async calculate(userId, financialYear, { payerKind = 'specified_person', ipAddress } = {}) {
    const rule = await ensureTaxRule(financialYear);
    const transfers = await loadTransfersForFy(userId, financialYear);
    const tdsDeducted = await tdsDeductedForFy(userId, financialYear);

    const result = calculateVdaTax({
      financialYear,
      ruleSetId: rule.ruleSetId,
      transfers,
      tdsDeductedInr: tdsDeducted.toString(),
    });

    const tdsExpected = calculateExpectedTds({
      financialYear,
      payerKind,
      events: transfers.map((t) => ({
        transactionId: t.transactionId,
        considerationInr: t.considerationInr,
        timestamp: t.timestamp,
      })),
    });

    const created = await prisma.taxCalculation.create({
      data: {
        userId,
        taxRuleId: rule.id,
        financialYear,
        calculationVersion: TAX_ENGINE_VERSION,
        inputTransactionIds: transfers.map((t) => t.transactionId),
        output: { ...result, tdsExpected },
        saleConsideration: result.summary.saleConsiderationInr,
        acquisitionCost: result.summary.acquisitionCostInr,
        vdaIncome: result.summary.vdaIncomeInr,
        estimatedTax: result.summary.estimatedVdaTaxInr,
        cess: result.summary.cessInr,
        tdsDeducted: result.summary.tdsDeductedInr,
        estimatedRemaining: result.summary.estimatedRemainingInr,
        taxTransactions: {
          create: result.lines.map((l) => ({
            transactionId: l.transactionId,
            consideration: l.considerationInr,
            acquisitionCost: l.acquisitionCostInr,
            income: l.taxableIncomeInr,
            tax: l.estimatedTaxInr,
            breakdown: l,
          })),
        },
      },
      include: {
        taxRule: true,
        taxTransactions: { include: { transaction: { include: { asset: true } } } },
      },
    });

    await auditRepository.create({
      userId,
      action: 'TAX_CALCULATE',
      entityType: 'TaxCalculation',
      entityId: created.id,
      metadata: {
        financialYear,
        ruleSetId: rule.ruleSetId,
        engineVersion: TAX_ENGINE_VERSION,
        estimatedVdaTaxInr: result.summary.estimatedVdaTaxInr,
        transferCount: transfers.length,
      },
      ipAddress,
    });

    return {
      ...serializeCalculation(created),
      tdsExpected,
      result,
    };
  },

  async transactionBreakdown(userId, transactionId) {
    const txn = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { asset: true, lotAllocations: true },
    });
    if (!txn) throw new AppError('Transaction not found', { status: 404, code: 'NOT_FOUND' });

    const calc = await prisma.taxCalculation.findFirst({
      where: {
        userId,
        financialYear: txn.financialYear,
        taxTransactions: { some: { transactionId } },
      },
      orderBy: { calculationTimestamp: 'desc' },
      include: {
        taxTransactions: { where: { transactionId } },
        taxRule: true,
      },
    });

    if (!calc?.taxTransactions?.[0]) {
      // Read-only ephemeral compute — never persist from a "Why?" view
      const rule = await ensureTaxRule(txn.financialYear);
      const transfers = await loadTransfersForFy(userId, txn.financialYear);
      const tdsDeducted = await tdsDeductedForFy(userId, txn.financialYear);
      const result = calculateVdaTax({
        financialYear: txn.financialYear,
        ruleSetId: rule.ruleSetId,
        transfers,
        tdsDeductedInr: tdsDeducted.toString(),
      });
      const line = result.lines.find((l) => l.transactionId === transactionId);
      if (!line) {
        throw new AppError('No taxable transfer breakdown for this transaction', {
          status: 404,
          code: 'NOT_TAXABLE_TRANSFER',
        });
      }
      return {
        transactionId,
        financialYear: txn.financialYear,
        asset: txn.asset.symbol,
        type: txn.transactionType,
        line,
        calculationId: null,
        ephemeral: true,
        ruleSetId: rule.ruleSetId,
      };
    }

    return {
      transactionId,
      financialYear: txn.financialYear,
      asset: txn.asset.symbol,
      type: txn.transactionType,
      line: calc.taxTransactions[0].breakdown,
      calculationId: calc.id,
      ruleSetId: calc.taxRule.ruleSetId,
    };
  },

  async whyPaying(userId, transactionId) {
    const breakdown = await this.transactionBreakdown(userId, transactionId);
    const explanation = explainWhyPaying({
      financialYear: breakdown.financialYear,
      line: breakdown.line,
    });
    await auditRepository.create({
      userId,
      action: 'TAX_WHY_VIEW',
      entityType: 'Transaction',
      entityId: transactionId,
      metadata: { financialYear: breakdown.financialYear, ruleSetId: explanation.ruleSetId },
    });
    return { breakdown, explanation };
  },

  async simulate(userId, { assetSymbol, quantity, priceInr, financialYear }) {
    if (!assetSymbol || !quantity || !priceInr || !financialYear) {
      throw new AppError('assetSymbol, quantity, priceInr, and financialYear are required', {
        status: 400,
        code: 'VALIDATION',
      });
    }

    await portfolioService.recalculateAndPersistLots(userId).catch(() => {});
    const txns = await portfolioService.loadNormalizedTransactions(userId);
    const state = buildLedgerState(txns, { pricesByAsset: {} });
    const symbol = String(assetSymbol).toUpperCase();
    const openLots = (state.lotsByAsset.get(symbol) || []).filter((l) =>
      toDecimal(l.remainingQuantity).gt(0),
    );

    const qty = toDecimal(String(quantity));
    const price = toDecimal(String(priceInr));
    const consideration = price.times(qty);

    let acquisitionCost = feZero();
    if (openLots.length) {
      try {
        const { allocations } = allocateSaleLots(openLots, qty, consideration);
        for (const a of allocations) {
          acquisitionCost = acquisitionCost.plus(toDecimal(a.costBasisInr));
        }
      } catch (err) {
        throw new AppError(err.message || 'Insufficient holdings for simulation', {
          status: 400,
          code: 'INSUFFICIENT_HOLDINGS',
        });
      }
    }

    const rule = await ensureTaxRule(financialYear);
    const transfer = {
      transactionId: 'simulation',
      timestamp: new Date().toISOString(),
      assetSymbol: symbol,
      considerationInr: consideration.toString(),
      acquisitionCostInr: acquisitionCost.toString(),
      financialYear,
    };

    const result = calculateVdaTax({
      financialYear,
      ruleSetId: rule.ruleSetId,
      transfers: [transfer],
      tdsDeductedInr: '0',
    });

    const line = result.lines[0];
    const tdsExpected = calculateExpectedTds({
      financialYear,
      payerKind: 'specified_person',
      events: [
        {
          transactionId: 'simulation',
          considerationInr: consideration.toString(),
          timestamp: transfer.timestamp,
        },
      ],
    });

    const estimatedTds = tdsExpected.totalExpectedTdsInr;
    const netProceeds = consideration.minus(toDecimal(line?.estimatedTaxInr || '0'));

    return {
      simulation: true,
      financialYear,
      assetSymbol: symbol,
      quantity: qty.toString(),
      priceInr: price.toString(),
      saleConsiderationInr: line?.considerationInr ?? consideration.toString(),
      acquisitionCostInr: line?.acquisitionCostInr ?? acquisitionCost.toString(),
      vdaIncomeInr: line?.taxableIncomeInr ?? '0',
      estimatedTaxInr: line?.estimatedTaxInr ?? '0',
      estimatedTdsInr: estimatedTds,
      estimatedNetProceedsInr: netProceeds.toString(),
      missingCostBasis: openLots.length === 0,
      breakdown: line,
      summary: result.summary,
    };
  },

  async listAudit(userId, { take = 50 } = {}) {
    const rows = await prisma.auditLog.findMany({
      where: {
        userId,
        action: { in: ['TAX_CALCULATE', 'TAX_WHY_VIEW', 'TDS_RECONCILE', 'TDS_RECORD_CREATE'] },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }));
  },
};

export const tdsService = {
  async list(userId, { financialYear } = {}) {
    const where = { userId };
    if (financialYear) {
      const rule = getTaxRuleSet(financialYear);
      where.date = {
        gte: new Date(rule.effectiveFrom),
        lte: new Date(`${rule.effectiveTo}T23:59:59.999Z`),
      };
    }
    const rows = await prisma.tdsRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { transaction: { include: { asset: true } } },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        date: r.date,
        assetSymbol: r.assetSymbol,
        saleValueInr: r.saleValueInr?.toString() ?? null,
        tdsAmountInr: r.tdsAmountInr.toString(),
        status: r.status,
        source: r.source,
        transactionId: r.transactionId,
        transactionAsset: r.transaction?.asset?.symbol ?? null,
      })),
    };
  },

  async createRecord(userId, body, ipAddress) {
    const created = await prisma.tdsRecord.create({
      data: {
        userId,
        transactionId: body.transactionId || null,
        date: new Date(body.date),
        assetSymbol: body.assetSymbol || null,
        saleValueInr: body.saleValueInr ?? null,
        tdsAmountInr: body.tdsAmountInr,
        status: body.status || 'NEEDS_REVIEW',
        source: body.source || 'MANUAL',
        rawData: body.rawData || null,
      },
    });
    await auditRepository.create({
      userId,
      action: 'TDS_RECORD_CREATE',
      entityType: 'TdsRecord',
      entityId: created.id,
      metadata: { tdsAmountInr: body.tdsAmountInr, transactionId: body.transactionId },
      ipAddress,
    });
    return created;
  },

  async reconcile(userId, financialYear, { payerKind = 'specified_person' } = {}) {
    const transfers = await loadTransfersForFy(userId, financialYear);
    const expected = calculateExpectedTds({
      financialYear,
      payerKind,
      events: transfers.map((t) => ({
        transactionId: t.transactionId,
        considerationInr: t.considerationInr,
        timestamp: t.timestamp,
      })),
    });

    const rule = getTaxRuleSet(financialYear);
    const recorded = await prisma.tdsRecord.findMany({
      where: {
        userId,
        date: {
          gte: new Date(rule.effectiveFrom),
          lte: new Date(`${rule.effectiveTo}T23:59:59.999Z`),
        },
      },
    });
    const reconciliation = reconcileTds({
      expectedLines: expected.lines,
      recorded: recorded.map((r) => ({
        transactionId: r.transactionId,
        tdsAmountInr: r.tdsAmountInr.toString(),
      })),
    });

    // Persist status updates on linked records — never invent matched amounts
    for (const item of reconciliation.items) {
      if (!item.transactionId) continue;
      await prisma.tdsRecord.updateMany({
        where: { userId, transactionId: item.transactionId },
        data: { status: mapTdsStatus(item.status) },
      });
    }

    await auditRepository.create({
      userId,
      action: 'TDS_RECONCILE',
      entityType: 'TdsReconciliation',
      entityId: financialYear,
      metadata: {
        financialYear,
        payerKind,
        totalExpectedTdsInr: expected.totalExpectedTdsInr,
        itemCount: reconciliation.items.length,
      },
    });

    return { expected, reconciliation };
  },
};

function mapTdsStatus(status) {
  const map = {
    MATCHED: 'MATCHED',
    PARTIALLY_MATCHED: 'PARTIALLY_MATCHED',
    NOT_FOUND: 'NOT_FOUND',
    NEEDS_REVIEW: 'NEEDS_REVIEW',
  };
  return map[status] || 'NEEDS_REVIEW';
}

function serializeCalculation(calc) {
  return {
    id: calc.id,
    financialYear: calc.financialYear,
    ruleSetId: calc.taxRule?.ruleSetId,
    ruleVersion: calc.taxRule?.version,
    isDraft: calc.taxRule?.isDraft,
    calculationVersion: calc.calculationVersion,
    calculationTimestamp: calc.calculationTimestamp,
    summary: {
      saleConsiderationInr: calc.saleConsideration?.toString() ?? null,
      acquisitionCostInr: calc.acquisitionCost?.toString() ?? null,
      vdaIncomeInr: calc.vdaIncome?.toString() ?? null,
      estimatedVdaTaxInr: calc.estimatedTax?.toString() ?? null,
      cessInr: calc.cess?.toString() ?? null,
      tdsDeductedInr: calc.tdsDeducted?.toString() ?? null,
      estimatedRemainingInr: calc.estimatedRemaining?.toString() ?? null,
    },
    transactions: (calc.taxTransactions || []).map((tt) => ({
      transactionId: tt.transactionId,
      asset: tt.transaction?.asset?.symbol,
      timestamp: tt.transaction?.timestamp,
      considerationInr: tt.consideration.toString(),
      acquisitionCostInr: tt.acquisitionCost.toString(),
      taxableIncomeInr: tt.income.toString(),
      estimatedTaxInr: tt.tax.toString(),
      breakdown: tt.breakdown,
    })),
    output: calc.output,
  };
}
