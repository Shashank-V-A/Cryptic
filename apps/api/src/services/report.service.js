import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';
import {
  buildCryptoTaxReport,
  buildItrReadyPackage,
  buildScheduleVda,
  validateScheduleVda,
  toItrReadyScheduleVda,
  financialYearToAssessmentYear,
  REPORT_ENGINE_VERSION,
  TAX_ENGINE_VERSION,
} from '@vda-ledger/tax-engine';
import { auditRepository } from '../repositories/audit.repository.js';
import { AppError } from '../lib/errors.js';
import { portfolioService } from './portfolio.service.js';
import { taxService, tdsService } from './tax.service.js';
import { renderReportPdf } from '../lib/pdf.js';
import { reportStorage } from '../lib/storage.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, '../../storage/reports');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Load per-allocation Schedule VDA source rows (traceable to lots).
 */
async function loadScheduleAllocations(userId, financialYear) {
  await portfolioService.recalculateAndPersistLots(userId).catch(() => {});

  const sells = await prisma.transaction.findMany({
    where: {
      userId,
      financialYear,
      transactionType: 'SELL',
      status: { in: ['POSTED', 'NEEDS_REVIEW'] },
    },
    include: {
      asset: true,
      lotAllocations: {
        include: { lot: true },
      },
    },
    orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
  });

  const rows = [];
  const warnings = [];
  for (const sell of sells) {
    const allocs = sell.lotAllocations || [];
    if (!allocs.length) {
      // Do not invent cost of acquisition as 0 — omit from Schedule VDA and warn.
      warnings.push({
        code: 'MISSING_LOT_ALLOCATIONS',
        transactionId: sell.id,
        assetSymbol: sell.asset.symbol,
        message: `Sell ${sell.id} (${sell.asset.symbol}) has no lot allocations — excluded from Schedule VDA until lots are recalculated.`,
      });
      continue;
    }

    for (const a of allocs) {
      rows.push({
        sellTransactionId: sell.id,
        allocationId: a.id,
        lotId: a.lotId,
        assetSymbol: sell.asset.symbol,
        dateOfAcquisition: a.lot?.acquiredAt || sell.timestamp,
        dateOfTransfer: sell.timestamp,
        costOfAcquisitionInr: a.costBasisInr.toString(),
        considerationReceivedInr: a.proceedsInr.toString(),
        quantity: a.quantity.toString(),
        missingLots: false,
      });
    }
  }
  return { rows, warnings };
}

async function loadTransferInputs(userId, financialYear) {
  // Reuse tax calculation path by generating a calc (ensures lots)
  const calc = await taxService.calculate(userId, financialYear);
  const transfers = (calc.result?.lines || []).map((l) => ({
    transactionId: l.transactionId,
    timestamp: l.timestamp,
    assetSymbol: l.assetSymbol,
    considerationInr: l.considerationInr,
    acquisitionCostInr: l.acquisitionCostInr,
    financialYear,
    feesExcludedInr: l.feesExcludedInr,
  }));
  return {
    transfers,
    tdsDeductedInr: calc.summary?.tdsDeductedInr || '0',
    calculationId: calc.id,
  };
}

function titleFor(type, financialYear) {
  const map = {
    CRYPTO_TAX: 'Crypto Tax Report',
    SCHEDULE_VDA: 'Schedule VDA Data',
    ITR_READY: 'ITR-ready Structured Data',
    TRANSACTION_LEDGER: 'Transaction Ledger',
    TDS_RECONCILIATION: 'TDS Reconciliation',
    PORTFOLIO: 'Portfolio Report',
  };
  return `${map[type] || type} · ${financialYear}`;
}

export const reportService = {
  async list(userId) {
    const rows = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: { select: { transactions: true } },
      },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        financialYear: r.financialYear,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        transactionCount: r._count.transactions,
        hasPdf: Boolean(r.filePath),
      })),
    };
  },

  async get(userId, id) {
    const report = await prisma.report.findFirst({
      where: { id, userId },
      include: {
        transactions: {
          include: {
            transaction: { include: { asset: true } },
          },
        },
      },
    });
    if (!report) throw new AppError('Report not found', { status: 404, code: 'NOT_FOUND' });
    return serializeReport(report);
  },

  async generate(userId, { type, financialYear, payerKind = 'specified_person' }, ipAddress) {
    if (!financialYear) {
      throw new AppError('financialYear is required', { status: 400, code: 'VALIDATION' });
    }
    const allowed = [
      'CRYPTO_TAX',
      'SCHEDULE_VDA',
      'ITR_READY',
      'TRANSACTION_LEDGER',
      'TDS_RECONCILIATION',
      'PORTFOLIO',
    ];
    if (!allowed.includes(type)) {
      throw new AppError(`Unsupported report type: ${type}`, { status: 400, code: 'VALIDATION' });
    }

    const pending = await prisma.report.create({
      data: {
        userId,
        type,
        financialYear,
        status: 'GENERATING',
        title: titleFor(type, financialYear),
      },
    });

    try {
      const { rows: scheduleAllocations, warnings: lotWarnings } =
        await loadScheduleAllocations(userId, financialYear);
      const { transfers, tdsDeductedInr, calculationId } = await loadTransferInputs(
        userId,
        financialYear,
      );

      const tdsList = await tdsService.list(userId, { financialYear });
      const recordedTds = (tdsList.items || [])
        .filter((r) => r.transactionId)
        .map((r) => ({
          transactionId: r.transactionId,
          tdsAmountInr: r.tdsAmountInr,
        }));

      let payload;
      if (type === 'CRYPTO_TAX') {
        payload = buildCryptoTaxReport({
          financialYear,
          transfers,
          tdsDeductedInr,
          scheduleAllocations,
          payerKind,
          recordedTds,
        });
        payload.taxCalculationId = calculationId;
        payload.lotWarnings = lotWarnings;
      } else if (type === 'SCHEDULE_VDA') {
        const schedule = buildScheduleVda(scheduleAllocations);
        const validation = validateScheduleVda(schedule, { financialYear });
        validation.warnings = [...(validation.warnings || []), ...lotWarnings];
        if (lotWarnings.length) validation.ok = validation.ok && true; // warnings only — rows omitted
        payload = {
          reportType: 'SCHEDULE_VDA',
          reportEngineVersion: REPORT_ENGINE_VERSION,
          taxEngineVersion: TAX_ENGINE_VERSION,
          generatedAt: new Date().toISOString(),
          financialYear,
          assessmentYear: financialYearToAssessmentYear(financialYear),
          scheduleVda: schedule,
          scheduleValidation: validation,
          lotWarnings,
          transactionTrail: schedule.rows.map((r) => ({ serialNo: r.serialNo, ...r._trace })),
          disclaimer:
            'Schedule VDA structured data prepared from official ITR-2 column definitions. Not a certified e-filing package.',
        };
      } else if (type === 'ITR_READY') {
        payload = buildItrReadyPackage({
          financialYear,
          transfers,
          tdsDeductedInr,
          scheduleAllocations,
        });
        payload.taxCalculationId = calculationId;
        payload.lotWarnings = lotWarnings;
        if (payload.validation) {
          payload.validation.warnings = [
            ...(payload.validation.warnings || []),
            ...lotWarnings,
          ];
        }
      } else if (type === 'TDS_RECONCILIATION') {
        const recon = await tdsService.reconcile(userId, financialYear, { payerKind });
        payload = {
          reportType: 'TDS_RECONCILIATION',
          reportEngineVersion: REPORT_ENGINE_VERSION,
          generatedAt: new Date().toISOString(),
          financialYear,
          ...recon,
        };
      } else if (type === 'TRANSACTION_LEDGER') {
        const txns = await prisma.transaction.findMany({
          where: { userId, financialYear },
          include: { asset: true, exchange: true },
          orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
        });
        payload = {
          reportType: 'TRANSACTION_LEDGER',
          reportEngineVersion: REPORT_ENGINE_VERSION,
          generatedAt: new Date().toISOString(),
          financialYear,
          items: txns.map((t) => ({
            id: t.id,
            timestamp: t.timestamp.toISOString(),
            asset: t.asset.symbol,
            type: t.transactionType,
            quantity: t.quantity.toString(),
            price: t.price?.toString() ?? null,
            netValue: t.netValue?.toString() ?? null,
            fee: t.fee?.toString() ?? null,
            source: t.source,
            status: t.status,
            exchange: t.exchange?.name ?? null,
          })),
        };
      } else if (type === 'PORTFOLIO') {
        const portfolio = await portfolioService.calculate(userId);
        payload = {
          reportType: 'PORTFOLIO',
          reportEngineVersion: REPORT_ENGINE_VERSION,
          generatedAt: new Date().toISOString(),
          financialYear,
          asOf: portfolio.asOf,
          summary: portfolio.summary,
          holdings: portfolio.holdings,
          allocation: portfolio.allocation,
          methodology: portfolio.methodology,
        };
      }

      const txnIds = collectTransactionIds(payload, transfers, scheduleAllocations);

      const dir = path.join(STORAGE_ROOT, userId);
      await ensureDir(dir);
      const pdfPath = path.join(dir, `${pending.id}.pdf`);
      const pdfBuffer = await renderReportPdf({
        id: pending.id,
        type,
        title: titleFor(type, financialYear),
        financialYear,
        createdAt: new Date().toISOString(),
        payload,
      });
      await fs.writeFile(pdfPath, pdfBuffer);

      const jsonPath = path.join(dir, `${pending.id}.json`);
      const jsonBody = JSON.stringify(payload, null, 2);
      await fs.writeFile(jsonPath, jsonBody, 'utf8');

      // Optional remote mirror (S3) — local paths remain source of truth for downloads
      await reportStorage
        .put(`${userId}/${pending.id}.pdf`, pdfBuffer, { contentType: 'application/pdf' })
        .catch((err) => logger.warn('Report remote store skipped', { error: err.message }));
      await reportStorage
        .put(`${userId}/${pending.id}.json`, Buffer.from(jsonBody, 'utf8'), {
          contentType: 'application/json',
        })
        .catch((err) => logger.warn('Report JSON remote store skipped', { error: err.message }));

      const ready = await prisma.report.update({
        where: { id: pending.id },
        data: {
          status: 'READY',
          payload,
          filePath: pdfPath,
          transactions: {
            create: [...new Set(txnIds)].map((transactionId) => ({ transactionId })),
          },
        },
        include: {
          transactions: {
            include: { transaction: { include: { asset: true } } },
          },
        },
      });

      await auditRepository.create({
        userId,
        action: 'REPORT_GENERATE',
        entityType: 'Report',
        entityId: ready.id,
        metadata: {
          type,
          financialYear,
          transactionCount: txnIds.length,
          validationOk:
            payload.scheduleValidation?.ok ??
            payload.validation?.ok ??
            null,
        },
        ipAddress,
      });

      return serializeReport(ready);
    } catch (err) {
      await prisma.report.update({
        where: { id: pending.id },
        data: {
          status: 'FAILED',
          payload: { error: err.message },
        },
      });
      await auditRepository.create({
        userId,
        action: 'REPORT_GENERATE_FAILED',
        entityType: 'Report',
        entityId: pending.id,
        metadata: { type, financialYear, error: err.message },
        ipAddress,
      });
      throw err;
    }
  },

  async getPdfPath(userId, id) {
    const report = await prisma.report.findFirst({ where: { id, userId } });
    if (!report) throw new AppError('Report not found', { status: 404, code: 'NOT_FOUND' });
    if (report.status !== 'READY' || !report.filePath) {
      throw new AppError('PDF not ready', { status: 409, code: 'NOT_READY' });
    }
    return { report, filePath: report.filePath };
  },

  async getJsonPath(userId, id) {
    const report = await prisma.report.findFirst({ where: { id, userId } });
    if (!report) throw new AppError('Report not found', { status: 404, code: 'NOT_FOUND' });
    if (report.status !== 'READY') {
      throw new AppError('Report not ready', { status: 409, code: 'NOT_READY' });
    }
    const jsonPath = report.filePath
      ? report.filePath.replace(/\.pdf$/i, '.json')
      : null;
    return { report, jsonPath, payload: report.payload };
  },
};

function collectTransactionIds(payload, transfers, scheduleAllocations) {
  const ids = [];
  for (const t of transfers || []) ids.push(t.transactionId);
  for (const a of scheduleAllocations || []) {
    if (a.sellTransactionId) ids.push(a.sellTransactionId);
  }
  for (const t of payload?.transactionTrail || []) {
    if (t.sellTransactionId) ids.push(t.sellTransactionId);
  }
  for (const l of payload?.taxLines || []) {
    if (l.transactionId) ids.push(l.transactionId);
  }
  for (const item of payload?.items || []) {
    if (item.id) ids.push(item.id);
  }
  return ids.filter(Boolean);
}

function serializeReport(report) {
  return {
    id: report.id,
    type: report.type,
    title: report.title,
    financialYear: report.financialYear,
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    hasPdf: Boolean(report.filePath),
    payload: report.payload,
    transactions: (report.transactions || []).map((rt) => ({
      transactionId: rt.transactionId,
      asset: rt.transaction?.asset?.symbol,
      type: rt.transaction?.transactionType,
      timestamp: rt.transaction?.timestamp,
      quantity: rt.transaction?.quantity?.toString?.() ?? null,
    })),
  };
}
