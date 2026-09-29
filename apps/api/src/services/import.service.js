import { processCsvImport } from '@vda-ledger/financial-engine/csv';
import { transactionRepository } from '../repositories/transaction.repository.js';
import { assetRepository } from '../repositories/asset.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { portfolioService } from './portfolio.service.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

/** In-memory preview store for Phase 2 (replace with Redis in production). */
const previewStore = new Map();

export const importService = {
  async preview(userId, csvText, filename = 'upload.csv') {
    const existing = await transactionRepository.findExternalIds(userId);
    const existingSet = new Set(existing.map((e) => e.externalTransactionId).filter(Boolean));
    const result = processCsvImport(csvText, { existingExternalIds: existingSet });

    const previewId = `prev_${userId}_${Date.now()}`;
    previewStore.set(previewId, {
      userId,
      filename,
      createdAt: Date.now(),
      result,
      csvText,
    });

    // Expire after 1 hour
    setTimeout(() => previewStore.delete(previewId), 60 * 60 * 1000).unref?.();

    return {
      previewId,
      filename,
      summary: result.summary,
      items: result.items,
      formatHint:
        'Supports VDA Ledger CSV (timestamp,asset,type,quantity,price,fee,external_id) and CoinDCX-like trade exports.',
    };
  },

  async confirm(userId, previewId) {
    const preview = previewStore.get(previewId);
    if (!preview || preview.userId !== userId) {
      throw new AppError('Import preview not found or expired', {
        status: 404,
        code: 'PREVIEW_NOT_FOUND',
      });
    }

    const csvExchange = await prisma.exchange.findUnique({ where: { slug: 'CSV' } });
    const toImport = preview.result.items.filter(
      (i) => i.status === 'ok' || i.status === 'needs_review',
    );

    const batch = await prisma.importBatch.create({
      data: {
        userId,
        filename: preview.filename,
        source: 'CSV',
        status: 'confirming',
        summary: preview.result.summary,
      },
    });

    const rows = [];
    for (const item of toImport) {
      const n = item.normalized;
      const asset = await assetRepository.ensureAsset(n.assetSymbol, n.assetSymbol);
      rows.push({
        exchangeId: csvExchange?.id || null,
        externalTransactionId: n.externalTransactionId,
        timestamp: n.timestamp,
        assetId: asset.id,
        transactionType: n.transactionType,
        quantity: n.quantity,
        price: n.price,
        grossValue: n.grossValue,
        fee: n.fee,
        netValue: n.netValue,
        currency: n.currency,
        source: 'CSV_IMPORT',
        status: n.needsReview ? 'NEEDS_REVIEW' : 'POSTED',
        financialYear: n.financialYear,
        rawData: item.raw,
        metadata: {
          classificationConfidence: n.classificationConfidence,
          needsReview: n.needsReview,
          reviewReason: n.reviewReason,
          originalPayload: item.raw,
          normalizedPayload: n,
        },
      });
    }

    const created = await transactionRepository.createManyLedger(userId, rows);

    for (let i = 0; i < created.length; i += 1) {
      await prisma.importBatchItem.create({
        data: {
          batchId: batch.id,
          rowNumber: toImport[i].rowNumber,
          status: toImport[i].status,
          rawRow: toImport[i].raw,
          normalized: toImport[i].normalized,
          transactionId: created[i].id,
        },
      });
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: 'completed',
        confirmedAt: new Date(),
        summary: {
          ...preview.result.summary,
          inserted: created.length,
        },
      },
    });

    await auditRepository.create({
      userId,
      action: 'import.csv.confirmed',
      entityType: 'import_batch',
      entityId: batch.id,
      metadata: { inserted: created.length, filename: preview.filename },
    });

    previewStore.delete(previewId);

    const portfolio = await portfolioService.recalculateAndPersistLots(userId);

    return {
      batchId: batch.id,
      inserted: created.length,
      summary: preview.result.summary,
      portfolio,
    };
  },
};
