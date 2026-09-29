import { CoinDCXAdapter } from './CoinDCXAdapter.js';
import { CSVAdapter } from './CSVAdapter.js';
import { ExchangeError } from './ExchangeAdapter.js';

export function createExchangeAdapter(slug, options = {}) {
  const key = String(slug || '').toUpperCase();
  switch (key) {
    case 'COINDCX':
      return new CoinDCXAdapter(options);
    case 'CSV':
      return new CSVAdapter(options);
    default:
      throw new ExchangeError(`No adapter registered for exchange: ${slug}`, {
        code: 'UNKNOWN_EXCHANGE',
        status: 400,
      });
  }
}

export {
  ExchangeAdapter,
  ExchangeError,
  CredentialError,
  UnsupportedReadError,
} from './ExchangeAdapter.js';
export { CoinDCXAdapter } from './CoinDCXAdapter.js';
export { CSVAdapter } from './CSVAdapter.js';
export { normalizeCoinDcxTrade, parseCoinDcxMarket } from './coindcxNormalize.js';
