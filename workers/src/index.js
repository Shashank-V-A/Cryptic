/**
 * Background workers (BullMQ) — sync, price refresh, report generation.
 * Phase 1: process bootstrap only. Job processors land with later phases.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('[workers] VDA Ledger workers scaffold ready (no job processors in Phase 1).');
console.log('[workers] Planned queues: exchange-sync, price-refresh, tax-recalc, report-generate');

// Keep process alive in watch mode without crashing when Redis is down.
setInterval(() => {}, 60_000);
