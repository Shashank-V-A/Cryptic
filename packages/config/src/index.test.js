import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadApiConfig } from './index.js';

describe('loadApiConfig', () => {
  it('defaults demoMode on in development', () => {
    const cfg = loadApiConfig({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://vda:x@localhost:5433/vda_ledger',
      SESSION_SECRET: 'dev-only-session-secret-change-me-32c',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    });
    assert.equal(cfg.demoMode, true);
    assert.equal(cfg.cookieSecure, false);
  });

  it('rejects production with default secrets', () => {
    assert.throws(
      () =>
        loadApiConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://vda:x@localhost:5433/vda_ledger',
          SESSION_SECRET: 'dev-only-session-secret-change-me-32c',
          ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        }),
      /SESSION_SECRET/,
    );
  });

  it('accepts hardened production config with demo off by default', () => {
    const cfg = loadApiConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://vda:x@db/vda_ledger',
      SESSION_SECRET: 'prod-session-secret-must-be-long-enough-32',
      ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      COOKIE_SECURE: 'true',
    });
    assert.equal(cfg.demoMode, false);
    assert.equal(cfg.cookieSecure, true);
  });
});
