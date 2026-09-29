import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { APP_NAME } from '@vda-ledger/shared';
import { loadApiConfig } from '@vda-ledger/config';
import { TAX_RULE_SETS } from '@vda-ledger/tax-engine';

const config = loadApiConfig();

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let database = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'ok';
  } catch {
    database = 'unavailable';
  }

  res.json({
    status: database === 'ok' ? 'ok' : 'degraded',
    app: APP_NAME,
    phase: 1,
    demoMode: config.demoMode,
    database,
    taxRuleSetsRegistered: TAX_RULE_SETS.map((r) => r.id),
    timestamp: new Date().toISOString(),
  });
});
