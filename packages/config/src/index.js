/**
 * Shared runtime configuration helpers.
 * Secrets must come from environment variables — never hard-code production secrets.
 */

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback = '') {
  return process.env[name] ?? fallback;
}

export function loadApiConfig(env = process.env) {
  const previous = process.env;
  process.env = env;
  try {
    return {
      nodeEnv: optional('NODE_ENV', 'development'),
      port: Number(optional('API_PORT', '4000')),
      databaseUrl: required('DATABASE_URL', 'postgresql://vda:vda_dev_password@localhost:5433/vda_ledger?schema=public'),
      redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),
      sessionSecret: required('SESSION_SECRET', 'dev-only-session-secret-change-me-32c'),
      cookieSecure: optional('COOKIE_SECURE', 'false') === 'true',
      encryptionKey: required(
        'ENCRYPTION_KEY',
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ),
      corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),
      webUrl: optional('WEB_URL', 'http://localhost:5173'),
      demoMode: optional('DEMO_MODE', 'true') === 'true',
      priceApiKey: optional('PRICE_API_KEY', ''),
      priceProvider: optional('PRICE_PROVIDER', 'coingecko'),
      coinDcxApiKey: optional('COINDCX_API_KEY', ''),
      coinDcxApiSecret: optional('COINDCX_API_SECRET', ''),
    };
  } finally {
    process.env = previous;
  }
}
