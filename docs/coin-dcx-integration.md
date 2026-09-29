# CoinDCX Integration

## Adapter pattern

```
ExchangeAdapter
  connect / disconnect
  getBalances / getTransactions / getOrders / getTrades
  getDeposits / getWithdrawals

CoinDCXAdapter extends ExchangeAdapter
CSVAdapter extends ExchangeAdapter
```

Location: `apps/api/src/integrations/exchange/ExchangeAdapter.js`

## Permissions

**Allowed:** read balances, trades, deposits, withdrawals, statements  

**Never request:** trading, withdrawals, fund transfers  

## Credentials

- Store only encrypted API key/secret (`ENCRYPTION_KEY`, AES-256-GCM)  
- Never store CoinDCX account passwords  
- Mask secrets in logs  

## Current status

Live HTTP client is **not implemented** (Phase 8). Calling `CoinDCXAdapter.connect()` fails clearly rather than returning fake data.

## Interim path

CSV import of CoinDCX statements (Phase 2 pipeline):

Upload → Parse → Validate → Normalize → Dedupe → Preview → Confirm → Recalculate
