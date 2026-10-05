# VDA Ledger

**Your Crypto Portfolio. Your Tax Ledger. One Source of Truth.**

India-focused crypto portfolio, transaction ledger, analytics, and tax intelligence platform.

Shipped capabilities include CSV import (preview → confirm → FIFO lots), portfolio P&amp;L with FIFO lot accounting, versioned VDA tax estimation (30% + cess, TDS helpers), PDF/JSON reports (Schedule VDA, crypto tax summary), CoinDCX read-only trade sync, demo seed data, and session-based auth with encrypted exchange credentials.

## Architecture

```
apps/
  web/          React + Vite + Tailwind (UI)
  api/          Express + Prisma (API)
workers/        BullMQ workers (exchange sync)
packages/
  shared/       Constants, FY helpers, disclaimers
  config/       Env loading
  tax-engine/   Versioned TaxRuleSet + calculateVdaTax + Schedule VDA
  financial-engine/  FIFO lots, CSV import, P&L
  ui/           Shared design tokens + primitives
docs/           Architecture & domain docs
design-reference/  Visual references (PNG mocks not included in repo)
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

Optional full app stack (API + web + workers): see `docker-compose.app.yml`.

### 3. Install & database

```bash
npm install
npm run db:generate
npm run db:push
# or: npm run db:migrate
npm run db:seed
```

### 4. Run

```bash
# Terminal A
npm run dev:api

# Terminal B
npm run dev:web

# Optional — background jobs (requires Redis)
npm run dev:workers
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
| `REDIS_URL` | Redis (queues, price cache, import previews when available) |
| `SESSION_SECRET` | Session token hashing |
| `ENCRYPTION_KEY` | 32-byte hex key for API credential encryption |
| `CSRF_ENABLED` | Double-submit CSRF protection (on in production) |
| `COOKIE_SAMESITE` | Session cookie SameSite (`lax` / `strict` / `none`) |
| `LOG_LEVEL` | API log verbosity |
| `REPORT_STORAGE` | `local` or `s3` for generated report files |
| `S3_*` / `AWS_*` | S3-compatible storage when `REPORT_STORAGE=s3` |
| `PRICE_PROVIDER` | `coingecko`, `mock`, or `stub` market data |
| `DEMO_MODE` | Marks environment as demo |
| `COINDCX_API_KEY` / `SECRET` | Read-only CoinDCX sync (optional; CSV always available) |

**Never commit real secrets.**

## Seed instructions

```bash
npm run db:seed
```

Seeds tax years, TaxRuleSets (`isDraft` from each rule set), exchange catalog, assets, demo user, and a fictional demo ledger with FIFO lots recalculated via the production portfolio path.

## CSV import

Recommended headers:

```text
timestamp,asset,type,quantity,price,fee,external_id
```

CoinDCX-like trade columns (`date`, `market`, `side`, `amount`, `price`, `fee`, `total`, `trade_id`) are also accepted.

Pipeline: Preview → Confirm → Insert (skip duplicates) → Recalculate lots (FIFO) → Portfolio refresh.

Sample file: `apps/api/fixtures/sample-coindcx-like.csv`

Unknown types are stored as `UNKNOWN` with **Review Required** — never silently classified.

## CoinDCX

- Read-only API: balances, user info, trade history sync (paginated).
- Deposit/withdrawal history is attempted via transfer endpoints when credentials exist; gaps are surfaced in sync metadata — use CSV for missing transfer types.
- **Binance**: CSV import only (no live adapter yet).
- Adapter: `apps/api/src/integrations/exchange/CoinDCXAdapter.js`

## Tax engine & reports

- Package: `packages/tax-engine`
- Rules are versioned (`FY_2025_26_v1`, `FY_2026_27_v1`) and may remain **draft** until you verify against official sources.
- `calculateVdaTax()` produces **Estimated VDA Tax** (not Final Total Income-Tax Liability).
- Schedule VDA structured export is available for preparation; **`filingReady` is false** — not a certified ITR utility XSD package.

## Testing

```bash
npm test
```

CI (`.github/workflows/ci.yml`): `npm ci`, workspace unit tests, web production build.

Integration-style golden path: `apps/api/src/integrations/goldenPath.test.js` (CSV → FIFO → tax → Schedule VDA, no DB).

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

## Known limitations

- **SIPs** and **tax simulator** UI shells only (Phase placeholders — no persisted SIP execution or full what-if engine).
- **ITR e-filing**: structured data only; `filingReady=false` on rule sets and ITR-ready packages.
- **CoinDCX**: trade sync only; deposits/withdrawals may be incomplete — import via CSV when sync warns of gaps.
- **Binance / Kraken / CoinSwitch**: catalog entries; CSV import unless noted in Settings.
- **design-reference/** PNG mocks were not present at init — UI follows written editorial spec.
