/**
 * CoinDCX market / trade normalization — deterministic, no invented prices.
 * Official trade_history fields (docs.coindcx.com):
 *   id, order_id, side, fee_amount, ecode, quantity, price, symbol, timestamp
 */

import { toDecimal, zero } from '@vda-ledger/financial-engine';
import { getFinancialYearForDate } from '@vda-ledger/shared';

const QUOTE_SUFFIXES = ['INR', 'USDT', 'USDC', 'BTC', 'ETH', 'BNB'];

/**
 * Parse CoinDCX symbol (e.g. BTCINR, USDTINR, ETHBTC) into base + quote.
 */
export function parseCoinDcxMarket(symbol) {
  const s = String(symbol || '').toUpperCase().replace(/[-_/]/g, '');
  for (const q of QUOTE_SUFFIXES) {
    if (s.endsWith(q) && s.length > q.length) {
      return { base: s.slice(0, -q.length), quote: q, raw: symbol };
    }
  }
  return { base: s || 'UNKNOWN', quote: 'INR', raw: symbol };
}

/**
 * @param {object} trade — raw CoinDCX trade_history row
 * @returns {import('./ExchangeAdapter.js').NormalizedExchangeTxn}
 */
export function normalizeCoinDcxTrade(trade) {
  const { base, quote } = parseCoinDcxMarket(trade.symbol);
  const side = String(trade.side || '').toLowerCase();
  const qty = toDecimal(trade.quantity ?? 0);
  const price = trade.price != null && trade.price !== '' ? toDecimal(trade.price) : null;
  const fee = trade.fee_amount != null && trade.fee_amount !== '' ? toDecimal(trade.fee_amount) : zero();
  const gross = price ? price.times(qty) : null;
  const tsMs = Number(trade.timestamp);
  const timestamp = Number.isFinite(tsMs)
    ? new Date(tsMs).toISOString()
    : new Date(trade.timestamp).toISOString();

  let transactionType = 'UNKNOWN';
  if (side === 'buy') transactionType = 'BUY';
  else if (side === 'sell') transactionType = 'SELL';

  // Prefer INR-quoted markets for INR ledger; non-INR quotes marked for review.
  const needsReview = quote !== 'INR' || transactionType === 'UNKNOWN';
  const currency = quote === 'INR' ? 'INR' : quote;

  let netValue = null;
  if (gross) {
    netValue =
      transactionType === 'BUY' ? gross.plus(fee) : gross.minus(fee);
  }

  return {
    externalId: String(trade.id ?? `${trade.order_id}-${trade.timestamp}`),
    timestamp,
    assetSymbol: base,
    transactionType,
    quantity: qty.toFixed(),
    price: price ? price.toFixed() : null,
    fee: fee.isZero() ? null : fee.toFixed(),
    grossValue: gross ? gross.toFixed() : null,
    netValue: netValue ? netValue.toFixed() : null,
    currency,
    financialYear: getFinancialYearForDate(timestamp).id,
    needsReview,
    reviewReason: needsReview
      ? quote !== 'INR'
        ? `Non-INR quote market ${trade.symbol} — review cost basis currency`
        : 'Unrecognized trade side'
      : null,
    raw: trade,
  };
}
