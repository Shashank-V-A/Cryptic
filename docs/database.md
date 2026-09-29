# Database

## Engine

PostgreSQL 16 via Docker Compose (`docker-compose.yml`).

ORM: Prisma (`apps/api/prisma/schema.prisma`).

## Core models

users, sessions, accounts, exchanges, exchange_connections, assets, asset_prices, transactions (+ fees/metadata), acquisition_lots, lot_allocations, portfolio_snapshots, sip_plans, sip_transactions, tax_years, tax_rules, tax_calculations, tax_transactions, tds_records, reconciliation_runs/items, reports, audit_logs, notifications, import_batches.

## Important constraints

- Unique `(userId, exchangeId, externalTransactionId)` for deduplication  
- Indexes on `userId`, `assetId`, `timestamp`, `financialYear`, `externalTransactionId`  
- Monetary/crypto fields use `Decimal` — not floats  

## Commands

```bash
npm run db:generate
npm run db:push      # Phase 1 / local
npm run db:migrate   # when introducing migrations
npm run db:seed
npm run db:studio
```
