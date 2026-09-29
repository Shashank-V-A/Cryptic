import { Queue, Worker } from 'bullmq';
import { loadApiConfig } from '@vda-ledger/config';

const config = loadApiConfig();
const EXCHANGE_SYNC_QUEUE = 'exchange-sync';

let queue = null;
let queueFailed = false;
let worker = null;

function redisConnection() {
  const url = new URL(config.redisUrl || 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    maxRetriesPerRequest: null,
  };
}

function getQueue() {
  if (queueFailed) return null;
  if (queue) return queue;
  try {
    queue = new Queue(EXCHANGE_SYNC_QUEUE, {
      connection: redisConnection(),
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });
    queue.on('error', (err) => {
      console.warn('[queue]', err.message);
      queueFailed = true;
    });
    return queue;
  } catch (err) {
    console.warn('[queue] unavailable:', err.message);
    queueFailed = true;
    return null;
  }
}

export function isQueueAvailable() {
  return Boolean(getQueue()) && !queueFailed;
}

/**
 * Enqueue exchange sync, or run inline when Redis/BullMQ is unavailable.
 */
export async function enqueueExchangeSync(payload) {
  const q = getQueue();
  if (!q) {
    const { exchangeService } = await import('../services/exchange.service.js');
    await exchangeService.executeSyncRun(payload.syncRunId);
    return { mode: 'inline', jobId: null };
  }

  try {
    const job = await q.add('sync', payload, {
      jobId: `sync-${payload.syncRunId}`,
    });
    return { mode: 'queue', jobId: String(job.id) };
  } catch (err) {
    console.warn('[queue] enqueue failed, running inline:', err.message);
    queueFailed = true;
    const { exchangeService } = await import('../services/exchange.service.js');
    await exchangeService.executeSyncRun(payload.syncRunId);
    return { mode: 'inline', jobId: null };
  }
}

/**
 * Start BullMQ worker process (called from workers package or API bootstrap).
 */
export function startExchangeSyncWorker() {
  if (worker) return worker;
  try {
    worker = new Worker(
      EXCHANGE_SYNC_QUEUE,
      async (job) => {
        const { exchangeService } = await import('../services/exchange.service.js');
        return exchangeService.executeSyncRun(job.data.syncRunId);
      },
      { connection: redisConnection(), concurrency: 1 },
    );
    worker.on('failed', (job, err) => {
      console.error('[worker] exchange-sync failed', job?.id, err.message);
    });
    worker.on('completed', (job) => {
      console.log('[worker] exchange-sync completed', job.id);
    });
    console.log('[worker] exchange-sync listening');
    return worker;
  } catch (err) {
    console.warn('[worker] could not start:', err.message);
    return null;
  }
}

export { EXCHANGE_SYNC_QUEUE };
