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

const DEV_SESSION_SECRET = 'dev-only-session-secret-change-me-32c';
const DEV_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export function loadApiConfig(env = process.env) {
  const previous = process.env;
  process.env = env;
  try {
    const nodeEnv = optional('NODE_ENV', 'development');
    const isProd = nodeEnv === 'production';

    if (isProd) {
      if (!env.SESSION_SECRET || env.SESSION_SECRET === DEV_SESSION_SECRET) {
        throw new Error('SESSION_SECRET must be set to a strong unique value in production');
      }
      if (!env.ENCRYPTION_KEY || env.ENCRYPTION_KEY === DEV_ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY must be set to a strong unique value in production');
      }
      if (!env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required in production');
      }
      if (optional('COOKIE_SECURE', 'true') !== 'true') {
        throw new Error('COOKIE_SECURE must be true in production');
      }
    }

    return {
      nodeEnv,
      port: Number(optional('API_PORT', '4000')),
      databaseUrl: required(
        'DATABASE_URL',
        'postgresql://vda:vda_dev_password@localhost:5433/vda_ledger?schema=public',
      ),
      redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),
      sessionSecret: required('SESSION_SECRET', DEV_SESSION_SECRET),
      cookieSecure: optional('COOKIE_SECURE', isProd ? 'true' : 'false') === 'true',
      encryptionKey: required('ENCRYPTION_KEY', DEV_ENCRYPTION_KEY),
      corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),
      webUrl: optional('WEB_URL', 'http://localhost:5173'),
      demoMode: optional('DEMO_MODE', isProd ? 'false' : 'true') === 'true',
      cookieSameSite: optional('COOKIE_SAMESITE', 'lax'),
      priceApiKey: optional('PRICE_API_KEY', ''),
      priceProvider: optional('PRICE_PROVIDER', 'coingecko'),
      coinDcxApiKey: optional('COINDCX_API_KEY', ''),
      coinDcxApiSecret: optional('COINDCX_API_SECRET', ''),
      csrfEnabled: optional('CSRF_ENABLED', isProd ? 'true' : 'false') === 'true',
      reportStorage: optional('REPORT_STORAGE', 'local'), // local | s3
      s3Bucket: optional('S3_BUCKET', ''),
      s3Region: optional('S3_REGION', 'ap-south-1'),
      s3Endpoint: optional('S3_ENDPOINT', ''),
      awsAccessKeyId: optional('AWS_ACCESS_KEY_ID', ''),
      awsSecretAccessKey: optional('AWS_SECRET_ACCESS_KEY', ''),
      logLevel: optional('LOG_LEVEL', isProd ? 'info' : 'debug'),
    };
  } finally {
    process.env = previous;
  }
}
