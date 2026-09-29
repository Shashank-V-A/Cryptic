import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { createApp } from './app.js';
import { loadApiConfig } from '@vda-ledger/config';
import { prisma } from './lib/prisma.js';
import { getRedis } from './lib/redis.js';

const config = loadApiConfig();
const app = createApp(config);

async function start() {
  try {
    await prisma.$connect();
    console.log('[api] Connected to PostgreSQL');
  } catch (err) {
    console.error('[api] PostgreSQL connection failed:', err.message);
    console.error('[api] Start docker compose: docker compose up -d');
  }

  try {
    const redis = getRedis(config.redisUrl);
    const pong = await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);
    if (pong) console.log('[api] Connected to Redis');
  } catch (err) {
    console.warn('[api] Redis unavailable (optional in Phase 1):', err.message);
  }

  app.listen(config.port, () => {
    console.log(`[api] VDA Ledger API listening on http://localhost:${config.port}`);
    console.log(`[api] demoMode=${config.demoMode} env=${config.nodeEnv}`);
  });
}

start().catch((err) => {
  console.error('[api] Fatal startup error', err);
  process.exit(1);
});
