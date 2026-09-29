# ITR / Schedule VDA Reporting

## Principle

Do not hard-code today's ITR schema forever. Abstract export formats by financial year / assessment year.

## Status

Phase 1: documentation + data model hooks (`ReportType.SCHEDULE_VDA`, `ITR_READY`).

Phase 7: generate structured VDA data compatible with the applicable Schedule VDA requirements after verifying the official Income Tax Department schema and utilities for that year.

## Claims we will not make

- Direct e-filing capability — unless implemented and tested end-to-end  
- That Estimated VDA Tax equals Final Total Income-Tax Liability  

## Verification checklist before export

1. Confirm assessment year schema for selected FY  
2. Confirm Schedule VDA field definitions  
3. Map ledger fields → schema fields with version stamp  
4. Include unclassified / review-required warnings  
5. Store report payload + tax rule version for reproducibility  
