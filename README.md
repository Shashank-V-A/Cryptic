# VDA Ledger

**Your Crypto Portfolio. Your Tax Ledger. One Source of Truth.**

India-focused crypto portfolio, transaction ledger, analytics, and tax intelligence platform.

> Phase 1 complete: monorepo architecture, PostgreSQL/Prisma schema, session authentication, design system, application shell, and editorial landing page. Financial calculation engines are intentionally stubbed — they throw rather than invent numbers.

## Architecture

```
apps/
  web/          React + Vite + Tailwind (UI)
  api/          Express + Prisma (API)
workers/        BullMQ workers (scaffold)
packages/
  shared/       Constants, FY helpers, disclaimers
  config/       Env loading
  tax-engine/   Versioned TaxRuleSet registry (calc in Phase 5)
  financial-engine/  Decimal helpers (P&L in Phase 3)
  ui/           Shared design tokens + primitives
docs/           Architecture & domain docs
design-reference/  Visual references (add PNGs when available)
```

Layering: **Routes → Controllers → Services → Domain → Repositories**

## Local setup

### Prerequisites

- Node.js 20+
- Docker (PostgreSQL + Redis)

### 1. Environment

```bash
cp .env.example .env
```

### 2. Infrastructure

```bash
docker compose up -d
```

### 3. Install & database

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Run

```bash
# Terminal A
npm run dev:api

# Terminal B
npm run dev:web
```

- Web: http://localhost:5173  
- API: http://localhost:4000/api/health  

### Demo login

After seeding:

- Email: `demo@vdaledger.in`
- Password: `DemoPass123!`

## Environment variables

See [.env.example](./.env.example).

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection (Docker maps host `5433` → container `5432`) |
| `REDIS_URL` | Redis (price cache / queues) |
| `SESSION_SECRET` | Session token hashing salt companion |
| `ENCRYPTION_KEY` | 32-byte hex key for API credential encryption |
| `DEMO_MODE` | Marks environment as demo |
| `COINDCX_API_KEY` / `SECRET` | Read-only only (Phase 8) |
| `PRICE_API_KEY` | Market data provider (Phase 3) |

**Never commit real secrets.**

## Seed instructions

```bash
npm run db:seed
```

Seeds: tax years, draft TaxRuleSets, exchange catalog, assets (BTC/ETH/SOL/USDT/INR), demo user.  
Transaction/portfolio/tax ledger demo data arrives in Phase 2+.

## CSV import

Recommended headers:

```text
timestamp,asset,type,quantity,price,fee,external_id
```

CoinDCX-like trade columns (`date`, `market`, `side`, `amount`, `price`, `fee`, `total`, `trade_id`) are also accepted.

Pipeline: Preview → Confirm → Insert (skip duplicates) → Recalculate lots (FIFO) → Portfolio refresh.

Sample file: `apps/api/fixtures/sample-coindcx-like.csv`

Unknown types are stored as `UNKNOWN` with **Review Required** — never silently classified.

- Adapter interface: `apps/api/src/integrations/exchange/ExchangeAdapter.js`
- Live sync is **not faked**. Use CSV import (Phase 2) until Phase 8.
- Only read permissions. Never trade/withdraw scopes.

## Tax engine

- Package: `packages/tax-engine`
- Rules are versioned (`FY_2025_26_v1`, `FY_2026_27_v1`) and marked **draft** pending official verification.
- `calculateVdaTax()` throws until Phase 5 — by design.

## Testing

```bash
npm test
```

Phase 1 covers shared FY helpers, tax registry stubs, and landing page render.

## Documentation

- [Architecture](./docs/architecture.md)
- [Tax engine](./docs/tax-engine.md)
- [CoinDCX](./docs/coin-dcx-integration.md)
- [Database](./docs/database.md)
- [Security](./docs/security.md)
- [ITR reporting](./docs/itr-reporting.md)

## Security notes

- httpOnly session cookies (not localStorage)
- Helmet, CORS, rate limits, Zod validation
- AES-256-GCM for exchange credentials
- Audit logs for auth events
- Secrets never logged

## Known limitations (Phase 1)

- No CSV import yet (Phase 2)
- No portfolio/P&L calculations (Phase 3)
- No live prices (Phase 3)
- No tax calculation engine (Phase 5)
- No CoinDCX live sync (Phase 8)
- Design-reference PNGs were not present at init — UI follows written editorial spec
