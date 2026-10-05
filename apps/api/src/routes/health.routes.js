import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { APP_NAME } from '@vda-ledger/shared';
import { loadApiConfig } from '@vda-ledger/config';
import { TAX_RULE_SETS } from '@vda-ledger/tax-engine';
import { isRedisAvailable } from '../lib/redis.js';

const config = loadApiConfig();
const startedAt = Date.now();

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let database = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'ok';
  } catch {
    database = 'unavailable';
  }

  const redis = isRedisAvailable() ? 'ok' : 'unavailable';
  const status = database === 'ok' ? 'ok' : 'degraded';

  res.json({
    status,
    app: APP_NAME,
    version: '0.1.0',
    demoMode: config.demoMode,
    database,
    redis,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    priceProvider: config.priceProvider,
    reportStorage: config.reportStorage,
    taxRuleSetsRegistered: TAX_RULE_SETS.map((r) => r.id),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/metrics', async (_req, res) => {
  let users = 0;
  let transactions = 0;
  try {
    [users, transactions] = await Promise.all([
      prisma.user.count(),
      prisma.transaction.count(),
    ]);
  } catch {
    // leave zeros
  }
  res.type('text/plain').send(
    [
      '# HELP vda_up 1 if process is up',
      '# TYPE vda_up gauge',
      'vda_up 1',
      '# HELP vda_users_total Registered users',
      '# TYPE vda_users_total gauge',
      `vda_users_total ${users}`,
      '# HELP vda_transactions_total Ledger transactions',
      '# TYPE vda_transactions_total gauge',
      `vda_transactions_total ${transactions}`,
      '# HELP vda_uptime_seconds Process uptime',
      '# TYPE vda_uptime_seconds counter',
      `vda_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
      '',
    ].join('\n'),
  );
});
