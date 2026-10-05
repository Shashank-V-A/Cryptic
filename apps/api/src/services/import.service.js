import { processCsvImport } from '@vda-ledger/financial-engine/csv';
import { loadApiConfig } from '@vda-ledger/config';
import { transactionRepository } from '../repositories/transaction.repository.js';
import { assetRepository } from '../repositories/asset.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { portfolioService } from './portfolio.service.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { getRedis } from '../lib/redis.js';

const PREVIEW_TTL_SEC = 3600;

/** In-memory fallback when Redis is unavailable. */
const previewStore = new Map();

function previewRedisKey(previewId) {
  return `import:preview:${previewId}`;
}

function getPreviewRedis() {
  try {
    const config = loadApiConfig();
    return getRedis(config.redisUrl);
  } catch {
    return null;
  }
}

async function savePreview(previewId, payload) {
  const redis = getPreviewRedis();
  if (redis) {
    try {
      await redis.set(previewRedisKey(previewId), JSON.stringify(payload), 'EX', PREVIEW_TTL_SEC);
      return;
    } catch {
      // fall through to memory
    }
  }
  previewStore.set(previewId, payload);
  setTimeout(() => previewStore.delete(previewId), PREVIEW_TTL_SEC * 1000).unref?.();
}

async function loadPreview(previewId) {
  const redis = getPreviewRedis();
  if (redis) {
    try {
      const raw = await redis.get(previewRedisKey(previewId));
      if (raw) return JSON.parse(raw);
    } catch {
      // fall through
    }
  }
  return previewStore.get(previewId) ?? null;
}

async function deletePreview(previewId) {
  const redis = getPreviewRedis();
  if (redis) {
    try {
      await redis.del(previewRedisKey(previewId));
    } catch {
      // ignore
    }
  }
  previewStore.delete(previewId);
}

export const importService = {
  async preview(userId, csvText, filename = 'upload.csv') {
    const existing = await transactionRepository.findExternalIds(userId);
    const existingSet = new Set(existing.map((e) => e.externalTransactionId).filter(Boolean));
    const result = processCsvImport(csvText, { existingExternalIds: existingSet });

    const previewId = `prev_${userId}_${Date.now()}`;
    await savePreview(previewId, {
      userId,
      filename,
      createdAt: Date.now(),
      result,
      csvText,
    });

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
    const preview = await loadPreview(previewId);
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

    await deletePreview(previewId);

    const portfolio = await portfolioService.recalculateAndPersistLots(userId);

    return {
      batchId: batch.id,
      inserted: created.length,
      summary: preview.result.summary,
      portfolio,
    };
  },
};
