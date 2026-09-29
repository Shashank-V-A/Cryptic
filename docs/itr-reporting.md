# ITR / Schedule VDA Reporting

## Principle

Do not hard-code today's ITR schema forever. Abstract export formats by financial year / assessment year.

## Verified Schedule VDA columns

Field definitions taken from Income Tax Department **Instructions to Form ITR-2 (AY 2023-24)** — Schedule VDA:

| # | Field |
|---|--------|
| 1 | S. No |
| 2 | Date of Acquisition |
| 3 | Date of Transfer |
| 4 | Head under which income to be taxed (Capital Gain) |
| 5 | Cost of Acquisition |
| 6 | Consideration Received |
| 7 | Income from transfer (Col.6 − Col.5; **nil if loss**) |

Total = sum of positive incomes in Col.7.

**Sources**

- https://www.incometaxindia.gov.in/documents/20117/11038805/Instructions_ITR2_AY_2023_24.pdf  
- ITR-2 FAQ: Schedule VDA is transaction-wise, taxed at 30% under s.115BBH  
- AY 2026-27 ITR-2 Schema Change Document v1.2 (13 Aug 2026) lists **no** Schedule VDA field changes  

## Implementation

| Artifact | Location |
|----------|----------|
| Builder + validator | `packages/tax-engine/src/scheduleVda.js` |
| Report payloads | `packages/tax-engine/src/reports.js` |
| API | `POST /api/reports/generate`, `GET /api/reports`, `GET /api/reports/:id`, downloads |
| PDF | `apps/api/src/lib/pdf.js` (PDFKit) |

Rows are built **one per lot allocation** so Date of Acquisition is accurate and each row links to `sellTransactionId` / `allocationId` / `lotId`.

## Claims we will not make

- Direct e-filing capability — unless implemented and tested end-to-end  
- That Estimated VDA Tax equals Final Total Income-Tax Liability  
- That ITR-ready JSON is a certified utility XSD package (`filingReady: false`)

## API

```
GET  /api/reports
POST /api/reports/generate   { type, financialYear, payerKind? }
GET  /api/reports/:id
GET  /api/reports/:id/download.pdf
GET  /api/reports/:id/download.json
```

Types: `CRYPTO_TAX` | `SCHEDULE_VDA` | `ITR_READY` | `TDS_RECONCILIATION` | `TRANSACTION_LEDGER` | `PORTFOLIO`
