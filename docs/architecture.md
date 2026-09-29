# Architecture

## Product

VDA Ledger is an India-focused crypto portfolio and VDA tax intelligence platform. The ledger is the source of truth; every important number must be traceable to original transactions.

## Monorepo layout

| Path | Role |
|------|------|
| `apps/web` | React SPA — editorial marketing + authenticated shell |
| `apps/api` | Express API — auth, future ledger/tax endpoints |
| `workers` | BullMQ job runners (sync, prices, reports) |
| `packages/shared` | Cross-cutting constants and FY helpers |
| `packages/tax-engine` | Deterministic versioned tax rules/calculations |
| `packages/financial-engine` | Lots, P&L, portfolio math (Decimal.js) |
| `packages/ui` | Design tokens and reusable primitives |
| `packages/config` | Environment loading |

## Request flow

```
HTTP Route → Controller → Service → Domain package → Repository (Prisma) → PostgreSQL
```

React components must not contain tax rates or portfolio formulas.

## Auth

Session tokens are random 32-byte values. Only SHA-256 hashes are stored. The raw token is set as an httpOnly `vda_session` cookie (`SameSite=Lax`).

## Phased delivery

1. Foundation (current)  
2. Ledger + CSV  
3. Portfolio + prices  
4. SIPs  
5. Tax engine + Tax Center  
6. TDS + reconciliation  
7. Reports / Schedule VDA  
8. CoinDCX sync  
9. Simulator + tax reserve  
10. Hardening / production  

## Deployment target

Frontend can deploy to Vercel. API + workers + PostgreSQL + Redis on a suitable backend host. HTTPS-ready via reverse proxy.
