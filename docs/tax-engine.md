# Tax Engine

## Principles

1. Deterministic — identical inputs → identical outputs  
2. Versioned — `TaxRuleSet` per financial year  
3. Auditable — store rule version, input txn IDs, output payload  
4. No LLM math — AI may explain, never calculate  

## Package

`packages/tax-engine`

## Registered rule sets (draft)

| ID | FY | Status |
|----|----|--------|
| `FY_2025_26_v1` | FY 2025–26 | Draft — verify before production |
| `FY_2026_27_v1` | FY 2026–27 | Draft — verify before production |

Draft rates currently mirror historically discussed VDA special rate (30%) + cess/TDS parameters as placeholders. **These are not filing authority.**

## Official sources to verify before production

Before enabling production tax calculations for a financial year, verify against:

- Income Tax Department: https://www.incometax.gov.in  
- Applicable Finance Act / Budget notifications for that FY  
- Section 115BBH (VDA taxation) and related provisions as amended  
- Section 194S (TDS on VDA) parameters for the FY  
- Current ITR schema / Schedule VDA utilities for the assessment year  

Document the exact circular/notification/utility version in `TaxRule.officialSource` when verified, and set `isDraft: false`.

## API surface (Phase 5+)

```js
getTaxRuleSet(financialYear)
calculateVdaTax({ transactions, lots, financialYear, tdsRecords, ruleSetId })
```

Phase 1: `calculateVdaTax` throws intentionally.

## Disclaimers

Distinguish **Estimated VDA Tax** from **Final Total Income-Tax Liability**.
