# Tax Engine

## Principles

1. Deterministic — identical inputs → identical outputs  
2. Versioned — `TaxRuleSet` per financial year  
3. Auditable — store rule version, input txn IDs, output payload  
4. No LLM math — AI may explain, never calculate  

## Package

`packages/tax-engine`

## Official verification (2026-09-29)

Encoded rates were verified against published Income Tax Department section text **before** implementation:

| Provision | Rate / rule | Official source |
|-----------|-------------|-----------------|
| s.115BBH(1)(a) | 30% on income from transfer of VDA | https://www.incometaxindia.gov.in/w/section-115bbh |
| s.115BBH(2)(a) | Only cost of acquisition deductible | same |
| s.115BBH(2)(b) | No set-off / carry-forward of VDA loss | same |
| s.194S(1) | TDS 1% of consideration | https://www.incometaxindia.gov.in/w/section-194s-4 |
| s.194S(3) | Threshold ₹50,000 (specified person) / ₹10,000 (others) | same |
| Health & Education Cess | 4% on income-tax + surcharge | https://www.incometaxindia.gov.in/w/tax-rates |

**Out of scope of Estimated VDA Tax:** surcharge (needs total income), Final Total Income-Tax Liability, Schedule VDA utility export (`filingReady=false` until ITR schema verified).

## Registered rule sets

| ID | FY | Status |
|----|----|--------|
| `FY_2024_25_v1` | FY 2024–25 | Statutory rates verified · estimate scope |
| `FY_2025_26_v1` | FY 2025–26 | Statutory rates verified · estimate scope |
| `FY_2026_27_v1` | FY 2026–27 | Statutory rates verified · estimate scope |

## API

```
GET  /api/tax?financialYear=
GET  /api/tax/:financialYear
POST /api/tax/:financialYear/calculate
GET  /api/tax/transactions/:id/breakdown
GET  /api/tax/transactions/:id/why
GET  /api/tax/rules
GET  /api/tax/audit
GET  /api/tds
POST /api/tds/records
POST /api/tds/reconcile
```

## Disclaimers

Distinguish **Estimated VDA Tax** from **Final Total Income-Tax Liability**.
