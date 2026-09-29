import { prisma } from '../lib/prisma.js';
import { encryptSecret, decryptSecret, maskSecret } from '../lib/crypto.js';
import { loadApiConfig } from '@vda-ledger/config';
import { AppError } from '../lib/errors.js';
import { auditRepository } from '../repositories/audit.repository.js';
import {
  createExchangeAdapter,
  CredentialError,
  ExchangeError,
} from '../integrations/exchange/index.js';
import { transactionRepository } from '../repositories/transaction.repository.js';
import { assetRepository } from '../repositories/asset.repository.js';
import { portfolioService } from './portfolio.service.js';
import { enqueueExchangeSync, isQueueAvailable } from '../jobs/queues.js';

const config = loadApiConfig();

function publicConnection(row) {
  return {
    id: row.id,
    exchange: row.exchange
      ? { slug: row.exchange.slug, name: row.exchange.name, website: row.exchange.website }
      : null,
    label: row.label,
    permissionsScope: row.permissionsScope,
    status: row.status,
    lastSyncedAt: row.lastSyncedAt,
    lastSyncStatus: row.lastSyncStatus,
    lastSyncError: row.lastSyncError,
    hasCredentials: Boolean(row.encryptedApiKey && row.encryptedApiSecret),
    apiKeyMasked: row.encryptedApiKey ? '••••••••' : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const exchangeService = {
  async listExchanges() {
    const rows = await prisma.exchange.findMany({ orderBy: { name: 'asc' } });
    return rows.map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      website: e.website,
      adapterReady: ['COINDCX', 'CSV'].includes(e.slug),
      liveSyncSupported: e.slug === 'COINDCX',
    }));
  },

  async listConnections(userId) {
    const rows = await prisma.exchangeConnection.findMany({
      where: { userId },
      include: { exchange: true },
      orderBy: { createdAt: 'desc' },
    });
    return { items: rows.map(publicConnection) };
  },

  async upsertConnection(
    userId,
    { exchangeSlug = 'COINDCX', label, apiKey, apiSecret },
    ipAddress,
  ) {
    if (String(exchangeSlug).toUpperCase() !== 'COINDCX') {
      throw new AppError('Only CoinDCX live connections are supported currently', {
        status: 400,
        code: 'UNSUPPORTED_EXCHANGE',
      });
    }
    if (!apiKey || !apiSecret) {
      throw new AppError('apiKey and apiSecret are required', {
        status: 400,
        code: 'VALIDATION',
      });
    }

    const exchange = await prisma.exchange.findUnique({
      where: { slug: 'COINDCX' },
    });
    if (!exchange) {
      throw new AppError('CoinDCX exchange record missing — run db:seed', {
        status: 500,
        code: 'EXCHANGE_MISSING',
      });
    }

    // Validate credentials against live API when provided — never store unverified secrets silently as "connected"
    const adapter = createExchangeAdapter('COINDCX', { apiKey, apiSecret });
    try {
      await adapter.connect();
    } catch (err) {
      if (err instanceof CredentialError) throw err;
      // Store as disconnected with error if live validation fails (e.g. wrong key / network)
      const existing = await prisma.exchangeConnection.findFirst({
        where: { userId, exchangeId: exchange.id },
      });
      const encryptedApiKey = encryptSecret(apiKey, config.encryptionKey);
      const encryptedApiSecret = encryptSecret(apiSecret, config.encryptionKey);
      const data = {
        label: label || 'CoinDCX',
        encryptedApiKey,
        encryptedApiSecret,
        permissionsScope: 'read',
        status: 'error',
        lastSyncStatus: 'CREDENTIAL_CHECK_FAILED',
        lastSyncError: err.message,
      };
      const row = existing
        ? await prisma.exchangeConnection.update({ where: { id: existing.id }, data, include: { exchange: true } })
        : await prisma.exchangeConnection.create({
            data: { userId, exchangeId: exchange.id, ...data },
            include: { exchange: true },
          });
      await auditRepository.create({
        userId,
        action: 'EXCHANGE_CONNECT_FAILED',
        entityType: 'ExchangeConnection',
        entityId: row.id,
        metadata: { error: err.message, apiKeyMasked: maskSecret(apiKey) },
        ipAddress,
      });
      throw new AppError(`CoinDCX credential check failed: ${err.message}`, {
        status: 400,
        code: err.code || 'CREDENTIAL_CHECK_FAILED',
        details: { connection: publicConnection(row) },
      });
    }

    const encryptedApiKey = encryptSecret(apiKey, config.encryptionKey);
    const encryptedApiSecret = encryptSecret(apiSecret, config.encryptionKey);

    const existing = await prisma.exchangeConnection.findFirst({
      where: { userId, exchangeId: exchange.id },
    });

    const row = existing
      ? await prisma.exchangeConnection.update({
          where: { id: existing.id },
          data: {
            label: label || existing.label || 'CoinDCX',
            encryptedApiKey,
            encryptedApiSecret,
            permissionsScope: 'read',
            status: 'connected',
            lastSyncError: null,
            lastSyncStatus: 'CONNECTED',
          },
          include: { exchange: true },
        })
      : await prisma.exchangeConnection.create({
          data: {
            userId,
            exchangeId: exchange.id,
            label: label || 'CoinDCX',
            encryptedApiKey,
            encryptedApiSecret,
            permissionsScope: 'read',
            status: 'connected',
            lastSyncStatus: 'CONNECTED',
          },
          include: { exchange: true },
        });

    await auditRepository.create({
      userId,
      action: 'EXCHANGE_CONNECT',
      entityType: 'ExchangeConnection',
      entityId: row.id,
      metadata: { exchange: 'COINDCX', apiKeyMasked: maskSecret(apiKey) },
      ipAddress,
    });

    return publicConnection(row);
  },

  async disconnect(userId, connectionId, ipAddress) {
    const row = await prisma.exchangeConnection.findFirst({
      where: { id: connectionId, userId },
      include: { exchange: true },
    });
    if (!row) throw new AppError('Connection not found', { status: 404, code: 'NOT_FOUND' });

    const updated = await prisma.exchangeConnection.update({
      where: { id: row.id },
      data: {
        encryptedApiKey: null,
        encryptedApiSecret: null,
        status: 'disconnected',
        lastSyncStatus: 'DISCONNECTED',
        lastSyncError: null,
      },
      include: { exchange: true },
    });

    await auditRepository.create({
      userId,
      action: 'EXCHANGE_DISCONNECT',
      entityType: 'ExchangeConnection',
      entityId: row.id,
      ipAddress,
    });

    return publicConnection(updated);
  },

  async getAdapterForConnection(connection) {
    if (!connection.encryptedApiKey || !connection.encryptedApiSecret) {
      throw new CredentialError(
        'No encrypted credentials on this connection. Add a read-only API key or use CSV import.',
      );
    }
    const apiKey = decryptSecret(connection.encryptedApiKey, config.encryptionKey);
    const apiSecret = decryptSecret(connection.encryptedApiSecret, config.encryptionKey);
    return createExchangeAdapter(connection.exchange.slug, { apiKey, apiSecret });
  },

  async requestSync(userId, connectionId, ipAddress) {
    const connection = await prisma.exchangeConnection.findFirst({
      where: { id: connectionId, userId },
      include: { exchange: true },
    });
    if (!connection) throw new AppError('Connection not found', { status: 404, code: 'NOT_FOUND' });
    if (!connection.encryptedApiKey) {
      throw new AppError(
        'Connection has no credentials. Connect with a CoinDCX read-only API key, or import CSV.',
        { status: 400, code: 'CREDENTIALS_REQUIRED' },
      );
    }

    const syncRun = await prisma.syncRun.create({
      data: {
        userId,
        connectionId: connection.id,
        status: 'PENDING',
      },
    });

    await auditRepository.create({
      userId,
      action: 'EXCHANGE_SYNC_REQUESTED',
      entityType: 'SyncRun',
      entityId: syncRun.id,
      metadata: { connectionId },
      ipAddress,
    });

    const queued = await enqueueExchangeSync({
      syncRunId: syncRun.id,
      userId,
      connectionId: connection.id,
    });

    if (queued.mode === 'inline') {
      // Already processed synchronously
      const fresh = await prisma.syncRun.findUnique({ where: { id: syncRun.id } });
      return {
        syncRunId: syncRun.id,
        mode: 'inline',
        status: fresh?.status,
        summary: fresh?.summary,
        queueAvailable: false,
      };
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: { jobId: queued.jobId, status: 'QUEUED' },
    });

    return {
      syncRunId: syncRun.id,
      mode: 'queue',
      status: 'QUEUED',
      jobId: queued.jobId,
      queueAvailable: true,
    };
  },

  async listSyncRuns(userId, { connectionId, take = 20 } = {}) {
    const rows = await prisma.syncRun.findMany({
      where: {
        userId,
        ...(connectionId ? { connectionId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        connectionId: r.connectionId,
        status: r.status,
        jobId: r.jobId,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        summary: r.summary,
        errorMessage: r.errorMessage,
      })),
      queueAvailable: isQueueAvailable(),
    };
  },

  /**
   * Execute sync for a SyncRun — used by worker and inline fallback.
   */
  async executeSyncRun(syncRunId) {
    const run = await prisma.syncRun.findUnique({
      where: { id: syncRunId },
      include: {
        connection: { include: { exchange: true } },
      },
    });
    if (!run) throw new Error(`SyncRun ${syncRunId} not found`);

    await prisma.syncRun.update({
      where: { id: syncRunId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
    await prisma.exchangeConnection.update({
      where: { id: run.connectionId },
      data: { status: 'syncing', lastSyncStatus: 'RUNNING', lastSyncError: null },
    });

    try {
      const adapter = await this.getAdapterForConnection(run.connection);
      await adapter.connect();

      const fromId = run.connection.lastTradeCursor
        ? Number(run.connection.lastTradeCursor)
        : null;
      const normalized = await adapter.getTransactions({ fromId });

      const existing = await transactionRepository.findExternalIds(run.userId);
      const existingSet = new Set(existing.map((e) => e.externalTransactionId).filter(Boolean));

      let inserted = 0;
      let duplicates = 0;
      let needsReview = 0;
      let lastCursor = run.connection.lastTradeCursor;

      const rows = [];
      for (const n of normalized) {
        if (n.externalId && existingSet.has(String(n.externalId))) {
          duplicates += 1;
          continue;
        }
        if (n.externalId) existingSet.add(String(n.externalId));
        if (n.needsReview) needsReview += 1;

        const asset = await assetRepository.ensureAsset(n.assetSymbol, n.assetSymbol);
        rows.push({
          exchangeId: run.connection.exchangeId,
          externalTransactionId: n.externalId,
          timestamp: n.timestamp,
          assetId: asset.id,
          transactionType: n.transactionType,
          quantity: n.quantity,
          price: n.price,
          grossValue: n.grossValue,
          fee: n.fee,
          netValue: n.netValue,
          currency: n.currency || 'INR',
          source: 'EXCHANGE_SYNC',
          status: n.needsReview ? 'NEEDS_REVIEW' : 'POSTED',
          financialYear: n.financialYear,
          rawData: n.raw,
          metadata: {
            classificationConfidence: n.needsReview ? 0.5 : 1,
            needsReview: Boolean(n.needsReview),
            reviewReason: n.reviewReason,
            originalPayload: n.raw,
            normalizedPayload: n,
          },
        });
        if (n.raw?.id != null) lastCursor = String(n.raw.id);
      }

      const created = await transactionRepository.createManyLedger(run.userId, rows);
      inserted = created.length;

      let portfolio = null;
      if (inserted > 0) {
        portfolio = await portfolioService.recalculateAndPersistLots(run.userId);
      }

      const summary = {
        fetched: normalized.length,
        inserted,
        duplicates,
        needsReview,
        lastTradeCursor: lastCursor,
        portfolioHoldings: portfolio?.holdings?.map((h) => h.assetSymbol) || null,
      };

      await prisma.syncRun.update({
        where: { id: syncRunId },
        data: {
          status: 'SUCCEEDED',
          finishedAt: new Date(),
          summary,
          errorMessage: null,
        },
      });
      await prisma.exchangeConnection.update({
        where: { id: run.connectionId },
        data: {
          status: 'connected',
          lastSyncedAt: new Date(),
          lastSyncStatus: 'SUCCEEDED',
          lastSyncError: null,
          lastTradeCursor: lastCursor,
        },
      });

      await auditRepository.create({
        userId: run.userId,
        action: 'EXCHANGE_SYNC_SUCCEEDED',
        entityType: 'SyncRun',
        entityId: syncRunId,
        metadata: summary,
      });

      return summary;
    } catch (err) {
      const message = err.message || 'Sync failed';
      await prisma.syncRun.update({
        where: { id: syncRunId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: message,
          summary: { code: err.code || 'SYNC_FAILED' },
        },
      });
      await prisma.exchangeConnection.update({
        where: { id: run.connectionId },
        data: {
          status: run.connection.encryptedApiKey ? 'error' : 'disconnected',
          lastSyncStatus: 'FAILED',
          lastSyncError: message,
        },
      });
      await auditRepository.create({
        userId: run.userId,
        action: 'EXCHANGE_SYNC_FAILED',
        entityType: 'SyncRun',
        entityId: syncRunId,
        metadata: { error: message, code: err.code },
      });
      throw err;
    }
  },
};
