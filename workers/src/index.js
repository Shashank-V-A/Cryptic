/**
 * Background workers (BullMQ) — exchange sync and related jobs.
 * Falls back gracefully if Redis is down (API runs sync inline).
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../apps/api/.env') });

const queuesUrl = pathToFileURL(
  path.resolve(__dirname, '../../apps/api/src/jobs/queues.js'),
).href;

const { startExchangeSyncWorker } = await import(queuesUrl);

console.log('[workers] VDA Ledger workers starting…');
const worker = startExchangeSyncWorker();
if (!worker) {
  console.warn('[workers] Redis/BullMQ unavailable — API will process sync jobs inline.');
} else {
  console.log('[workers] Queues: exchange-sync');
}
