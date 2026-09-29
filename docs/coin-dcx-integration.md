# CoinDCX Integration

## Adapter pattern

```
ExchangeAdapter
  connect / disconnect
  getBalances / getTransactions / getOrders / getTrades
  getDeposits / getWithdrawals

CoinDCXAdapter extends ExchangeAdapter   (live HTTP when credentials present)
CSVAdapter extends ExchangeAdapter       (full CSV path — no credentials)
```

Location: `apps/api/src/integrations/exchange/`

## Permissions

**Allowed:** read balances, trades, active orders, statements  

**Never request:** trading, withdrawals, fund transfers  

## Official live endpoints used

Verified against https://docs.coindcx.com/ :

| Method | Path |
|--------|------|
| POST | `/exchange/v1/users/info` (connect check) |
| POST | `/exchange/v1/users/balances` |
| POST | `/exchange/v1/orders/trade_history` |
| POST | `/exchange/v1/orders/active_orders` |

Auth: HMAC-SHA256 of JSON body → `X-AUTH-SIGNATURE` + `X-AUTH-APIKEY`.

Deposits/withdrawals: not wired (no verified read mapping in-adapter) → `UnsupportedReadError`; use CSV.

## Credentials

- Store only encrypted API key/secret (`ENCRYPTION_KEY`, AES-256-GCM)  
- Never store CoinDCX account passwords  
- Mask secrets in logs  
- Connect validates credentials with live `/users/info` before marking `connected`

## Sync

1. `POST /api/exchanges/connections/:id/sync`  
2. Creates `SyncRun`, enqueues BullMQ `exchange-sync` (or runs **inline** if Redis down)  
3. Pull trades → normalize → dedupe by `externalTransactionId` → insert `EXCHANGE_SYNC`  
4. Update connection `lastSyncedAt`, `lastSyncStatus`, `lastTradeCursor`

## Without credentials

`CoinDCXAdapter.connect()` / `getBalances()` throw `CredentialError` — **never invent live data**.  
Use `CSVAdapter` or Transactions CSV import.

## Reconciliation

`POST /api/reconciliation/run` with optional `connectionId` compares exchange balances to ledger holdings. Mismatches are never auto-corrected.
